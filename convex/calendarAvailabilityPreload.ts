import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import {
  availabilityBucketsForWindow,
  indexLegacyParticipantAvailability,
  readCalendarAvailabilityRevision,
} from "./calendarAvailabilityIntervals";

const LEGACY_REPAIR_BATCH_SIZE = 4;
const INTERVAL_QUERY_LIMIT = 250;
const MAX_INTERVALS_PER_USER = 250;

export type PreloadedCalendarInterval = {
  eventId: Id<"calendarEvents">;
  startAt: number;
  endAt: number;
  externalOwnerUserId?: Id<"users">;
};

export type PreloadedUserAvailability = {
  safe: boolean;
  intervals: PreloadedCalendarInterval[];
};

type WorkerPointer = {
  preloadId: Id<"calendarAvailabilityPreloads">;
  generation: number;
};

function workerPointer(preloadId: Id<"calendarAvailabilityPreloads">, generation: number) {
  return { preloadId, generation };
}

function sameIds(left: Id<"users">[], right: Id<"users">[]) {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

async function resetPreload(
  ctx: MutationCtx,
  preload: Doc<"calendarAvailabilityPreloads">,
  userIds: Id<"users">[],
  now: number,
) {
  const generation = preload.generation + 1;
  await ctx.db.patch(preload._id, {
    userIds,
    state: "pending",
    phase: "repair",
    generation,
    nextUserIndex: 0,
    revision: undefined,
    completedAt: undefined,
    updatedAt: now,
  });
  return { preloadId: preload._id, generation };
}

export async function ensureCalendarAvailabilityPreload(
  ctx: MutationCtx,
  args: {
    teamId: Id<"teams">;
    agentId: Id<"agents">;
    userIds: Id<"users">[];
    startAt: number;
    endAt: number;
    now: number;
  },
): Promise<
  | { state: "pending"; worker: WorkerPointer }
  | { state: "ready"; byUser: Map<Id<"users">, PreloadedUserAvailability> }
> {
  const preload = await ctx.db
    .query("calendarAvailabilityPreloads")
    .withIndex("by_teamId_and_agentId_and_windowStartAt_and_windowEndAt", (q) => q
      .eq("teamId", args.teamId)
      .eq("agentId", args.agentId)
      .eq("windowStartAt", args.startAt)
      .eq("windowEndAt", args.endAt))
    .unique();
  if (preload === null) {
    const preloadId = await ctx.db.insert("calendarAvailabilityPreloads", {
      teamId: args.teamId,
      agentId: args.agentId,
      windowStartAt: args.startAt,
      windowEndAt: args.endAt,
      userIds: args.userIds,
      state: "pending",
      phase: "repair",
      generation: 1,
      nextUserIndex: 0,
      createdAt: args.now,
      updatedAt: args.now,
    });
    return { state: "pending", worker: { preloadId, generation: 1 } };
  }
  if (!sameIds(preload.userIds, args.userIds)) {
    return { state: "pending", worker: await resetPreload(ctx, preload, args.userIds, args.now) };
  }
  if (preload.state === "pending") {
    return { state: "pending", worker: { preloadId: preload._id, generation: preload.generation } };
  }
  const revision = await readCalendarAvailabilityRevision(ctx, args.teamId);
  if (preload.revision !== revision) {
    return { state: "pending", worker: await resetPreload(ctx, preload, args.userIds, args.now) };
  }
  const userRows = await ctx.db
    .query("calendarAvailabilityPreloadUsers")
    .withIndex("by_preloadId", (q) => q.eq("preloadId", preload._id))
    .take(101);
  if (userRows.length > 100) {
    return { state: "pending", worker: await resetPreload(ctx, preload, args.userIds, args.now) };
  }
  const currentRows = new Map(userRows
    .filter((row) => row.generation === preload.generation)
    .map((row) => [row.userId, row]));
  if (args.userIds.some((userId) => !currentRows.has(userId))) {
    return { state: "pending", worker: await resetPreload(ctx, preload, args.userIds, args.now) };
  }
  const ownerIds = [...new Set([...currentRows.values()].flatMap((row) =>
    row.intervals.flatMap((interval) =>
      interval.externalOwnerUserId === undefined ? [] : [interval.externalOwnerUserId],
    ),
  ))];
  const eligibleOwners = new Set((await Promise.all(ownerIds.map(async (userId) => {
    const membership = await ctx.db
      .query("teamMemberships")
      .withIndex("by_userId_and_teamId", (q) => q.eq("userId", userId).eq("teamId", args.teamId))
      .unique();
    return membership === null ? undefined : userId;
  }))).filter((userId): userId is Id<"users"> => userId !== undefined));
  return { state: "ready", byUser: new Map(args.userIds.map((userId) => {
    const row = currentRows.get(userId)!;
    return [userId, {
      safe: row.safe,
      intervals: row.intervals.filter((interval) =>
        interval.externalOwnerUserId === undefined || eligibleOwners.has(interval.externalOwnerUserId),
      ),
    }];
  })) };
}

async function loadBucketIntervals(
  ctx: MutationCtx,
  args: {
    teamId: Id<"teams">;
    userId: Id<"users">;
    startAt: number;
    endAt: number;
    bucket: { kind: "day" | "month" | "long"; key: string };
  },
) {
  const byStart = await ctx.db
    .query("calendarAvailabilityIntervals")
    .withIndex("by_teamId_and_userId_and_bucketKind_and_bucketKey_and_startAt", (q) => q
      .eq("teamId", args.teamId).eq("userId", args.userId)
      .eq("bucketKind", args.bucket.kind).eq("bucketKey", args.bucket.key)
      .lt("startAt", args.endAt))
    .take(INTERVAL_QUERY_LIMIT + 1);
  if (byStart.length <= INTERVAL_QUERY_LIMIT) {
    return { safe: true, rows: byStart.filter((row) => row.endAt > args.startAt) };
  }
  const byEnd = await ctx.db
    .query("calendarAvailabilityIntervals")
    .withIndex("by_teamId_and_userId_and_bucketKind_and_bucketKey_and_endAt", (q) => q
      .eq("teamId", args.teamId).eq("userId", args.userId)
      .eq("bucketKind", args.bucket.kind).eq("bucketKey", args.bucket.key)
      .gt("endAt", args.startAt))
    .take(INTERVAL_QUERY_LIMIT + 1);
  return byEnd.length <= INTERVAL_QUERY_LIMIT
    ? { safe: true, rows: byEnd.filter((row) => row.startAt < args.endAt) }
    : { safe: false, rows: [] };
}

export async function loadIndexedUserAvailability(
  ctx: MutationCtx,
  args: {
    teamId: Id<"teams">;
    userId: Id<"users">;
    startAt: number;
    endAt: number;
  },
) {
  const buckets = availabilityBucketsForWindow(args.startAt, args.endAt);
  if (buckets === null) return { safe: false, intervals: [] };
  const rows = new Map<Id<"calendarEvents">, PreloadedCalendarInterval>();
  for (const bucket of buckets) {
    const result = await loadBucketIntervals(ctx, { ...args, bucket });
    if (!result.safe) return { safe: false, intervals: [] };
    for (const row of result.rows) {
      rows.set(row.eventId, {
        eventId: row.eventId,
        startAt: row.startAt,
        endAt: row.endAt,
        externalOwnerUserId: row.externalOwnerUserId,
      });
      if (rows.size > MAX_INTERVALS_PER_USER) return { safe: false, intervals: [] };
    }
  }
  return { safe: true, intervals: [...rows.values()] };
}

async function storeUserAvailability(
  ctx: MutationCtx,
  preload: Doc<"calendarAvailabilityPreloads">,
  userId: Id<"users">,
  result: PreloadedUserAvailability,
  now: number,
) {
  const existing = await ctx.db
    .query("calendarAvailabilityPreloadUsers")
    .withIndex("by_preloadId_and_userId", (q) => q.eq("preloadId", preload._id).eq("userId", userId))
    .unique();
  const value = { generation: preload.generation, safe: result.safe, intervals: result.intervals, updatedAt: now };
  if (existing === null) {
    await ctx.db.insert("calendarAvailabilityPreloadUsers", {
      preloadId: preload._id, teamId: preload.teamId, userId, ...value,
    });
  } else {
    await ctx.db.patch(existing._id, value);
  }
}

export async function advanceCalendarAvailabilityPreload(
  ctx: MutationCtx,
  args: WorkerPointer & { now: number },
): Promise<{ continue: boolean; worker?: WorkerPointer }> {
  const preload = await ctx.db.get(args.preloadId);
  if (preload === null || preload.state !== "pending" || preload.generation !== args.generation) {
    return { continue: false };
  }
  if (preload.phase === "repair") {
    if (preload.nextUserIndex >= preload.userIds.length) {
      const revision = await readCalendarAvailabilityRevision(ctx, preload.teamId);
      await ctx.db.patch(preload._id, { phase: "load", nextUserIndex: 0, revision, updatedAt: args.now });
      return { continue: true, worker: workerPointer(preload._id, preload.generation) };
    }
    const userId = preload.userIds[preload.nextUserIndex]!;
    const legacy = await ctx.db
      .query("calendarEventParticipants")
      .withIndex("by_teamId_and_role_and_userId_and_availabilityIndexedAt", (q) => q
        .eq("teamId", preload.teamId).eq("role", "assigned").eq("userId", userId)
        .eq("availabilityIndexedAt", undefined))
      .take(LEGACY_REPAIR_BATCH_SIZE + 1);
    for (const participant of legacy.slice(0, LEGACY_REPAIR_BATCH_SIZE)) {
      await indexLegacyParticipantAvailability(ctx, participant, args.now);
    }
    if (legacy.length === 0) {
      await ctx.db.patch(preload._id, { nextUserIndex: preload.nextUserIndex + 1, updatedAt: args.now });
    }
    return { continue: true, worker: workerPointer(preload._id, preload.generation) };
  }
  const revision = await readCalendarAvailabilityRevision(ctx, preload.teamId);
  if (revision !== preload.revision) {
    const worker = await resetPreload(ctx, preload, preload.userIds, args.now);
    return { continue: true, worker };
  }
  if (preload.nextUserIndex >= preload.userIds.length) {
    await ctx.db.patch(preload._id, { state: "ready", completedAt: args.now, updatedAt: args.now });
    return { continue: false };
  }
  const userId = preload.userIds[preload.nextUserIndex]!;
  await storeUserAvailability(ctx, preload, userId, await loadIndexedUserAvailability(ctx, {
    teamId: preload.teamId,
    userId,
    startAt: preload.windowStartAt,
    endAt: preload.windowEndAt,
  }), args.now);
  await ctx.db.patch(preload._id, { nextUserIndex: preload.nextUserIndex + 1, updatedAt: args.now });
  return { continue: true, worker: workerPointer(preload._id, preload.generation) };
}
