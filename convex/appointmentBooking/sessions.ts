import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { AppointmentBookingSessionStatus } from "../appointmentBookingSessionStatus";
import { generateSlots } from "./availability";
import { resolveBookingService, resolveTeamForAgent } from "./access";
import {
  mergeCollectedFields,
  missingServiceFields,
  serviceSnapshot,
} from "./fields";
import { collectedFieldsValidator } from "./validators";
import { getActiveSession, getOrCreateSession } from "./sessionStore";

function availabilityInputTimestamp(value: number | undefined) {
  return value === undefined
    ? undefined
    : { epochMs: value, iso: new Date(value).toISOString() };
}

function logAvailabilityDiagnostic(event: string, data: unknown) {
  console.log(event, JSON.stringify(data));
}

export const startBookingSession = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    serviceId: v.optional(v.id("appointmentServices")),
    collectedFields: v.optional(collectedFieldsValidator),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (conversation === null || conversation.assignedAgentId === undefined) {
      throw new Error("Conversation is not assigned to an agent");
    }

    const { services, service } = await resolveBookingService(ctx, conversation.assignedAgentId, args.serviceId);
    if (services.length === 0) {
      return { success: false, message: "No active Services are configured." };
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
        message: "Ask the customer which service they want before starting the booking session.",
      };
    }

    const now = Date.now();
    const session = await getOrCreateSession(ctx, conversation._id, conversation.assignedAgentId);
    const collectedFields = mergeCollectedFields(session.collectedFields, args.collectedFields);
    const missing = missingServiceFields(service, collectedFields);
    const isEditing = session.calendarEventId !== undefined;
    const keepsConfirmedAvailability =
      session.serviceId === service._id &&
      session.customerConfirmationMessageId !== undefined &&
      (session.proposedSlots?.length ?? 0) > 0;
    const nextStatus = isEditing
      ? AppointmentBookingSessionStatus.Editing
      : keepsConfirmedAvailability && missing.length === 0
        ? AppointmentBookingSessionStatus.Confirming
        : AppointmentBookingSessionStatus.Collecting;

    await ctx.db.patch(session._id, {
      serviceId: service._id,
      collectedFields,
      status: nextStatus,
      proposedSlots: keepsConfirmedAvailability ? session.proposedSlots : undefined,
      selectedSlot: undefined,
      customerConfirmationMessageId: keepsConfirmedAvailability
        ? session.customerConfirmationMessageId
        : undefined,
      updatedAt: now,
    });

    return {
      success: true,
      sessionId: session._id,
      status: nextStatus,
      isEditing,
      bookingId: session.calendarEventId,
      service: serviceSnapshot(service),
      collectedFields,
      missingFields: missing,
      readyForAvailability: missing.length === 0,
      readyForBooking: keepsConfirmedAvailability && missing.length === 0,
      message:
        missing.length > 0
          ? `${isEditing ? "Booking edit in progress" : "Booking session started"}. Still collecting: ${missing.join(", ")}`
          : isEditing
            ? "Booking details updated. Check availability if the time changed, then call updateBookingAppointment after the customer confirms."
            : keepsConfirmedAvailability
              ? "All required details are collected. Create the booking now."
              : "Booking session started. All required details are collected - you can check availability next.",
    };
  },
});

export const checkAvailability = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    serviceId: v.optional(v.id("appointmentServices")),
    preferredStartAt: v.optional(v.number()),
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

    const { services, service } = await resolveBookingService(
      ctx,
      conversation.assignedAgentId,
      args.serviceId ?? session?.serviceId,
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

    const collectedFields = session?.collectedFields ?? {};
    const missing = missingServiceFields(service, collectedFields);

    const team = await resolveTeamForAgent(ctx, agent);
    const now = Date.now();
    const rangeStartAt = Math.max(args.rangeStartAt ?? now + 60 * 60 * 1000, now);
    const rangeEndAt = args.preferredStartAt
      ? args.preferredStartAt + service.durationMinutes * 60 * 1000
      : args.rangeEndAt ?? rangeStartAt + 14 * 24 * 60 * 60 * 1000;
    const startAt = args.preferredStartAt ?? rangeStartAt;
    const limit = args.preferredStartAt ? 1 : 5;
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
        limit,
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
      slots: slots.map((slot) => ({
        start: availabilityInputTimestamp(slot.startAt),
        end: availabilityInputTimestamp(slot.endAt),
        assignedUserId: slot.assignedUserId,
        assignedWorkosUserId: slot.assignedWorkosUserId,
        assignedDisplayName: slot.assignedDisplayName,
      })),
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
      slots,
      message: isEditing
        ? "Slots ready for the booking update. Call updateBookingAppointment after the customer confirms."
        : undefined,
    };
  },
});

export const confirmBookingSlot = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    serviceId: v.id("appointmentServices"),
    startAt: v.number(),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (conversation === null || conversation.assignedAgentId === undefined) {
      throw new Error("Conversation is not assigned to an agent");
    }
    const session = await getActiveSession(ctx, conversation._id);
    if (session === undefined) {
      return { success: false, message: "No active booking session. Call startBookingSession first." };
    }
    if (session.serviceId !== args.serviceId) {
      return { success: false, message: "The active booking session is for a different service." };
    }
    if (session.status !== AppointmentBookingSessionStatus.Confirming) {
      return { success: false, message: "Check availability before confirming a booking slot." };
    }
    const selectedSlot = session.proposedSlots?.find((slot) => slot.startAt === args.startAt);
    if (selectedSlot === undefined) {
      return { success: false, message: "Confirm a slot returned by checkAvailability." };
    }
    if (session.customerConfirmationMessageId !== undefined) {
      if (session.selectedSlot?.startAt !== args.startAt) {
        await ctx.db.patch(session._id, { selectedSlot });
      }
      return { success: true, selectedSlot };
    }
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversationId_and_createdAt", (q) => q.eq("conversationId", conversation._id))
      .order("desc")
      .take(50);
    const confirmationMessage = messages.find((message) => message.direction === "incoming");
    if (
      confirmationMessage === undefined ||
      confirmationMessage.createdAt <= session.updatedAt
    ) {
      return {
        success: false,
        message: "Wait for the customer to confirm a slot after availability was offered.",
      };
    }
    await ctx.db.patch(session._id, {
      selectedSlot,
      customerConfirmationMessageId: confirmationMessage._id,
    });
    return { success: true, selectedSlot };
  },
});
