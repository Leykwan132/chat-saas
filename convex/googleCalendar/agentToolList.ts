import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { eventBlocksCalendarAvailability } from "../calendarAvailabilityIntervals";
import { resolveTeamForAgent } from "../appointmentBooking/access";
import { getActiveSession, getExistingBookingSession } from "../appointmentBooking/sessionStore";
import {
  bookingFailureFromGoogle,
  googleCalendarBookingGate,
  loadGoogleCalendarConnectionForUser,
} from "./bookingGate";

const busyIntervalValidator = v.object({
  startAt: v.number(),
  endAt: v.number(),
  busy: v.literal(true),
});

export const prepareList = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    rangeStartAt: v.number(),
    rangeEndAt: v.number(),
    refreshed: v.optional(v.boolean()),
  },
  returns: v.union(
    v.object({
      kind: v.literal("completed"),
      result: v.array(busyIntervalValidator),
    }),
    v.object({
      kind: v.literal("failed"),
      result: v.object({
        kind: v.string(),
        success: v.literal(false),
        message: v.string(),
      }),
    }),
    v.object({
      kind: v.literal("needs_refresh"),
      connectionId: v.id("googleCalendarConnections"),
    }),
  ),
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (conversation === null || conversation.assignedAgentId === undefined) {
      return {
        kind: "failed" as const,
        result: {
          kind: "invalid_request",
          success: false as const,
          message: "This conversation is not assigned to an agent.",
        },
      };
    }
    const agent = await ctx.db.get(conversation.assignedAgentId);
    if (agent === null) throw new Error("Agent not found");
    const team = await resolveTeamForAgent(ctx, agent);
    const session = await getExistingBookingSession(ctx, conversation._id)
      ?? await getActiveSession(ctx, conversation._id);
    const assignedUserId = session?.selectedSlot?.assignedUserId;
    if (assignedUserId !== undefined) {
      const connection = await loadGoogleCalendarConnectionForUser(ctx, assignedUserId);
      const gate = googleCalendarBookingGate(connection);
      if (gate.kind === "error") {
        return { kind: "failed" as const, result: bookingFailureFromGoogle(gate.result) };
      }
      if (gate.kind === "google" && args.refreshed !== true) {
        return { kind: "needs_refresh" as const, connectionId: gate.connectionId };
      }
    }
    const events = await ctx.db
      .query("calendarEvents")
      .withIndex("by_teamId_and_startAt", (q) =>
        q.eq("teamId", team._id).gte("startAt", args.rangeStartAt).lt("startAt", args.rangeEndAt),
      )
      .take(250);
    const assignedEventIds = assignedUserId === undefined
      ? null
      : new Set(
        (await ctx.db
          .query("calendarEventParticipants")
          .withIndex("by_teamId_and_role_and_userId_and_eventStartAt", (q) =>
            q
              .eq("teamId", team._id)
              .eq("role", "assigned")
              .eq("userId", assignedUserId)
              .gte("eventStartAt", args.rangeStartAt)
              .lt("eventStartAt", args.rangeEndAt),
          )
          .take(250))
          .map((row) => row.eventId),
      );
    const result = events
      .filter((event) =>
        eventBlocksCalendarAvailability(event)
        && (assignedEventIds === null || assignedEventIds.has(event._id)),
      )
      .map((event) => ({
        startAt: event.startAt,
        endAt: event.endAt,
        busy: true as const,
      }));
    return { kind: "completed" as const, result };
  },
});
