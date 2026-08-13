import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { AppointmentBookingSessionStatus } from "../appointmentBookingSessionStatus";
import { logConversationEvent } from "../conversationLogs";
import { generateSlots } from "../appointmentBooking/availability";
import { loadService, resolveTeamForAgent } from "../appointmentBooking/access";
import { insertCalendarParticipants, resolveCustomerForConversation } from "../appointmentBooking/calendarHelpers";
import {
  bookingDisplayName,
  buildCalendarEventDescription,
  missingServiceFields,
  serviceTimeZone,
} from "../appointmentBooking/fields";
import { getActiveSession } from "../appointmentBooking/sessionStore";
import { handleBookingCreated } from "../appointmentBooking/bookingEvents";
import {
  bookingFailureFromGoogle,
  googleCalendarBookingGate,
  loadGoogleCalendarConnectionForUser,
} from "./bookingGate";
import { googleCalendarBookingOperationKey, googleCalendarWriteInputFromEvent } from "./bookingPayload";
import { prepareBookResultValidator } from "./bookingTypes";

const bookArgs = {
  conversationId: v.id("conversations"),
  serviceId: v.id("appointmentServices"),
  startAt: v.number(),
  refreshed: v.optional(v.boolean()),
};

export const prepareBook = internalMutation({
  args: bookArgs,
  returns: prepareBookResultValidator,
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (conversation === null || conversation.assignedAgentId === undefined) {
      throw new Error("Conversation is not assigned to an agent");
    }
    const agent = await ctx.db.get(conversation.assignedAgentId);
    if (agent === null) throw new Error("Agent not found");
    const service = await loadService(ctx, args.serviceId);
    if (service.agentId !== conversation.assignedAgentId || !service.isActive) {
      throw new Error("Selected service is not available");
    }
    const session = await getActiveSession(ctx, conversation._id);
    if (session === undefined) {
      return {
        kind: "failed" as const,
        result: { success: false, message: "No active booking session. Call startBookingSession first." },
      };
    }
    if (
      session.calendarEventId !== undefined &&
      session.status !== AppointmentBookingSessionStatus.Collecting &&
      session.status !== AppointmentBookingSessionStatus.Confirming
    ) {
      return {
        kind: "failed" as const,
        result: {
          success: false,
          message: "This session is editing an existing booking. Call updateBookingAppointment instead of bookAppointment.",
        },
      };
    }
    if (session.serviceId !== undefined && session.serviceId !== service._id) {
      return {
        kind: "failed" as const,
        result: { success: false, message: "The active booking session is for a different service." },
      };
    }
    const collectedFields = session.collectedFields;
    const missing = missingServiceFields(service, collectedFields);
    if (missing.length > 0) {
      return {
        kind: "failed" as const,
        result: {
          success: false,
          missingFields: missing,
          message: `Missing required booking details: ${missing.join(", ")}. Call startBookingSession with the missing details.`,
        },
      };
    }
    const team = await resolveTeamForAgent(ctx, agent);
    const slotArgs = {
      service,
      conversation,
      teamId: team._id,
      rangeStartAt: args.startAt,
      rangeEndAt: args.startAt + service.durationMinutes * 60 * 1000,
      limit: 1,
    };
    let selectedSlot = (await generateSlots(ctx, slotArgs)).find((slot) => slot.startAt === args.startAt);
    if (selectedSlot === undefined) {
      const unhealthySlot = (await generateSlots(ctx, { ...slotArgs, ignoreGoogleHealth: true }))
        .find((slot) => slot.startAt === args.startAt);
      if (unhealthySlot !== undefined) {
        const connection = await loadGoogleCalendarConnectionForUser(ctx, unhealthySlot.assignedUserId);
        const gate = googleCalendarBookingGate(connection);
        if (gate.kind === "error") {
          return { kind: "failed" as const, result: bookingFailureFromGoogle(gate.result) };
        }
      }
      return {
        kind: "failed" as const,
        result: { success: false, message: "That slot is no longer available. Please check availability again." },
      };
    }
    const assignedUser = await ctx.db.get(selectedSlot.assignedUserId);
    if (assignedUser === null) throw new Error("Assigned teammate not found");
    const connection = await loadGoogleCalendarConnectionForUser(ctx, assignedUser._id);
    const gate = googleCalendarBookingGate(connection);
    if (gate.kind === "error") {
      return { kind: "failed" as const, result: bookingFailureFromGoogle(gate.result) };
    }
    if (gate.kind === "google" && args.refreshed !== true) {
      return { kind: "needs_refresh" as const, connectionId: gate.connectionId };
    }
    if (
      session.calendarEventId !== undefined &&
      gate.kind === "google"
    ) {
      const pending = await ctx.db.get(session.calendarEventId);
      if (pending !== null && pending.status !== "cancelled") {
        return {
          kind: "google" as const,
          connectionId: gate.connectionId,
          calendarEventId: pending._id,
          operationKey: pending.externalOperationKey ?? googleCalendarBookingOperationKey(session._id, "create"),
          event: googleCalendarWriteInputFromEvent(pending),
          now: Date.now(),
        };
      }
    }
    const now = Date.now();
    const attendeeName = bookingDisplayName(collectedFields);
    const bookingTimeZone = serviceTimeZone(service, team);
    const customer = await resolveCustomerForConversation(ctx, conversation, collectedFields);
    const eventId = await ctx.db.insert("calendarEvents", {
      teamId: team._id,
      title: `${service.name} - ${attendeeName}`,
      description: buildCalendarEventDescription({
        service,
        customer,
        conversation,
        collectedFields,
      }),
      startAt: selectedSlot.startAt,
      endAt: selectedSlot.endAt,
      timeZone: bookingTimeZone,
      status: "confirmed",
      createdBy: assignedUser._id,
      agentId: service.agentId,
      conversationId: conversation._id,
      appointmentServiceId: service._id,
      bookingSource: "ai",
      customFieldResponses: collectedFields,
      ...(gate.kind === "google" ? {
        externalProvider: "google" as const,
        externalCalendarId: "primary" as const,
        externalOwnerUserId: assignedUser._id,
        externalOrigin: "kilobot" as const,
        externalStatus: "confirmed" as const,
        externalTransparency: "opaque" as const,
        externalCanEdit: true,
        externalSyncState: "pending" as const,
        externalOperationKey: googleCalendarBookingOperationKey(session._id, "create"),
      } : {}),
      createdAt: now,
      updatedAt: now,
    });
    await insertCalendarParticipants(ctx, {
      eventId,
      teamId: team._id,
      customer,
      assignedUser,
      bookingDisplayName: attendeeName,
      eventStartAt: selectedSlot.startAt,
      eventEndAt: selectedSlot.endAt,
      now,
    });
    if (gate.kind === "google") {
      await ctx.db.patch(session._id, {
        serviceId: service._id,
        collectedFields,
        selectedSlot,
        calendarEventId: eventId,
        updatedAt: now,
      });
      const event = await ctx.db.get(eventId);
      if (event === null) throw new Error("Booking event was not created");
      return {
        kind: "google" as const,
        connectionId: gate.connectionId,
        calendarEventId: eventId,
        operationKey: googleCalendarBookingOperationKey(session._id, "create"),
        event: googleCalendarWriteInputFromEvent(event),
        now,
      };
    }
    await ctx.db.patch(session._id, {
      serviceId: service._id,
      status: AppointmentBookingSessionStatus.Booked,
      collectedFields,
      selectedSlot,
      calendarEventId: eventId,
      updatedAt: now,
    });
    await ctx.db.patch(conversation._id, { status: "booked", updatedAt: now });
    await logConversationEvent(ctx, {
      conversationId: conversation._id,
      action: "event_booked",
      actor: { type: "ai", name: agent.name, agentId: agent._id },
      metadata: {
        eventId,
        eventTitle: `${service.name} - ${attendeeName}`,
        startAt: selectedSlot.startAt,
      },
    });
    if (service.assignmentStrategy === "round_robin") {
      await ctx.db.patch(service._id, {
        lastAssignedWorkosUserId: selectedSlot.assignedWorkosUserId,
        lastAssignedAt: now,
        updatedAt: now,
      });
    }
    await handleBookingCreated(ctx, eventId);
    return {
      kind: "completed" as const,
      result: {
        success: true,
        bookingId: eventId,
        serviceName: service.name,
        startAt: selectedSlot.startAt,
        endAt: selectedSlot.endAt,
        assignedTo: selectedSlot.assignedDisplayName ?? assignedUser.email,
        message: "Booking created. Call sendBookingConfirmation next and send the returned confirmation message to the customer.",
      },
    };
  },
});
