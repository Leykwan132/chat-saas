import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../_generated/server";
import { ownedSyncRun } from "./syncOwnership";
import { removeParticipantAvailabilityIntervals } from "../calendarAvailabilityIntervals";
import { GOOGLE_CALENDAR_EXTERNAL_EVENT_INDEX } from "./constants";

const RECOVERY_EVENT_BATCH_SIZE = 40;

type RecoveryCursor = {
  membershipCursor: string | null;
  eventCursor: string | null;
};

function decodeCursor(value?: string): RecoveryCursor {
  if (value === undefined) return { membershipCursor: null, eventCursor: null };
  const parsed = JSON.parse(value) as Partial<RecoveryCursor>;
  if (
    (parsed.membershipCursor !== null && typeof parsed.membershipCursor !== "string") ||
    (parsed.eventCursor !== null && typeof parsed.eventCursor !== "string")
  ) {
    throw new Error("Google Calendar recovery cursor is invalid");
  }
  return {
    membershipCursor: parsed.membershipCursor ?? null,
    eventCursor: parsed.eventCursor ?? null,
  };
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

export const recoverInvalidSyncToken = internalMutation({
  args: {
    connectionId: v.id("googleCalendarConnections"),
    runId: v.id("googleCalendarSyncRuns"),
    cursor: v.optional(v.string()),
    now: v.number(),
  },
  returns: v.union(
    v.object({ kind: v.literal("lost") }),
    v.object({
      kind: v.literal("progress"),
      complete: v.boolean(),
      cursor: v.optional(v.string()),
      deletedCount: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const owned = await ownedSyncRun(ctx, args.connectionId, args.runId);
    if (owned === undefined) return { kind: "lost" as const };
    const { connection, run } = owned;
    const cursor = decodeCursor(args.cursor);
    const membershipPage = await ctx.db
      .query("teamMemberships")
      .withIndex("by_userId", (q) => q.eq("userId", connection.userId))
      .paginate({ cursor: cursor.membershipCursor, numItems: 1 });
    const membership = membershipPage.page[0];
    if (membership === undefined) {
      await ctx.db.patch(run._id, { state: "failed", errorKind: "invalid_request", completedAt: args.now, updatedAt: args.now });
      await ctx.db.patch(connection._id, {
        state: "connected",
        activeSyncRunId: undefined,
        syncToken: undefined,
        updatedAt: args.now,
      });
      return { kind: "progress" as const, complete: true, deletedCount: 0 };
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
    let deletedCount = 0;
    for (const event of eventPage.page) {
      if (event.externalProvider !== "google" || event.externalOrigin !== "google") continue;
      await deleteParticipants(ctx, event._id);
      await ctx.db.delete(event._id);
      deletedCount += 1;
    }
    if (!eventPage.isDone) {
      await ctx.db.patch(run._id, { updatedAt: args.now });
      return {
        kind: "progress" as const,
        complete: false,
        cursor: JSON.stringify({ membershipCursor: cursor.membershipCursor, eventCursor: eventPage.continueCursor }),
        deletedCount,
      };
    }
    if (!membershipPage.isDone) {
      await ctx.db.patch(run._id, { updatedAt: args.now });
      return {
        kind: "progress" as const,
        complete: false,
        cursor: JSON.stringify({ membershipCursor: membershipPage.continueCursor, eventCursor: null }),
        deletedCount,
      };
    }
    await ctx.db.patch(run._id, { state: "failed", errorKind: "invalid_request", completedAt: args.now, updatedAt: args.now });
    await ctx.db.patch(connection._id, {
      state: "connected",
      activeSyncRunId: undefined,
      syncToken: undefined,
      updatedAt: args.now,
    });
    return { kind: "progress" as const, complete: true, deletedCount };
  },
});

export const reconcileFullSync = internalMutation({
  args: {
    connectionId: v.id("googleCalendarConnections"),
    runId: v.id("googleCalendarSyncRuns"),
    cursor: v.optional(v.string()),
    now: v.number(),
  },
  returns: v.union(
    v.object({ kind: v.literal("lost") }),
    v.object({
      kind: v.literal("progress"),
      complete: v.boolean(),
      cursor: v.optional(v.string()),
      deletedCount: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const owned = await ownedSyncRun(ctx, args.connectionId, args.runId);
    if (owned === undefined) return { kind: "lost" as const };
    const { connection, run } = owned;
    if (run.requestKind !== "full") throw new Error("Google Calendar full sync requires a full run");
    const cursor = decodeCursor(args.cursor);
    const membershipPage = await ctx.db
      .query("teamMemberships")
      .withIndex("by_userId", (q) => q.eq("userId", connection.userId))
      .paginate({ cursor: cursor.membershipCursor, numItems: 1 });
    const membership = membershipPage.page[0];
    if (membership === undefined) {
      await ctx.db.patch(run._id, { updatedAt: args.now });
      return { kind: "progress" as const, complete: true, deletedCount: 0 };
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
    let deletedCount = 0;
    for (const event of eventPage.page) {
      if (
        event.externalProvider !== "google" || event.externalOrigin !== "google" ||
        event.externalLastSeenSyncRunId === run._id
      ) continue;
      await deleteParticipants(ctx, event._id);
      await ctx.db.delete(event._id);
      deletedCount += 1;
    }
    if (!eventPage.isDone) {
      await ctx.db.patch(run._id, { updatedAt: args.now });
      return {
        kind: "progress" as const,
        complete: false,
        cursor: JSON.stringify({
          membershipCursor: cursor.membershipCursor,
          eventCursor: eventPage.continueCursor,
        }),
        deletedCount,
      };
    }
    if (!membershipPage.isDone) {
      await ctx.db.patch(run._id, { updatedAt: args.now });
      return {
        kind: "progress" as const,
        complete: false,
        cursor: JSON.stringify({
          membershipCursor: membershipPage.continueCursor,
          eventCursor: null,
        }),
        deletedCount,
      };
    }
    await ctx.db.patch(run._id, { updatedAt: args.now });
    return { kind: "progress" as const, complete: true, deletedCount };
  },
});
