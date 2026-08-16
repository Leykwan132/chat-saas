import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../_generated/server";
import { ownedSyncRun } from "./syncOwnership";
import { removeParticipantAvailabilityIntervals } from "../calendarAvailabilityIntervals";
import { GOOGLE_CALENDAR_EXTERNAL_EVENT_INDEX } from "./constants";

const RECOVERY_EVENT_BATCH_SIZE = 40;
const RECOVERY_TEAM_BATCH_SIZE = 50;

type RecoveryCursor = {
  membershipIndex: number;
  eventCursor: string | null;
};

type RecoveryProgress = {
  kind: "progress";
  complete: boolean;
  cursor?: string;
  deletedCount: number;
};

function decodeCursor(value?: string): RecoveryCursor {
  if (value === undefined) return { membershipIndex: 0, eventCursor: null };
  const parsed = JSON.parse(value) as Partial<RecoveryCursor>;
  if (
    typeof parsed.membershipIndex !== "number" ||
    !Number.isInteger(parsed.membershipIndex) ||
    parsed.membershipIndex < 0 ||
    (parsed.eventCursor !== null && parsed.eventCursor !== undefined && typeof parsed.eventCursor !== "string")
  ) {
    throw new Error("Google Calendar recovery cursor is invalid");
  }
  return {
    membershipIndex: parsed.membershipIndex,
    eventCursor: parsed.eventCursor ?? null,
  };
}

function encodeCursor(membershipIndex: number, eventCursor: string | null) {
  return JSON.stringify({ membershipIndex, eventCursor });
}

async function deleteParticipants(ctx: MutationCtx, eventId: Id<"calendarEvents">) {
  const participants = await ctx.db
    .query("calendarEventParticipants")
    .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
    .take(51);
  if (participants.length > 50) {
    throw new Error("Google Calendar recovery participant batch is too large");
  }
  for (const participant of participants) {
    await removeParticipantAvailabilityIntervals(ctx, participant._id);
    await ctx.db.delete(participant._id);
  }
}

async function membershipsForUser(ctx: MutationCtx, userId: Id<"users">) {
  const memberships = await ctx.db
    .query("teamMemberships")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .take(RECOVERY_TEAM_BATCH_SIZE + 1);
  if (memberships.length > RECOVERY_TEAM_BATCH_SIZE) {
    throw new Error("Google Calendar recovery team batch is too large");
  }
  return memberships;
}

async function nextGoogleEventPage(
  ctx: MutationCtx,
  connection: Doc<"googleCalendarConnections">,
  cursor: RecoveryCursor,
) {
  const memberships = await membershipsForUser(ctx, connection.userId);
  const membership = memberships[cursor.membershipIndex];
  if (membership === undefined) {
    return { kind: "exhausted" as const, membershipCount: memberships.length };
  }
  const eventPage = await ctx.db
    .query("calendarEvents")
    .withIndex(
      GOOGLE_CALENDAR_EXTERNAL_EVENT_INDEX,
      (q) => q
        .eq("teamId", membership.teamId)
        .eq("externalOwnerUserId", connection.userId)
        .eq("externalCalendarId", connection.primaryCalendarId),
    )
    .paginate({ cursor: cursor.eventCursor, numItems: RECOVERY_EVENT_BATCH_SIZE });
  return {
    kind: "page" as const,
    membershipCount: memberships.length,
    eventPage,
  };
}

function continueRecovery(
  cursor: RecoveryCursor,
  membershipCount: number,
  eventPage: { isDone: boolean; continueCursor: string },
  deletedCount: number,
): RecoveryProgress {
  if (!eventPage.isDone) {
    return {
      kind: "progress",
      complete: false,
      cursor: encodeCursor(cursor.membershipIndex, eventPage.continueCursor),
      deletedCount,
    };
  }
  const nextIndex = cursor.membershipIndex + 1;
  if (nextIndex < membershipCount) {
    return {
      kind: "progress",
      complete: false,
      cursor: encodeCursor(nextIndex, null),
      deletedCount,
    };
  }
  return { kind: "progress", complete: true, deletedCount };
}

const recoveryArgs = {
  connectionId: v.id("googleCalendarConnections"),
  runId: v.id("googleCalendarSyncRuns"),
  cursor: v.optional(v.string()),
  now: v.number(),
};

const recoveryReturns = v.union(
  v.object({ kind: v.literal("lost") }),
  v.object({
    kind: v.literal("progress"),
    complete: v.boolean(),
    cursor: v.optional(v.string()),
    deletedCount: v.number(),
  }),
);

export const recoverInvalidSyncToken = internalMutation({
  args: recoveryArgs,
  returns: recoveryReturns,
  handler: async (ctx, args) => {
    const owned = await ownedSyncRun(ctx, args.connectionId, args.runId);
    if (owned === undefined) return { kind: "lost" as const };
    const { connection, run } = owned;
    const cursor = decodeCursor(args.cursor);
    const page = await nextGoogleEventPage(ctx, connection, cursor);
    if (page.kind === "exhausted") {
      await ctx.db.patch(run._id, { state: "failed", errorKind: "invalid_request", completedAt: args.now, updatedAt: args.now });
      await ctx.db.patch(connection._id, {
        state: "connected",
        activeSyncRunId: undefined,
        syncToken: undefined,
        updatedAt: args.now,
      });
      return { kind: "progress" as const, complete: true, deletedCount: 0 };
    }
    let deletedCount = 0;
    for (const event of page.eventPage.page) {
      if (event.externalProvider !== "google" || event.externalOrigin !== "google") continue;
      await deleteParticipants(ctx, event._id);
      await ctx.db.delete(event._id);
      deletedCount += 1;
    }
    const progress = continueRecovery(cursor, page.membershipCount, page.eventPage, deletedCount);
    if (!progress.complete) {
      await ctx.db.patch(run._id, { updatedAt: args.now });
      return progress;
    }
    await ctx.db.patch(run._id, { state: "failed", errorKind: "invalid_request", completedAt: args.now, updatedAt: args.now });
    await ctx.db.patch(connection._id, {
      state: "connected",
      activeSyncRunId: undefined,
      syncToken: undefined,
      updatedAt: args.now,
    });
    return progress;
  },
});

export const reconcileFullSync = internalMutation({
  args: recoveryArgs,
  returns: recoveryReturns,
  handler: async (ctx, args) => {
    const owned = await ownedSyncRun(ctx, args.connectionId, args.runId);
    if (owned === undefined) return { kind: "lost" as const };
    const { connection, run } = owned;
    if (run.requestKind !== "full") throw new Error("Google Calendar full sync requires a full run");
    const cursor = decodeCursor(args.cursor);
    const page = await nextGoogleEventPage(ctx, connection, cursor);
    if (page.kind === "exhausted") {
      await ctx.db.patch(run._id, { updatedAt: args.now });
      return { kind: "progress" as const, complete: true, deletedCount: 0 };
    }
    let deletedCount = 0;
    for (const event of page.eventPage.page) {
      if (
        event.externalProvider !== "google" || event.externalOrigin !== "google" ||
        event.externalLastSeenSyncRunId === run._id
      ) continue;
      await deleteParticipants(ctx, event._id);
      await ctx.db.delete(event._id);
      deletedCount += 1;
    }
    const progress = continueRecovery(cursor, page.membershipCount, page.eventPage, deletedCount);
    await ctx.db.patch(run._id, { updatedAt: args.now });
    return progress;
  },
});
