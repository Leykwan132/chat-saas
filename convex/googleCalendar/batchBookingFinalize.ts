import { v } from "convex/values";
import { internalMutation } from "../triggers";
import { AppointmentBookingBatchStatus } from "../appointmentBookingBatchStatus";
import { AppointmentBookingSessionStatus } from "../appointmentBookingSessionStatus";
import { handleBookingCreated } from "../appointmentBooking/bookingEvents";
import { logConversationEvent } from "../conversationLogs";
import { removeParticipantAvailabilityIntervals } from "../calendarAvailabilityIntervals";

export const finalizeBatchBook = internalMutation({
  args: { batchId: v.id("appointmentBookingBatches") },
  handler: async (ctx, args) => {
    const batch = await ctx.db.get(args.batchId);
    if (batch === null || batch.status !== AppointmentBookingBatchStatus.Creating ||
        batch.calendarEventIds === undefined || batch.sessionIds === undefined ||
        batch.serviceId === undefined) {
      return { success: false, message: "Prepared booking batch could not be found." };
    }
    const [conversation, agent, service] = await Promise.all([
      ctx.db.get(batch.conversationId),
      ctx.db.get(batch.agentId),
      ctx.db.get(batch.serviceId),
    ]);
    if (conversation === null || agent === null || service === null) {
      return { success: false, message: "Booking details could not be found." };
    }
    const now = Date.now();
    const bookings = [];
    for (const [index, eventId] of batch.calendarEventIds.entries()) {
      const event = await ctx.db.get(eventId);
      const sessionId = batch.sessionIds[index];
      const session = sessionId === undefined ? null : await ctx.db.get(sessionId);
      if (event === null || session === null || sessionId === undefined) {
        throw new Error("Prepared batch child could not be found");
      }
      const assigned = (await ctx.db
        .query("calendarEventParticipants")
        .withIndex("by_eventId", (q) => q.eq("eventId", event._id))
        .take(20)).find((row) => row.role === "assigned");
      await ctx.db.patch(sessionId, {
        status: AppointmentBookingSessionStatus.Booked,
        updatedAt: now,
      });
      await logConversationEvent(ctx, {
        conversationId: conversation._id,
        action: "event_booked",
        actor: { type: "ai", name: agent.name, agentId: agent._id },
        metadata: { eventId, eventTitle: event.title, startAt: event.startAt },
      });
      await handleBookingCreated(ctx, eventId);
      bookings.push({
        bookingId: eventId,
        sessionId,
        startAt: event.startAt,
        endAt: event.endAt,
        assignedTo: assigned?.displayName ?? assigned?.email ?? "Assigned team member",
      });
    }
    await ctx.db.patch(batch._id, { status: AppointmentBookingBatchStatus.Booked, updatedAt: now });
    await ctx.db.patch(conversation._id, { status: "booked", updatedAt: now });
    if (service.assignmentStrategy === "round_robin") {
      const lastSession = await ctx.db.get(batch.sessionIds.at(-1)!);
      if (lastSession?.selectedSlot !== undefined) {
        await ctx.db.patch(service._id, {
          lastAssignedWorkosUserId: lastSession.selectedSlot.assignedWorkosUserId,
          lastAssignedAt: now,
          updatedAt: now,
        });
      }
    }
    return {
      success: true,
      batchId: batch._id,
      bookings,
      message: "Bookings created. Call sendBatchBookingConfirmation next and send the returned confirmation message to the customer.",
    };
  },
});

export const rollbackBatchBook = internalMutation({
  args: { batchId: v.id("appointmentBookingBatches") },
  handler: async (ctx, args) => {
    const batch = await ctx.db.get(args.batchId);
    if (batch === null) return null;
    for (const eventId of batch.calendarEventIds ?? []) {
      const participants = await ctx.db
        .query("calendarEventParticipants")
        .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
        .take(100);
      for (const participant of participants) {
        await removeParticipantAvailabilityIntervals(ctx, participant._id);
        await ctx.db.delete(participant._id);
      }
      if (await ctx.db.get(eventId) !== null) await ctx.db.delete(eventId);
    }
    for (const sessionId of batch.sessionIds ?? []) {
      if (await ctx.db.get(sessionId) !== null) await ctx.db.delete(sessionId);
    }
    await ctx.db.patch(batch._id, {
      status: AppointmentBookingBatchStatus.Confirming,
      calendarEventIds: undefined,
      sessionIds: undefined,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const markBatchCompensationFailed = internalMutation({
  args: {
    batchId: v.id("appointmentBookingBatches"),
    failedCalendarEventIds: v.array(v.id("calendarEvents")),
    failureMessage: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.batchId, {
      status: AppointmentBookingBatchStatus.Failed,
      failedCalendarEventIds: args.failedCalendarEventIds,
      failureMessage: args.failureMessage,
      updatedAt: Date.now(),
    });
    return null;
  },
});
