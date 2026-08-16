import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { handleBookingCreated } from "../appointmentBooking/bookingEvents";
import { logConversationEvent } from "../conversationLogs";
import { removeParticipantAvailabilityIntervals } from "../calendarAvailabilityIntervals";

export const rollbackStaffBook = internalMutation({
  args: {
    calendarEventId: v.id("calendarEvents"),
    sessionId: v.id("appointmentBookingSessions"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.calendarEventId);
    if (event !== null && event.externalSyncState === "pending") {
      const participants = await ctx.db
        .query("calendarEventParticipants")
        .withIndex("by_eventId", (q) => q.eq("eventId", args.calendarEventId))
        .take(100);
      for (const participant of participants) {
        await removeParticipantAvailabilityIntervals(ctx, participant._id);
        await ctx.db.delete(participant._id);
      }
      await ctx.db.delete(args.calendarEventId);
      const session = await ctx.db.get(args.sessionId);
      if (session !== null) await ctx.db.delete(args.sessionId);
    }
    return null;
  },
});

export const finalizeStaffBook = internalMutation({
  args: {
    calendarEventId: v.id("calendarEvents"),
    sessionId: v.id("appointmentBookingSessions"),
    recordInboxBooking: v.boolean(),
  },
  returns: v.object({
    eventId: v.id("calendarEvents"),
    sessionId: v.id("appointmentBookingSessions"),
  }),
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.calendarEventId);
    if (event === null) throw new Error("Booking event was not created");
    if (args.recordInboxBooking && event.conversationId !== undefined) {
      const conversation = await ctx.db.get(event.conversationId);
      if (conversation === null) throw new Error("Conversation not found");
      await ctx.db.patch(conversation._id, { status: "booked", updatedAt: Date.now() });
      await logConversationEvent(ctx, {
        conversationId: conversation._id,
        action: "event_booked",
        metadata: {
          eventId: event._id,
          eventTitle: event.title,
          startAt: event.startAt,
        },
      });
    }
    await handleBookingCreated(ctx, event._id);
    return { eventId: args.calendarEventId, sessionId: args.sessionId };
  },
});
