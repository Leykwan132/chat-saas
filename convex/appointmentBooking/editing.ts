import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { AppointmentBookingSessionStatus } from "../appointmentBookingSessionStatus";
import { serviceTimeZone } from "./fields";
import {
  formatBookingDetailsResponse,
  getActiveSession,
  getExistingBookingSession,
} from "./sessionStore";

export const beginBookingEdit = internalMutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const active = await getActiveSession(ctx, args.conversationId);
    if (active !== undefined) {
      if (active.calendarEventId !== undefined) {
        return {
          success: true,
          sessionId: active._id,
          status: active.status,
          bookingId: active.calendarEventId,
          collectedFields: active.collectedFields,
          message: "Booking edit is already in progress.",
        };
      }
      return {
        success: false,
        message: "A new booking is already in progress. Cancel it first or finish it before editing an existing booking.",
      };
    }

    const session = await getExistingBookingSession(ctx, args.conversationId);
    if (session === undefined || session.calendarEventId === undefined || session.serviceId === undefined) {
      return { success: false, message: "No booking found to edit." };
    }

    const [event, service] = await Promise.all([
      ctx.db.get(session.calendarEventId),
      ctx.db.get(session.serviceId),
    ]);
    if (event === null || service === null || event.status === "cancelled") {
      return { success: false, message: "No active booking found to edit." };
    }

    const now = Date.now();
    await ctx.db.patch(session._id, {
      status: AppointmentBookingSessionStatus.Editing,
      updatedAt: now,
    });

    const team = await ctx.db.get(event.teamId);
    const participants = await ctx.db
      .query("calendarEventParticipants")
      .withIndex("by_eventId", (q) => q.eq("eventId", event._id))
      .take(20);
    const assigned = participants.find((row) => row.role === "assigned");

    return {
      success: true,
      ...formatBookingDetailsResponse({
        session: { ...session, status: AppointmentBookingSessionStatus.Editing },
        service,
        event,
        timeZone: serviceTimeZone(service, team ?? undefined),
        assignedTo: assigned?.displayName ?? assigned?.email,
      }),
      message: "Booking edit started. Update details with startBookingSession, then checkAvailability if the time is changing, and call updateBookingAppointment after the customer confirms.",
    };
  },
});
