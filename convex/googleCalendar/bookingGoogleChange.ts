import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { AppointmentBookingSessionStatus } from "../appointmentBookingSessionStatus";
import { logConversationEvent } from "../conversationLogs";
import {
  cancelWorkflowRemindersForAppointment,
  scheduleWorkflowRemindersForAppointment,
} from "../workflowReminderRuntime";
import { notifyAppointmentEvent } from "../telegramNotifications/events";
import { syncCalendarEventAvailabilityIntervals } from "../calendarAvailabilityIntervals";

async function loadBookingSession(
  ctx: MutationCtx,
  event: Doc<"calendarEvents">,
) {
  if (event.conversationId === undefined) return null;
  const sessions = await ctx.db
    .query("appointmentBookingSessions")
    .withIndex("by_conversationId", (q) => q.eq("conversationId", event.conversationId!))
    .take(100);
  return sessions.find((session) => session.calendarEventId === event._id) ?? null;
}

async function patchParticipantTimes(
  ctx: MutationCtx,
  eventId: Id<"calendarEvents">,
  startAt: number,
  endAt: number,
  now: number,
) {
  const participants = await ctx.db
    .query("calendarEventParticipants")
    .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
    .take(100);
  for (const participant of participants) {
    if (participant.eventStartAt === startAt && participant.eventEndAt === endAt) continue;
    await ctx.db.patch(participant._id, { eventStartAt: startAt, eventEndAt: endAt, updatedAt: now });
  }
}

export async function applyKilobotBookingGoogleMove(
  ctx: MutationCtx,
  previous: Doc<"calendarEvents">,
  startAt: number,
  endAt: number,
  now: number,
) {
  if (previous.externalOrigin !== "kilobot") return;
  const moved = previous.startAt !== startAt || previous.endAt !== endAt;
  await patchParticipantTimes(ctx, previous._id, startAt, endAt, now);
  const session = await loadBookingSession(ctx, previous);
  if (session !== null && moved && session.selectedSlot !== undefined) {
    await ctx.db.patch(session._id, {
      selectedSlot: {
        ...session.selectedSlot,
        startAt,
        endAt,
      },
      updatedAt: now,
    });
  }
  if (!moved) return;
  await cancelWorkflowRemindersForAppointment(ctx, previous._id, "External calendar change");
  await scheduleWorkflowRemindersForAppointment(ctx, previous._id);
  if (previous.conversationId !== undefined) {
    await logConversationEvent(ctx, {
      conversationId: previous.conversationId,
      action: "event_updated",
      actor: { type: "system", name: "Google Calendar" },
      metadata: {
        eventId: previous._id,
        eventTitle: previous.title,
        startAt,
        externalCalendarChange: true,
      },
    });
  }
  if (previous.agentId !== undefined) {
    const agent = await ctx.db.get(previous.agentId);
    if (agent) await notifyAppointmentEvent(ctx, agent._id, previous._id, agent.name, "updated");
  }
}

export async function applyKilobotBookingGoogleCancellation(
  ctx: MutationCtx,
  event: Doc<"calendarEvents">,
  now: number,
) {
  if (event.externalOrigin !== "kilobot") return;
  await syncCalendarEventAvailabilityIntervals(ctx, event._id, now);
  await cancelWorkflowRemindersForAppointment(ctx, event._id, "External calendar change");
  const session = await loadBookingSession(ctx, event);
  if (session !== null && session.status !== AppointmentBookingSessionStatus.Cancelled) {
    await ctx.db.patch(session._id, {
      status: AppointmentBookingSessionStatus.Cancelled,
      updatedAt: now,
    });
  }
  if (event.conversationId !== undefined) {
    const conversation = await ctx.db.get(event.conversationId);
    if (conversation?.status === "booked") {
      await ctx.db.patch(event.conversationId, { status: "open", updatedAt: now });
    }
    await logConversationEvent(ctx, {
      conversationId: event.conversationId,
      action: "event_cancelled",
      actor: { type: "system", name: "Google Calendar" },
      metadata: {
        eventId: event._id,
        eventTitle: event.title,
        externalCalendarChange: true,
      },
    });
  }
  if (event.agentId !== undefined) {
    const agent = await ctx.db.get(event.agentId);
    if (agent) await notifyAppointmentEvent(ctx, agent._id, event._id, agent.name, "cancelled");
  }
}
