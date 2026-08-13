import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../_generated/server";
import {
  AppointmentBookingSessionStatus,
  isActiveAppointmentBookingSessionStatus,
} from "../appointmentBookingSessionStatus";
import { logConversationEvent } from "../conversationLogs";
import { getActiveSession, getExistingBookingSession } from "../appointmentBooking/sessionStore";
import { cancelWorkflowRemindersForAppointment } from "../workflowReminderRuntime";
import { notifyAppointmentEvent } from "../telegramNotifications/events";
import { syncCalendarEventAvailabilityIntervals } from "../calendarAvailabilityIntervals";
import {
  bookingFailureFromGoogle,
  googleCalendarBookingGate,
  loadGoogleCalendarConnectionForUser,
} from "./bookingGate";
import { googleCalendarBookingOperationKey } from "./bookingPayload";
import { bookingToolResultValidator, prepareBookResultValidator } from "./bookingTypes";

const cancelArgs = {
  conversationId: v.id("conversations"),
  refreshed: v.optional(v.boolean()),
};

async function cancelLocalBooking(
  ctx: MutationCtx,
  args: {
    conversationId: Id<"conversations">;
    eventId: Id<"calendarEvents">;
    sessionId: Id<"appointmentBookingSessions">;
    alreadyCancelled: boolean;
  },
) {
  const conversation = await ctx.db.get(args.conversationId);
  const agent = conversation?.assignedAgentId
    ? await ctx.db.get(conversation.assignedAgentId)
    : null;
  const now = Date.now();
  const event = await ctx.db.get(args.eventId);
  if (event !== null && !args.alreadyCancelled) {
    await ctx.db.patch(event._id, { status: "cancelled", updatedAt: now });
    await syncCalendarEventAvailabilityIntervals(ctx, event._id, now);
  }
  await cancelWorkflowRemindersForAppointment(ctx, args.eventId, "Appointment cancelled");
  await logConversationEvent(ctx, {
    conversationId: args.conversationId,
    action: "event_cancelled",
    actor: { type: "ai", name: agent?.name, agentId: agent?._id },
    metadata: { eventId: args.eventId },
  });
  await ctx.db.patch(args.sessionId, {
    status: AppointmentBookingSessionStatus.Cancelled,
    updatedAt: now,
  });
  if (conversation?.status === "booked") {
    await ctx.db.patch(args.conversationId, { status: "open", updatedAt: now });
  }
  if (agent) await notifyAppointmentEvent(ctx, agent._id, args.eventId, agent.name, "cancelled");
  return { success: true as const, message: "Booking cancelled." };
}

export const prepareCancel = internalMutation({
  args: cancelArgs,
  returns: prepareBookResultValidator,
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("appointmentBookingSessions")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", args.conversationId))
      .take(100);
    const active = sessions.find((session) => isActiveAppointmentBookingSessionStatus(session.status));
    if (
      active !== undefined &&
      active.calendarEventId !== undefined &&
      (active.status === AppointmentBookingSessionStatus.Editing ||
        active.status === AppointmentBookingSessionStatus.Confirming)
    ) {
      await ctx.db.patch(active._id, {
        status: AppointmentBookingSessionStatus.Booked,
        updatedAt: Date.now(),
      });
      return {
        kind: "completed" as const,
        result: {
          success: true,
          message: "Booking edit cancelled. The original booking is unchanged.",
        },
      };
    }
    const session = active ?? await getExistingBookingSession(ctx, args.conversationId);
    if (session === undefined || session.calendarEventId === undefined) {
      return {
        kind: "failed" as const,
        result: { success: false, message: "No active booking to cancel." },
      };
    }
    const event = await ctx.db.get(session.calendarEventId);
    if (event === null) {
      return {
        kind: "failed" as const,
        result: { success: false, message: "No active booking to cancel." },
      };
    }
    const ownerId = event.externalOwnerUserId ?? event.createdBy;
    const connection = await loadGoogleCalendarConnectionForUser(ctx, ownerId);
    const gate = googleCalendarBookingGate(connection);
    if (gate.kind === "error") {
      return { kind: "failed" as const, result: bookingFailureFromGoogle(gate.result) };
    }
    if (gate.kind === "google" && event.externalOrigin === "kilobot" && event.status !== "cancelled") {
      if (args.refreshed !== true) {
        return { kind: "needs_refresh" as const, connectionId: gate.connectionId };
      }
      return {
        kind: "google" as const,
        connectionId: gate.connectionId,
        calendarEventId: event._id,
        operationKey: googleCalendarBookingOperationKey(session._id, "delete"),
        event: {
          summary: event.title,
          start: { dateTime: new Date(event.startAt).toISOString(), timeZone: event.timeZone },
          end: { dateTime: new Date(event.endAt).toISOString(), timeZone: event.timeZone },
        },
        now: Date.now(),
      };
    }
    if (event.status === "cancelled" && session.status === AppointmentBookingSessionStatus.Cancelled) {
      return {
        kind: "failed" as const,
        result: { success: false, message: "No active booking to cancel." },
      };
    }
    const result = await cancelLocalBooking(ctx, {
      conversationId: args.conversationId,
      eventId: event._id,
      sessionId: session._id,
      alreadyCancelled: event.status === "cancelled",
    });
    return { kind: "completed" as const, result };
  },
});

export const finalizeCancel = internalMutation({
  args: { conversationId: v.id("conversations"), calendarEventId: v.id("calendarEvents") },
  returns: bookingToolResultValidator,
  handler: async (ctx, args) => {
    const session = await getActiveSession(ctx, args.conversationId)
      ?? await getExistingBookingSession(ctx, args.conversationId);
    if (session === undefined) {
      return { success: false, message: "No active booking to cancel." };
    }
    return await cancelLocalBooking(ctx, {
      conversationId: args.conversationId,
      eventId: args.calendarEventId,
      sessionId: session._id,
      alreadyCancelled: true,
    });
  },
});
