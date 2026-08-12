import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { AVAILABILITY_FRESHNESS_MS } from "./constants";
import { externalEventEligibleInTeam } from "./calendarProjection";

function connectionHealthy(
  connection: Doc<"googleCalendarConnections"> | null,
  now: number,
) {
  if (connection === null) return true;
  if (connection.state !== "connected" && connection.state !== "syncing") return false;
  if (connection.lastErrorKind !== undefined || connection.lastSuccessfulSyncAt === undefined) {
    return false;
  }
  return now - connection.lastSuccessfulSyncAt <= AVAILABILITY_FRESHNESS_MS;
}

export async function loadGoogleCalendarHealthByUser(
  ctx: MutationCtx,
  userIds: Id<"users">[],
  now: number,
) {
  const distinctUserIds = [...new Set(userIds)];
  const health = await Promise.all(distinctUserIds.map(async (userId) => {
    const connection = await ctx.db
      .query("googleCalendarConnections")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    return [userId, connectionHealthy(connection, now)] as const;
  }));
  return new Map(health);
}

export function calendarEventBlocksAvailability(event: Doc<"calendarEvents">) {
  if (event.status === "cancelled" || event.externalStatus === "cancelled") return false;
  return event.externalTransparency !== "transparent";
}

export async function calendarEventBlocksTeamAvailability(
  ctx: MutationCtx,
  event: Doc<"calendarEvents">,
) {
  return calendarEventBlocksAvailability(event) &&
    await externalEventEligibleInTeam(ctx, event);
}

function overlaps(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && endA > startB;
}

export async function hasCalendarConflict(
  ctx: MutationCtx,
  args: {
    teamId: Id<"teams">;
    userId: Id<"users">;
    startAt: number;
    endAt: number;
    excludeEventId?: Id<"calendarEvents">;
  },
) {
  const currentParticipants = await ctx.db
    .query("calendarEventParticipants")
    .withIndex("by_teamId_and_role_and_userId_and_eventEndAt", (q) =>
      q
        .eq("teamId", args.teamId)
        .eq("role", "assigned")
        .eq("userId", args.userId)
        .gt("eventEndAt", args.startAt),
    )
    .take(101);
  const legacyParticipants = await ctx.db
    .query("calendarEventParticipants")
    .withIndex("by_teamId_and_role_and_userId_and_eventEndAt", (q) =>
      q
        .eq("teamId", args.teamId)
        .eq("role", "assigned")
        .eq("userId", args.userId)
        .eq("eventEndAt", undefined),
    )
    .take(101);
  if (currentParticipants.length > 100 || legacyParticipants.length > 100) return true;
  for (const participant of [...currentParticipants, ...legacyParticipants]) {
    const event = await ctx.db.get(participant.eventId);
    if (
      event !== null &&
      event._id !== args.excludeEventId &&
      await calendarEventBlocksTeamAvailability(ctx, event) &&
      overlaps(args.startAt, args.endAt, event.startAt, event.endAt)
    ) {
      return true;
    }
  }
  return false;
}
