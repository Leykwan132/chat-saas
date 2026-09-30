import { v } from "convex/values";
import { internalMutation } from "../triggers";
import { AppointmentBookingSessionStatus } from "../appointmentBookingSessionStatus";
import { generateSlots } from "./availability";
import { resolveBookingService, resolveTeamForAgent } from "./access";
import {
  missingServiceFields,
  serviceTimeZone,
  serviceSnapshot,
} from "./fields";
import { getActiveSession, getOrCreateSession } from "./sessionStore";
import { validateAvailabilityDates } from "./dateValidation";
import { formatAvailabilitySlotsForTool } from "./availabilityPresentation";
import { checkBatchAvailability } from "./batchAvailability";
import { getActiveBatch } from "./batchStore";

export { startBookingSession } from "./sessionDetails";
export { confirmBookingSlot } from "./sessionConfirmation";

function availabilityInputTimestamp(value: number | undefined) {
  return value === undefined
    ? undefined
    : { epochMs: value, iso: new Date(value).toISOString() };
}

function logAvailabilityDiagnostic(event: string, data: unknown) {
  console.log(event, JSON.stringify(data));
}

export const checkAvailability = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    serviceId: v.optional(v.id("appointmentServices")),
    preferredStartAt: v.optional(v.number()),
    preferredStartAts: v.optional(v.array(v.number())),
    rangeStartAt: v.optional(v.number()),
    rangeEndAt: v.optional(v.number()),
    customerRequestAgentMessageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (conversation === null || conversation.assignedAgentId === undefined) {
      throw new Error("Conversation is not assigned to an agent");
    }
    const agent = await ctx.db.get(conversation.assignedAgentId);
    if (agent === null) {
      throw new Error("Agent not found");
    }

    const session = await getActiveSession(ctx, conversation._id);
    const batch = await getActiveBatch(ctx, conversation._id);

    const { services, service } = await resolveBookingService(
      ctx,
      conversation.assignedAgentId,
      args.serviceId ?? batch?.serviceId ?? session?.serviceId,
    );
    if (services.length === 0) {
      return { success: false, slots: [], message: "No active Services are configured." };
    }
    if (!service) {
      return {
        success: false,
        requiresServiceSelection: true,
        services: services.map((row) => ({
          serviceId: row._id,
          name: row.name,
          description: row.description,
          durationMinutes: row.durationMinutes,
        })),
        slots: [],
        message: "Select which service to check.",
      };
    }
    if (session?.serviceId !== undefined && session.serviceId !== service._id) {
      return { success: false, message: "The active booking session is for a different service. Cancel it or continue with the same service.", slots: [] };
    }
    if (batch?.serviceId !== undefined && batch.serviceId !== service._id) {
      return { success: false, allAvailable: false, message: "The active booking batch is for a different service.", requested: [], unavailable: [] };
    }
    if (args.preferredStartAts !== undefined) {
      return await checkBatchAvailability(ctx, {
        conversation,
        agent,
        service,
        preferredStartAts: args.preferredStartAts,
        customerRequestAgentMessageId: args.customerRequestAgentMessageId,
      });
    }
    if (batch !== undefined) {
      return { success: false, message: "Finish or cancel the active booking batch before checking one slot.", slots: [] };
    }

    const collectedFields = session?.collectedFields ?? {};
    const missing = missingServiceFields(service, collectedFields);
    const now = Date.now();
    const dateValidation = validateAvailabilityDates({
      now,
      timeZone: serviceTimeZone(service),
      preferredStartAt: args.preferredStartAt,
      rangeStartAt: args.rangeStartAt,
      rangeEndAt: args.rangeEndAt,
    });
    if (dateValidation !== null) {
      logAvailabilityDiagnostic("booking_availability_invalid_date", {
        conversationId: conversation._id,
        serviceId: service._id,
        todayDate: dateValidation.todayDate,
        input: {
          preferredStart: availabilityInputTimestamp(args.preferredStartAt),
          rangeStart: availabilityInputTimestamp(args.rangeStartAt),
          rangeEnd: availabilityInputTimestamp(args.rangeEndAt),
        },
      });
      return {
        success: false,
        slots: [],
        errorCode: dateValidation.code,
        todayDate: dateValidation.todayDate,
        message: `Availability dates must be ${dateValidation.todayDate} or later.`,
      };
    }

    const team = await resolveTeamForAgent(ctx, agent);
    const rangeStartAt = Math.max(args.rangeStartAt ?? now + 60 * 60 * 1000, now);
    const rangeEndAt = args.preferredStartAt
      ? args.preferredStartAt + service.durationMinutes * 60 * 1000
      : args.rangeEndAt ?? rangeStartAt + 14 * 24 * 60 * 60 * 1000;
    const startAt = args.preferredStartAt ?? rangeStartAt;
    const limit = args.preferredStartAt ? 1 : undefined;
    const isEditing = session?.calendarEventId !== undefined;
    logAvailabilityDiagnostic("booking_availability_request", {
      conversationId: conversation._id,
      sessionId: session?._id,
      service: {
        serviceId: service._id,
        name: service.name,
        durationMinutes: service.durationMinutes,
        bufferMinutes: service.bufferMinutes ?? 0,
        timeZone: service.timeZone,
        locationMode: service.locationMode,
        assignmentStrategy: service.assignmentStrategy,
        specificWorkosUserId: service.specificWorkosUserId,
        assignedWorkosUserIds: service.assignedWorkosUserIds,
      },
      collectedDate: collectedFields.date,
      collectedTime: collectedFields.time,
      input: {
        preferredStart: availabilityInputTimestamp(args.preferredStartAt),
        rangeStart: availabilityInputTimestamp(args.rangeStartAt),
        rangeEnd: availabilityInputTimestamp(args.rangeEndAt),
      },
      resolvedWindow: {
        now: availabilityInputTimestamp(now),
        start: availabilityInputTimestamp(startAt),
        end: availabilityInputTimestamp(rangeEndAt),
        limit: limit ?? "unlimited",
      },
    });
    const slots = await generateSlots(ctx, {
      service,
      conversation,
      teamId: team._id,
      rangeStartAt: startAt,
      rangeEndAt,
      limit,
      excludeEventId: session?.calendarEventId,
    });
    logAvailabilityDiagnostic("booking_availability_result", {
      conversationId: conversation._id,
      sessionId: session?._id,
      serviceId: service._id,
      slotCount: slots.length,
      firstSlot: slots[0]
        ? availabilityInputTimestamp(slots[0].startAt)
        : null,
      lastSlot: slots.at(-1)
        ? availabilityInputTimestamp(slots.at(-1)?.endAt ?? 0)
        : null,
    });
    const customerRequestMessage = args.preferredStartAt !== undefined &&
        slots.some((slot) => slot.startAt === args.preferredStartAt) &&
        args.customerRequestAgentMessageId !== undefined
      ? await ctx.db
          .query("messages")
          .withIndex("by_agentMessageId", (q) =>
            q.eq("agentMessageId", args.customerRequestAgentMessageId)
          )
          .order("desc")
          .first()
      : null;
    const customerConfirmationMessageId =
      customerRequestMessage?.conversationId === conversation._id &&
      customerRequestMessage.direction === "incoming"
        ? customerRequestMessage._id
        : undefined;
    const bookingSession = session ?? (
      customerConfirmationMessageId !== undefined
        ? await getOrCreateSession(ctx, conversation._id, conversation.assignedAgentId)
        : undefined
    );
    const retainedConfirmationMessageId =
      session?.customerConfirmationMessageId !== undefined &&
      session.proposedSlots?.some((previousSlot) =>
        slots.some((slot) => slot.startAt === previousSlot.startAt)
      )
        ? session.customerConfirmationMessageId
        : undefined;
    const effectiveConfirmationMessageId =
      customerConfirmationMessageId ?? retainedConfirmationMessageId;
    const nextStatus = isEditing
      ? missing.length === 0
        ? AppointmentBookingSessionStatus.Confirming
        : AppointmentBookingSessionStatus.Editing
      : missing.length === 0
        ? AppointmentBookingSessionStatus.Confirming
        : AppointmentBookingSessionStatus.Collecting;

    if (bookingSession !== undefined) {
      await ctx.db.patch(bookingSession._id, {
        serviceId: service._id,
        collectedFields,
        proposedSlots: slots,
        selectedSlot: undefined,
        customerConfirmationMessageId: effectiveConfirmationMessageId,
        status: nextStatus,
        updatedAt: now,
      });
    }

    const formattedSlots = formatAvailabilitySlotsForTool(slots, serviceTimeZone(service));
    return {
      success: true,
      previewOnly: bookingSession === undefined,
      sessionStarted: session === undefined && bookingSession !== undefined,
      isEditing,
      bookingId: bookingSession?.calendarEventId,
      status: bookingSession === undefined ? undefined : nextStatus,
      service: serviceSnapshot(service),
      missingFields: bookingSession === undefined ? undefined : missing,
      readyForBooking:
        bookingSession !== undefined &&
        missing.length === 0 &&
        effectiveConfirmationMessageId !== undefined,
      slots: formattedSlots,
      message: isEditing
        ? "A booking details edit is open and cannot change the time. To move an appointment, use updateBookingsDateTime."
        : undefined,
    };
  },
});
