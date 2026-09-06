import { v } from "convex/values";
import { internalQuery, query, type QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { getAuthContext } from "../authUtils";
import { getLinkedInboxConversationDocs } from "../conversations";
import { Permission } from "../../shared/permissions";
import { permissionsForCurrentUser } from "./access";
import { serviceTimeZone } from "./fields";
import {
  activeSessionSnapshot,
  formatBookingDetailsResponse,
  getActiveSession,
  getExistingBookingSession,
} from "./sessionStore";

async function loadActiveBookingDetailsForConversation(
  ctx: QueryCtx,
  conversationId: Id<"conversations">,
) {
  const session = await getExistingBookingSession(ctx, conversationId);
  if (session === undefined || session.calendarEventId === undefined || session.serviceId === undefined) {
    return null;
  }

  const [event, service] = await Promise.all([
    ctx.db.get(session.calendarEventId),
    ctx.db.get(session.serviceId),
  ]);
  if (event === null || service === null || event.status === "cancelled") {
    return null;
  }

  const team = await ctx.db.get(event.teamId);
  const participants = await ctx.db
    .query("calendarEventParticipants")
    .withIndex("by_eventId", (q) => q.eq("eventId", event._id))
    .take(20);
  const assigned = participants.find((row) => row.role === "assigned");

  return formatBookingDetailsResponse({
    session,
    service,
    event,
    timeZone: serviceTimeZone(service, team ?? undefined),
    assignedTo: assigned?.displayName ?? assigned?.email,
  });
}

async function assertConversationBookingRead(
  ctx: QueryCtx,
  conversationId: Id<"conversations">,
) {
  const { orgId } = await getAuthContext(ctx);
  const conv = await ctx.db.get(conversationId);
  if (conv === null || conv.orgId !== orgId) {
    return null;
  }
  const permissions = await permissionsForCurrentUser(ctx);
  if (!permissions.includes(Permission.CHATS_READ)) {
    throw new Error("Forbidden");
  }
  return conv;
}

async function conversationHasActiveBooking(
  ctx: QueryCtx,
  conversationId: Id<"conversations">,
) {
  const session = await getExistingBookingSession(ctx, conversationId);
  if (session === undefined || session.calendarEventId === undefined) {
    return false;
  }
  const event = await ctx.db.get(session.calendarEventId);
  return event !== null && event.status !== "cancelled";
}

export const listActiveBookingConversationIdsForCurrentOrg = query({
  args: {},
  handler: async (ctx) => {
    const { orgId } = await getAuthContext(ctx);
    if (orgId === "personal" || !orgId) {
      return [];
    }
    const permissions = await permissionsForCurrentUser(ctx);
    if (!permissions.includes(Permission.CHATS_READ)) {
      throw new Error("Forbidden");
    }

    const { conversations } = await getLinkedInboxConversationDocs(ctx, orgId);
    const ids: Id<"conversations">[] = [];
    for (const conv of conversations) {
      if (await conversationHasActiveBooking(ctx, conv._id)) {
        ids.push(conv._id);
      }
    }
    return ids;
  },
});

export const getCurrentBookingForConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const conv = await assertConversationBookingRead(ctx, args.conversationId);
    if (conv === null) {
      return null;
    }
    return await loadActiveBookingDetailsForConversation(ctx, args.conversationId);
  },
});

export const getActiveBookingSession = internalQuery({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const session = await getActiveSession(ctx, args.conversationId);
    if (session === undefined) {
      return {
        success: false,
        hasActiveSession: false,
        message: "No active booking session exists for this conversation.",
      };
    }
    return {
      success: true,
      hasActiveSession: true,
      ...activeSessionSnapshot(session),
    };
  },
});

export const getCurrentBooking = internalQuery({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const session = await getActiveSession(ctx, args.conversationId);
    const booking = await loadActiveBookingDetailsForConversation(ctx, args.conversationId);
    const activeSession = session === undefined ? null : activeSessionSnapshot(session);
    if (booking === null) {
      return {
        success: false,
        hasActiveSession: session !== undefined,
        activeSession,
        message: session
          ? `No completed booking yet. Active session status is ${session.status}.`
          : "No active booking session or completed booking found for this conversation.",
      };
    }

    return {
      success: true,
      hasActiveSession: session !== undefined,
      activeSession,
      ...booking,
    };
  },
});
