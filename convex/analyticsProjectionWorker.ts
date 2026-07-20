import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { internalMutation } from "./triggers";
import { reconcileConversationAnalytics } from "./analyticsConversationProjection";
import { projectConversationMessagePage } from "./analyticsMessageProjection";
import { reconcileConversationTopics } from "./analyticsTopicProjection";

type ProjectionWorkerResult = {
  completed: boolean;
  stale: boolean;
};

async function finishRequest(
  ctx: MutationCtx,
  requestId: Id<"conversationAnalyticsDirtyRequests">,
  revision: number,
  conversationId: Id<"conversations">,
): Promise<ProjectionWorkerResult> {
  await reconcileConversationAnalytics(ctx, conversationId);
  await reconcileConversationTopics(ctx, conversationId);
  const current = await ctx.db.get(requestId);
  if (current?.revision === revision) {
    await ctx.db.delete(requestId);
    return { completed: true, stale: false };
  }
  return { completed: false, stale: true };
}

async function continueProjection(
  ctx: MutationCtx,
  args: {
    requestId: Id<"conversationAnalyticsDirtyRequests">;
    revision: number;
    conversationId: Id<"conversations">;
    earliestDirtyMessageAt: number;
    cursor: string | null;
  },
): Promise<ProjectionWorkerResult> {
  const current = await ctx.db.get(args.requestId);
  if (current === null || current.revision !== args.revision) {
    return { completed: false, stale: true };
  }
  const page = await projectConversationMessagePage(ctx, {
    conversationId: args.conversationId,
    earliestDirtyMessageAt: args.earliestDirtyMessageAt,
    cursor: args.cursor,
  });
  if (!page.isDone) {
    await ctx.scheduler.runAfter(
      0,
      internal.analyticsProjectionWorker.continueRun,
      { ...args, cursor: page.continueCursor },
    );
    return { completed: false, stale: false };
  }
  return await finishRequest(
    ctx,
    args.requestId,
    args.revision,
    args.conversationId,
  );
}

export const run = internalMutation({
  args: {
    requestId: v.id("conversationAnalyticsDirtyRequests"),
  },
  handler: async (ctx, args): Promise<ProjectionWorkerResult> => {
    const request = await ctx.db.get(args.requestId);
    if (request === null) {
      return { completed: false, stale: true };
    }
    if (request.earliestDirtyMessageAt === undefined) {
      return await finishRequest(
        ctx,
        request._id,
        request.revision,
        request.conversationId,
      );
    }
    return await continueProjection(ctx, {
      requestId: request._id,
      revision: request.revision,
      conversationId: request.conversationId,
      earliestDirtyMessageAt: request.earliestDirtyMessageAt,
      cursor: null,
    });
  },
});

export const continueRun = internalMutation({
  args: {
    requestId: v.id("conversationAnalyticsDirtyRequests"),
    revision: v.number(),
    conversationId: v.id("conversations"),
    earliestDirtyMessageAt: v.number(),
    cursor: v.string(),
  },
  handler: async (ctx, args): Promise<ProjectionWorkerResult> =>
    await continueProjection(ctx, args),
});
