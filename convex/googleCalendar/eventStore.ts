import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import {
  mappedGoogleCalendarEventValidator,
} from "./eventMapping";
import { ownedSyncRun } from "./syncOwnership";
import {
  activeGoogleCalendarEvent,
  cancelGoogleCalendarProjection,
  upsertGoogleCalendarProjection,
} from "./eventProjectionStore";
import { reconcileGoogleCalendarCreate } from "./writeReconciliation";

const MAX_EVENTS_PER_PAGE = 20;

export const applyPage = internalMutation({
  args: {
    connectionId: v.id("googleCalendarConnections"),
    runId: v.id("googleCalendarSyncRuns"),
    events: v.array(mappedGoogleCalendarEventValidator),
    membershipCursor: v.optional(v.string()),
    nextPageToken: v.optional(v.string()),
    candidateSyncToken: v.optional(v.string()),
    now: v.number(),
  },
  returns: v.union(
    v.object({ kind: v.literal("lost") }),
    v.object({
      kind: v.literal("applied"),
      importedCount: v.number(),
      updatedCount: v.number(),
      cancelledCount: v.number(),
      conflictCount: v.number(),
      nextMembershipCursor: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    if (args.events.length > MAX_EVENTS_PER_PAGE) throw new Error("Google Calendar page exceeds the synchronization batch limit");
    const owned = await ownedSyncRun(ctx, args.connectionId, args.runId);
    if (owned === undefined) return { kind: "lost" as const };
    const { connection, run } = owned;
    const owner = await ctx.db.get(connection.userId);
    if (owner === null) throw new Error("Google Calendar connection owner not found");
    const membershipPage = await ctx.db
      .query("teamMemberships")
      .withIndex("by_userId", (q) => q.eq("userId", owner._id))
      .paginate({ cursor: args.membershipCursor ?? null, numItems: 1 });
    let importedCount = 0;
    let updatedCount = 0;
    let cancelledCount = 0;
    for (const mapped of args.events) {
      const reconciledEvent = mapped.status === "cancelled"
        ? null
        : await reconcileGoogleCalendarCreate(ctx, connection, mapped, args.now);
      for (const membership of membershipPage.page) {
        if (mapped.status === "cancelled") {
          cancelledCount += await cancelGoogleCalendarProjection(ctx, membership.teamId, owner._id, mapped, args.now);
        } else {
          const result = await upsertGoogleCalendarProjection(
            ctx,
            membership.teamId,
            owner,
            activeGoogleCalendarEvent(mapped),
            run,
            args.now,
            reconciledEvent,
          );
          if (result === "imported") importedCount += 1;
          else updatedCount += 1;
        }
      }
    }
    await ctx.db.patch(run._id, {
      pageToken: membershipPage.isDone ? args.nextPageToken : run.pageToken,
      candidateSyncToken: membershipPage.isDone ? args.candidateSyncToken : run.candidateSyncToken,
      importedCount: run.importedCount + importedCount,
      updatedCount: run.updatedCount + updatedCount,
      cancelledCount: run.cancelledCount + cancelledCount,
      updatedAt: args.now,
    });
    return {
      kind: "applied" as const,
      importedCount,
      updatedCount,
      cancelledCount,
      conflictCount: 0,
      nextMembershipCursor: membershipPage.isDone ? undefined : membershipPage.continueCursor,
    };
  },
});
