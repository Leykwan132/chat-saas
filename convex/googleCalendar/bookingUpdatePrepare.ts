import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { AppointmentBookingSessionStatus } from "../appointmentBookingSessionStatus";
import { logConversationEvent } from "../conversationLogs";
import { generateSlots } from "../appointmentBooking/availability";
import { loadService, resolveTeamForAgent } from "../appointmentBooking/access";
import { replaceCalendarParticipants, resolveCustomerForConversation } from "../appointmentBooking/calendarHelpers";
import {
  bookingDisplayName,
  buildCalendarEventDescription,
  missingServiceFields,
  serviceTimeZone,
} from "../appointmentBooking/fields";
import { getActiveSession } from "../appointmentBooking/sessionStore";
import {
  cancelWorkflowRemindersForAppointment,
  scheduleWorkflowRemindersForAppointment,
} from "../workflowReminderRuntime";
import { notifyAppointmentEvent } from "../telegramNotifications/events";
import {
  bookingFailureFromGoogle,
  googleCalendarBookingGate,
  loadGoogleCalendarConnectionForUser,
} from "./bookingGate";
import { googleCalendarBookingOperationKey } from "./bookingPayload";
import { bookingToolResultValidator, prepareBookResultValidator } from "./bookingTypes";

const updateArgs = {
  conversationId: v.id("conversations"),
  serviceId: v.id("appointmentServices"),
  startAt: v.number(),
  refreshed: v.optional(v.boolean()),
};

