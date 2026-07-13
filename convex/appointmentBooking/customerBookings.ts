import { v } from "convex/values";
import { query } from "../_generated/server";
import { getAuthContext } from "../authUtils";
import { Permission } from "../../shared/permissions";
import { AppointmentBookingSessionStatus } from "../appointmentBookingSessionStatus";
import { permissionsForCurrentUser, resolveTeamForAgent } from "./access";
import { formatBookingDetailsResponse } from "./sessionStore";
import { serviceTimeZone } from "./fields";

const HISTORY_STATUSES = new Set<string>([
  AppointmentBookingSessionStatus.Booked,
  AppointmentBookingSessionStatus.Completed,
  AppointmentBookingSessionStatus.Cancelled,
  AppointmentBookingSessionStatus.NoShow,
]);

export const listForConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const { orgId } = await getAuthContext(ctx);
    const conversation = await ctx.db.get(args.conversationId);
    if (conversation === null || conversation.orgId !== orgId) return [];
    const permissions = await permissionsForCurrentUser(ctx);
    if (!permissions.includes(Permission.CHATS_READ)) throw new Error("Forbidden");
    if (conversation.customerId === undefined || conversation.assignedAgentId === undefined) return [];
    const agent = await ctx.db.get(conversation.assignedAgentId);
    if (agent === null) return [];
    const team = await resolveTeamForAgent(ctx, agent);
    const customerParticipants = await ctx.db
      .query("calendarEventParticipants")
      .withIndex("by_teamId_and_role_and_customerId_and_eventStartAt", (q) =>
        q
          .eq("teamId", team._id)
          .eq("role", "customer")
          .eq("customerId", conversation.customerId),
      )
      .order("desc")
      .take(50);

    const bookings = [];
    for (const customerParticipant of customerParticipants) {
      const event = await ctx.db.get(customerParticipant.eventId);
      if (event === null || event.appointmentServiceId === undefined) continue;
      const session = await ctx.db
        .query("appointmentBookingSessions")
        .withIndex("by_calendarEventId", (q) => q.eq("calendarEventId", event._id))
        .unique();
      if (session === null || !HISTORY_STATUSES.has(session.status)) continue;
      const service = await ctx.db.get(event.appointmentServiceId);
      if (service === null) continue;
      const participants = await ctx.db
        .query("calendarEventParticipants")
        .withIndex("by_eventId", (q) => q.eq("eventId", event._id))
        .take(20);
      const assigned = participants.find((participant) => participant.role === "assigned");
      const details = formatBookingDetailsResponse({
        session,
        service,
        event,
        timeZone: serviceTimeZone(service, team),
        assignedTo: assigned?.displayName ?? assigned?.email,
      });
      bookings.push({
        ...details,
        bookingReference: event._id,
        timeZone: event.timeZone,
        title: event.title,
      });
    }
    return bookings;
  },
});
