import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { internalMutation } from "../triggers";
import { AppointmentBookingSessionStatus } from "../appointmentBookingSessionStatus";
import { logConversationEvent } from "../conversationLogs";
import { replaceCalendarParticipants, resolveCustomerForConversation } from "../appointmentBooking/calendarHelpers";
import { bookingDisplayName, formatBookingDateTime } from "../appointmentBooking/fields";
import {
  cancelWorkflowRemindersForAppointment,
  scheduleWorkflowRemindersForAppointment,
} from "../workflowReminderRuntime";
import { notifyAppointmentEvent } from "../telegramNotifications/events";
import type { BatchBookingUpdateResult } from "./batchBookingUpdateTypes";

export async function finalizeUpdateBatch(
  ctx: MutationCtx,
  batchId: Id<"appointmentBookingUpdateBatches">,
): Promise<BatchBookingUpdateResult> {
  const batch = await ctx.db.get(batchId);
  if (batch === null || batch.status !== "prepared") {
    return { success: false, message: "Prepared booking update could not be found." };
  }
  const [conversation, agent] = await Promise.all([
    ctx.db.get(batch.conversationId),
    ctx.db.get(batch.agentId),
  ]);
  if (conversation === null || agent === null) {
    return { success: false, message: "Booking details could not be found." };
  }
  const loaded = [];
  for (const item of batch.items) {
    const [event, session, assignedUser] = await Promise.all([
      ctx.db.get(item.calendarEventId),
      ctx.db.get(item.sessionId),
      ctx.db.get(item.slot.assignedUserId),
    ]);
    const service = event?.appointmentServiceId === undefined
      ? null
      : await ctx.db.get(event.appointmentServiceId);
    if (event === null || session === null || assignedUser === null || service === null) {
      throw new Error("Prepared booking update target could not be found");
    }
    if (event.externalProvider === "google" &&
        (event.startAt !== item.slot.startAt || event.endAt !== item.slot.endAt)) {
      return { success: false, message: "Google Calendar event was not updated." };
    }
    loaded.push({ item, event, session, assignedUser, service });
  }
  const now = Date.now();
  const bookings = [];
  for (const { item, event, session, assignedUser, service } of loaded) {
    const { slot } = item;
    const customer = await resolveCustomerForConversation(ctx, conversation, session.collectedFields);
    await ctx.db.patch(event._id, { startAt: slot.startAt, endAt: slot.endAt, updatedAt: now });
    await replaceCalendarParticipants(ctx, {
      eventId: event._id,
      teamId: event.teamId,
      customer,
      assignedUser,
      bookingDisplayName: bookingDisplayName(session.collectedFields),
      eventStartAt: slot.startAt,
      eventEndAt: slot.endAt,
      now,
    });
    await ctx.db.patch(session._id, {
      status: AppointmentBookingSessionStatus.Booked,
      selectedSlot: slot,
      updatedAt: now,
    });
    await logConversationEvent(ctx, {
      conversationId: conversation._id,
      action: "event_updated",
      actor: { type: "ai", name: agent.name, agentId: agent._id },
      metadata: { eventId: event._id, eventTitle: event.title, startAt: slot.startAt },
    });
    if (service.assignmentStrategy === "round_robin") {
      await ctx.db.patch(service._id, {
        lastAssignedWorkosUserId: slot.assignedWorkosUserId,
        lastAssignedAt: now,
        updatedAt: now,
      });
    }
    await cancelWorkflowRemindersForAppointment(ctx, event._id, "Appointment rescheduled");
    await scheduleWorkflowRemindersForAppointment(ctx, event._id);
    await notifyAppointmentEvent(ctx, agent._id, event._id, agent.name, "updated");
    const display = formatBookingDateTime(slot.startAt, slot.endAt, event.timeZone);
    bookings.push({
      bookingId: event._id,
      serviceName: service.name,
      startAt: slot.startAt,
      endAt: slot.endAt,
      date: display.date,
      timeRange: display.timeRange,
      assignedTo: slot.assignedDisplayName ?? assignedUser.email,
    });
  }
  await ctx.db.patch(batch._id, { status: "updated", updatedAt: now });
  await ctx.db.patch(conversation._id, { status: "booked", updatedAt: now });
  return {
    success: true,
    batchId: batch._id,
    bookings,
    message: "Bookings updated. Send the customer one concise message listing every updated appointment with its date and timeRange.",
  };
}

export const finalizeBatchUpdate = internalMutation({
  args: { batchId: v.id("appointmentBookingUpdateBatches") },
  handler: async (ctx, args) => await finalizeUpdateBatch(ctx, args.batchId),
});

export const markBatchUpdateRestored = internalMutation({
  args: { batchId: v.id("appointmentBookingUpdateBatches") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.batchId, { status: "restored", updatedAt: Date.now() });
    return null;
  },
});

export const markBatchUpdateFailed = internalMutation({
  args: {
    batchId: v.id("appointmentBookingUpdateBatches"),
    failedCalendarEventIds: v.array(v.id("calendarEvents")),
    failureMessage: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.batchId, {
      status: "failed",
      failedCalendarEventIds: args.failedCalendarEventIds,
      failureMessage: args.failureMessage,
      updatedAt: Date.now(),
    });
    return null;
  },
});
