import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";

export const DIRTY_DISPATCH_BATCH_SIZE = 25;
export const DIRTY_RETRY_INTERVAL_MS = 15 * 60 * 1000;

export const dispatchDue = internalMutation({
  args: {
    now: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ dispatched: number; continued: boolean }> => {
    const now = args.now ?? Date.now();
    const requests = await ctx.db
      .query("conversationAnalyticsDirtyRequests")
      .withIndex("by_nextAttemptAt", (query) =>
        query.lte("nextAttemptAt", now),
      )
      .take(DIRTY_DISPATCH_BATCH_SIZE);

    for (const request of requests) {
      await ctx.db.patch(request._id, {
        nextAttemptAt: now + DIRTY_RETRY_INTERVAL_MS,
      });
      await ctx.scheduler.runAfter(
        0,
        internal.analyticsProjectionWorker.run,
        { requestId: request._id },
      );
    }

    const continued = requests.length === DIRTY_DISPATCH_BATCH_SIZE;
    if (continued) {
      await ctx.scheduler.runAfter(
        0,
        internal.analyticsDirtyDispatcher.dispatchDue,
        { now },
      );
    }
    return { dispatched: requests.length, continued };
  },
});
