import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../_generated/server";
import { AppointmentBookingSessionStatus } from "../appointmentBookingSessionStatus";
import { serviceTimeZone } from "./fields";
import {
  formatBookingDetailsResponse,
  getActiveSession,
} from "./sessionStore";

function isEditableBookingStatus(status: string) {
  return status === AppointmentBookingSessionStatus.Booked ||
    status === AppointmentBookingSessionStatus.Completed;
}

async function editableSessionsForConversation(
  ctx: MutationCtx,
  conversationId: Id<"conversations">,
) {
  const sessions = await ctx.db
    .query("appointmentBookingSessions")
    .withIndex("by_conversationId", (q) => q.eq("conversationId", conversationId))
    .take(100);
  return sessions.filter(
    (session) =>
      session.calendarEventId !== undefined &&
      isEditableBookingStatus(session.status),
  );
}

async function sessionForCustomerBooking(
  ctx: MutationCtx,
  conversation: Doc<"conversations">,
  bookingId: Id<"calendarEvents">,
) {
  const session = await ctx.db
    .query("appointmentBookingSessions")
    .withIndex("by_calendarEventId", (q) => q.eq("calendarEventId", bookingId))
    .unique();
  const calendarEventId = session?.calendarEventId;
  const sessionConversationId = session?.conversationId;
  if (
    session === null ||
    calendarEventId === undefined ||
    sessionConversationId === undefined ||
    !isEditableBookingStatus(session.status)
  ) {
    return undefined;
  }
  if (sessionConversationId === conversation._id) return session;
  if (conversation.customerId === undefined) return undefined;
  const source = await ctx.db.get(sessionConversationId);
  if (source?.customerId === conversation.customerId) return session;
  const participants = await ctx.db
    .query("calendarEventParticipants")
    .withIndex("by_eventId", (q) => q.eq("eventId", calendarEventId))
    .take(20);
  const ownsBooking = participants.some(
    (participant) =>
      participant.role === "customer" && participant.customerId === conversation.customerId,
  );
  return ownsBooking ? session : undefined;
}

export const beginBookingEdit = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    bookingId: v.optional(v.id("calendarEvents")),
  },
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

    const conversation = await ctx.db.get(args.conversationId);
    if (conversation === null) return { success: false, message: "No booking found to edit." };
    const editable = await editableSessionsForConversation(ctx, args.conversationId);
    const onlyEditable = editable.length === 1 ? editable[0] : undefined;
    const session = args.bookingId !== undefined
      ? await sessionForCustomerBooking(ctx, conversation, args.bookingId)
      : onlyEditable;
    if (editable.length > 1 && args.bookingId === undefined) {
      return {
        success: false,
        message: "This customer has more than one booking. Call listCustomerBookings and pass that booking's bookingId to beginBookingEdit.",
      };
    }
    const calendarEventId = session?.calendarEventId;
    const serviceId = session?.serviceId;
    if (session === undefined || calendarEventId === undefined || serviceId === undefined) {
      return { success: false, message: "No booking found to edit." };
    }

    const [event, service] = await Promise.all([
      ctx.db.get(calendarEventId),
      ctx.db.get(serviceId),
    ]);
    if (event === null || service === null || event.status === "cancelled") {
      return { success: false, message: "No active booking found to edit." };
    }

    const now = Date.now();
    await ctx.db.patch(session._id, {
      conversationId: args.conversationId,
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
