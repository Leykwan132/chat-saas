import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { AppointmentBookingSessionStatus } from "../appointmentBookingSessionStatus";
import { logConversationEvent } from "../conversationLogs";
import { getActiveSession } from "../appointmentBooking/sessionStore";
import { handleBookingCreated } from "../appointmentBooking/bookingEvents";
import { removeParticipantAvailabilityIntervals } from "../calendarAvailabilityIntervals";
import { prepareBookResultValidator } from "./bookingTypes";

export const rollbackBook = internalMutation({
  args: { calendarEventId: v.id("calendarEvents"), conversationId: v.id("conversations") },
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
    }
    const session = await getActiveSession(ctx, args.conversationId);
    if (session !== undefined && session.calendarEventId === args.calendarEventId) {
      await ctx.db.patch(session._id, {
        calendarEventId: undefined,
        selectedSlot: undefined,
        updatedAt: Date.now(),
      });
    }
    return null;
  },
});

export const finalizeBook = internalMutation({
  args: { calendarEventId: v.id("calendarEvents"), conversationId: v.id("conversations") },
  returns: prepareBookResultValidator,
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.calendarEventId);
    const conversation = await ctx.db.get(args.conversationId);
    if (event === null || conversation === null || conversation.assignedAgentId === undefined) {
      return {
        kind: "failed" as const,
        result: { success: false, message: "Booking details could not be found." },
      };
    }
    const agent = await ctx.db.get(conversation.assignedAgentId);
    if (agent === null) throw new Error("Agent not found");
    const session = await getActiveSession(ctx, conversation._id);
    if (session === undefined) {
      return {
        kind: "failed" as const,
        result: { success: false, message: "No active booking session. Call startBookingSession first." },
      };
    }
    const service = event.appointmentServiceId === undefined
      ? null
      : await ctx.db.get(event.appointmentServiceId);
    const assigned = (await ctx.db
      .query("calendarEventParticipants")
      .withIndex("by_eventId", (q) => q.eq("eventId", event._id))
      .take(20)).find((row) => row.role === "assigned");
    const now = Date.now();
    await ctx.db.patch(session._id, {
      status: AppointmentBookingSessionStatus.Booked,
      calendarEventId: event._id,
      updatedAt: now,
    });
    await ctx.db.patch(conversation._id, { status: "booked", updatedAt: now });
    await logConversationEvent(ctx, {
      conversationId: conversation._id,
      action: "event_booked",
      actor: { type: "ai", name: agent.name, agentId: agent._id },
      metadata: {
        eventId: event._id,
        eventTitle: event.title,
        startAt: event.startAt,
      },
    });
    if (service?.assignmentStrategy === "round_robin" && session.selectedSlot !== undefined) {
      await ctx.db.patch(service._id, {
        lastAssignedWorkosUserId: session.selectedSlot.assignedWorkosUserId,
        lastAssignedAt: now,
        updatedAt: now,
      });
    }
    await handleBookingCreated(ctx, event._id);
    return {
      kind: "completed" as const,
      result: {
        success: true,
        bookingId: event._id,
        serviceName: service?.name,
        startAt: event.startAt,
        endAt: event.endAt,
        assignedTo: assigned?.displayName ?? assigned?.email,
        message: "Booking created. Call sendBookingConfirmation next and send the returned confirmation message to the customer.",
      },
    };
  },
});
