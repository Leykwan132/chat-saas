import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import type { PreloadedUserAvailability } from "../calendarAvailabilityPreload";
import { eventBlocksCalendarAvailability } from "../calendarAvailabilityIntervals";
import { AVAILABILITY_FRESHNESS_MS } from "./constants";

export type UserCalendarAvailability = PreloadedUserAvailability;

function connectionHealthy(connection: Doc<"googleCalendarConnections"> | null, now: number) {
  if (connection === null) return true;
  if (connection.state !== "connected" && connection.state !== "syncing") return false;
  if (connection.lastErrorKind !== undefined || connection.lastSuccessfulSyncAt === undefined) return false;
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

export const calendarEventBlocksAvailability = eventBlocksCalendarAvailability;

function overlaps(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && endA > startB;
}

export function calendarAvailabilityHasConflict(
  availability: UserCalendarAvailability | undefined,
  startAt: number,
  endAt: number,
  excludeEventId?: Id<"calendarEvents">,
) {
  if (availability === undefined || !availability.safe) return true;
  return availability.intervals.some((interval) =>
    interval.eventId !== excludeEventId && overlaps(interval.startAt, interval.endAt, startAt, endAt),
  );
}