export const prepareUpdate = internalMutation({
  args: updateArgs,
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
    if (session === undefined || session.calendarEventId === undefined) {
      return {
        kind: "failed" as const,
        result: { success: false, message: "No booking edit in progress. Call beginBookingEdit first." },
      };
    }
    if (session.serviceId !== undefined && session.serviceId !== service._id) {
      return {
        kind: "failed" as const,
        result: { success: false, message: "The active booking edit is for a different service." },
      };
    }
    const event = await ctx.db.get(session.calendarEventId);
    if (event === null || event.status === "cancelled") {
      return {
        kind: "failed" as const,
        result: { success: false, message: "The booking to update could not be found." },
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
      excludeEventId: session.calendarEventId,
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
    const ownerId = event.externalOwnerUserId ?? assignedUser._id;
    const connection = await loadGoogleCalendarConnectionForUser(ctx, ownerId);
    const gate = googleCalendarBookingGate(connection);
    if (gate.kind === "error") {
      return { kind: "failed" as const, result: bookingFailureFromGoogle(gate.result) };
    }
    if (gate.kind === "google" && event.externalOrigin === "kilobot") {
      if (args.refreshed !== true) {
        return { kind: "needs_refresh" as const, connectionId: gate.connectionId };
      }
      const attendeeName = bookingDisplayName(collectedFields);
      const bookingTimeZone = serviceTimeZone(service, team);
      const customer = await resolveCustomerForConversation(ctx, conversation, collectedFields);
      return {
        kind: "google" as const,
        connectionId: gate.connectionId,
        calendarEventId: event._id,
        operationKey: googleCalendarBookingOperationKey(session._id, "update"),
        event: {
          summary: `${service.name} - ${attendeeName}`,
          description: buildCalendarEventDescription({
            service, customer, conversation, collectedFields,
          }),
          start: {
            dateTime: new Date(selectedSlot.startAt).toISOString(),
            timeZone: bookingTimeZone,
          },
          end: {
            dateTime: new Date(selectedSlot.endAt).toISOString(),
            timeZone: bookingTimeZone,
          },
        },
        now: Date.now(),
      };
    }
    const customer = await resolveCustomerForConversation(ctx, conversation, collectedFields);
    const now = Date.now();
    const attendeeName = bookingDisplayName(collectedFields);
    const bookingTimeZone = serviceTimeZone(service, team);
    await ctx.db.patch(event._id, {
      title: `${service.name} - ${attendeeName}`,
      description: buildCalendarEventDescription({
        service, customer, conversation, collectedFields,
      }),
      startAt: selectedSlot.startAt,
      endAt: selectedSlot.endAt,
      timeZone: bookingTimeZone,
      customFieldResponses: collectedFields,
      updatedAt: now,
    });
    await replaceCalendarParticipants(ctx, {
      eventId: event._id,
      teamId: team._id,
      customer,
      assignedUser,
      bookingDisplayName: attendeeName,
      eventStartAt: selectedSlot.startAt,
      eventEndAt: selectedSlot.endAt,
      now,
    });
    await ctx.db.patch(session._id, {
      serviceId: service._id,
      status: AppointmentBookingSessionStatus.Booked,
      collectedFields,
      selectedSlot,
      calendarEventId: event._id,
      updatedAt: now,
    });
    await ctx.db.patch(conversation._id, { status: "booked", updatedAt: now });
    await logConversationEvent(ctx, {
      conversationId: conversation._id,
      action: "event_updated",
      actor: { type: "ai", name: agent.name, agentId: agent._id },
      metadata: {
        eventId: event._id,
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
    await cancelWorkflowRemindersForAppointment(ctx, event._id, "Appointment rescheduled");
    await scheduleWorkflowRemindersForAppointment(ctx, event._id);
    await notifyAppointmentEvent(ctx, agent._id, event._id, agent.name, "updated");
    return {
      kind: "completed" as const,
      result: {
        success: true,
        bookingId: event._id,
        serviceName: service.name,
        startAt: selectedSlot.startAt,
        endAt: selectedSlot.endAt,
        assignedTo: selectedSlot.assignedDisplayName ?? assignedUser.email,
        message: "Booking updated. Call sendBookingUpdateConfirmation next and send the returned confirmation message to the customer.",
      },
    };
  },
});

export const finalizeUpdate = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    serviceId: v.id("appointmentServices"),
    startAt: v.number(),
  },
  returns: bookingToolResultValidator,
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (conversation === null || conversation.assignedAgentId === undefined) {
      throw new Error("Conversation is not assigned to an agent");
    }
    const agent = await ctx.db.get(conversation.assignedAgentId);
    if (agent === null) throw new Error("Agent not found");
    const service = await loadService(ctx, args.serviceId);
    const session = await getActiveSession(ctx, conversation._id);
    if (session === undefined || session.calendarEventId === undefined) {
      return { success: false, message: "No booking edit in progress. Call beginBookingEdit first." };
    }
    const event = await ctx.db.get(session.calendarEventId);
    if (event === null) return { success: false, message: "The booking to update could not be found." };
    const collectedFields = session.collectedFields;
    const team = await resolveTeamForAgent(ctx, agent);
    const assigned = (await ctx.db
      .query("calendarEventParticipants")
      .withIndex("by_eventId", (q) => q.eq("eventId", event._id))
      .take(20)).find((row) => row.role === "assigned");
    if (assigned?.userId === undefined) throw new Error("Assigned teammate not found");
    const assignedUser = await ctx.db.get(assigned.userId);
    if (assignedUser === null) throw new Error("Assigned teammate not found");
    const customer = await resolveCustomerForConversation(ctx, conversation, collectedFields);
    const now = Date.now();
    const attendeeName = bookingDisplayName(collectedFields);
    const selectedSlot = {
      startAt: event.startAt,
      endAt: event.endAt,
      assignedUserId: assignedUser._id,
      assignedWorkosUserId: assignedUser.workosUserId,
      assignedDisplayName: assigned.displayName ?? assignedUser.email,
    };
    await replaceCalendarParticipants(ctx, {
      eventId: event._id,
      teamId: team._id,
      customer,
      assignedUser,
      bookingDisplayName: attendeeName,
      eventStartAt: event.startAt,
      eventEndAt: event.endAt,
      now,
    });
    await ctx.db.patch(session._id, {
      serviceId: service._id,
      status: AppointmentBookingSessionStatus.Booked,
      collectedFields,
      selectedSlot,
      calendarEventId: event._id,
      updatedAt: now,
    });
    await ctx.db.patch(conversation._id, { status: "booked", updatedAt: now });
    await logConversationEvent(ctx, {
      conversationId: conversation._id,
      action: "event_updated",
      actor: { type: "ai", name: agent.name, agentId: agent._id },
      metadata: {
        eventId: event._id,
        eventTitle: event.title,
        startAt: event.startAt,
      },
    });
    await cancelWorkflowRemindersForAppointment(ctx, event._id, "Appointment rescheduled");
    await scheduleWorkflowRemindersForAppointment(ctx, event._id);
    await notifyAppointmentEvent(ctx, agent._id, event._id, agent.name, "updated");
    return {
      success: true,
      bookingId: event._id,
      serviceName: service.name,
      startAt: event.startAt,
      endAt: event.endAt,
      assignedTo: selectedSlot.assignedDisplayName,
      message: "Booking updated. Call sendBookingUpdateConfirmation next and send the returned confirmation message to the customer.",
    };
  },
});
