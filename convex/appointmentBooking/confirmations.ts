import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { buildBookingConfirmationMessage, serviceTimeZone } from "./fields";
import { getLatestBookedSession } from "./sessionStore";

async function buildConfirmation(ctx: Parameters<typeof getLatestBookedSession>[0], conversationId: Parameters<typeof getLatestBookedSession>[1], updated: boolean) {
  const session = await getLatestBookedSession(ctx, conversationId);
  if (session === undefined || session.calendarEventId === undefined || session.serviceId === undefined) {
    return {
      success: false,
      message: updated
        ? "No updated booking found. Call updateBookingAppointment first."
        : "No completed booking found. Call bookAppointment first.",
    };
  }

  const [event, service] = await Promise.all([
    ctx.db.get(session.calendarEventId),
    ctx.db.get(session.serviceId),
  ]);
  if (event === null || service === null) {
    return { success: false, message: "Booking details could not be found." };
  }

  const participants = await ctx.db
    .query("calendarEventParticipants")
    .withIndex("by_eventId", (q) => q.eq("eventId", event._id))
    .take(20);
  const assigned = participants.find((row) => row.role === "assigned");
  const team = await ctx.db.get(event.teamId);
  const confirmationMessage = buildBookingConfirmationMessage({
    service,
    collectedFields: session.collectedFields,
    startAt: event.startAt,
    endAt: event.endAt,
    timeZone: serviceTimeZone(service, team ?? undefined),
    assignedTo: assigned?.displayName ?? assigned?.email,
    bookingId: event._id,
    meetingLink: event.link,
    updated,
  });

  return {
    success: true,
    confirmationMessage,
    bookingId: event._id,
    serviceName: service.name,
    startAt: event.startAt,
    endAt: event.endAt,
  };
}

export const sendBookingConfirmation = internalMutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await buildConfirmation(ctx, args.conversationId, false);
  },
});

export const sendBookingUpdateConfirmation = internalMutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await buildConfirmation(ctx, args.conversationId, true);
  },
});
