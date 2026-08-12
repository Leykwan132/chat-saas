import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import {
  availabilityBucketsForWindow,
  eventBlocksCalendarAvailability,
  indexLegacyParticipantAvailability,
} from "../calendarAvailabilityIntervals";
import { AVAILABILITY_FRESHNESS_MS } from "./constants";

const LEGACY_REPAIR_BATCH_SIZE = 128;
const INTERVAL_QUERY_LIMIT = 250;

export type UserCalendarAvailability = {
  safe: boolean;
  intervals: Array<Pick<Doc<"calendarAvailabilityIntervals">, "eventId" | "startAt" | "endAt">>;
};

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

async function repairLegacyParticipants(
  ctx: MutationCtx,
  teamId: Id<"teams">,
  userId: Id<"users">,
  now: number,
) {
  const participants = await ctx.db
    .query("calendarEventParticipants")
    .withIndex("by_teamId_and_role_and_userId_and_availabilityIndexedAt", (q) => q
      .eq("teamId", teamId)
      .eq("role", "assigned")
      .eq("userId", userId)
      .eq("availabilityIndexedAt", undefined))
    .take(LEGACY_REPAIR_BATCH_SIZE + 1);
  for (const participant of participants.slice(0, LEGACY_REPAIR_BATCH_SIZE)) {
    await indexLegacyParticipantAvailability(ctx, participant, now);
  }
  return participants.length <= LEGACY_REPAIR_BATCH_SIZE;
}

async function loadBucketIntervals(
  ctx: MutationCtx,
  args: {
    teamId: Id<"teams">;
    userId: Id<"users">;
    bucketKind: "day" | "month" | "long";
    bucketKey: string;
    startAt: number;
    endAt: number;
  },
) {
  const startingBeforeEnd = await ctx.db
    .query("calendarAvailabilityIntervals")
    .withIndex("by_teamId_and_userId_and_bucketKind_and_bucketKey_and_startAt", (q) => q
      .eq("teamId", args.teamId)
      .eq("userId", args.userId)
      .eq("bucketKind", args.bucketKind)
      .eq("bucketKey", args.bucketKey)
      .lt("startAt", args.endAt))
    .take(INTERVAL_QUERY_LIMIT + 1);
  if (startingBeforeEnd.length <= INTERVAL_QUERY_LIMIT) {
    return {
      safe: true,
      intervals: startingBeforeEnd.filter((row) => row.endAt > args.startAt),
    };
  }
  const endingAfterStart = await ctx.db
    .query("calendarAvailabilityIntervals")
    .withIndex("by_teamId_and_userId_and_bucketKind_and_bucketKey_and_endAt", (q) => q
      .eq("teamId", args.teamId)
      .eq("userId", args.userId)
      .eq("bucketKind", args.bucketKind)
      .eq("bucketKey", args.bucketKey)
      .gt("endAt", args.startAt))
    .take(INTERVAL_QUERY_LIMIT + 1);
  return endingAfterStart.length <= INTERVAL_QUERY_LIMIT
    ? { safe: true, intervals: endingAfterStart.filter((row) => row.startAt < args.endAt) }
    : { safe: false, intervals: [] };
}

async function loadUserIntervals(
  ctx: MutationCtx,
  args: {
    teamId: Id<"teams">;
    userId: Id<"users">;
    startAt: number;
    endAt: number;
    buckets: NonNullable<ReturnType<typeof availabilityBucketsForWindow>>;
  },
) {
  const rows = new Map<Id<"calendarAvailabilityIntervals">, Doc<"calendarAvailabilityIntervals">>();
  for (const bucket of args.buckets) {
    const result = await loadBucketIntervals(ctx, { ...args, bucketKind: bucket.kind, bucketKey: bucket.key });
    if (!result.safe) return { safe: false, rows: [] };
    for (const row of result.intervals) rows.set(row._id, row);
  }
  return { safe: true, rows: [...rows.values()] };
}

export async function loadCalendarAvailabilityByUser(
  ctx: MutationCtx,
  args: {
    teamId: Id<"teams">;
    userIds: Id<"users">[];
    startAt: number;
    endAt: number;
    now: number;
  },
) {
  const distinctUserIds = [...new Set(args.userIds)];
  const buckets = availabilityBucketsForWindow(args.startAt, args.endAt);
  if (buckets === null) {
    return new Map(distinctUserIds.map((userId) => [userId, { safe: false, intervals: [] }]));
  }
  const loaded = await Promise.all(distinctUserIds.map(async (userId) => {
    const legacyComplete = await repairLegacyParticipants(ctx, args.teamId, userId, args.now);
    if (!legacyComplete) return [userId, { safe: false, rows: [] }] as const;
    return [userId, await loadUserIntervals(ctx, { ...args, userId, buckets })] as const;
  }));
  const externalOwnerIds = [...new Set(loaded.flatMap(([, result]) =>
    result.rows.flatMap((row) => row.externalOwnerUserId === undefined ? [] : [row.externalOwnerUserId]),
  ))];
  const eligibleOwners = new Set((await Promise.all(externalOwnerIds.map(async (userId) => {
    const membership = await ctx.db
      .query("teamMemberships")
      .withIndex("by_userId_and_teamId", (q) => q.eq("userId", userId).eq("teamId", args.teamId))
      .unique();
    return membership === null ? undefined : userId;
  }))).filter((userId): userId is Id<"users"> => userId !== undefined));
  return new Map(loaded.map(([userId, result]) => [userId, {
    safe: result.safe,
    intervals: result.rows
      .filter((row) => row.externalOwnerUserId === undefined || eligibleOwners.has(row.externalOwnerUserId))
      .map(({ eventId, startAt, endAt }) => ({ eventId, startAt, endAt })),
  }]));
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
