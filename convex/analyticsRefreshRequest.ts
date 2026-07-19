import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalMutation, type MutationCtx } from "./_generated/server";

export async function requestConversationAnalyticsRefresh(
  ctx: MutationCtx,
  conversationId: Id<"conversations">,
) {
  const existing = await ctx.db
    .query("conversationAnalyticsRefreshRequests")
    .withIndex("by_conversationId", (q) =>
      q.eq("conversationId", conversationId),
    )
    .unique();
  const revision = (existing?.revision ?? 0) + 1;
  const requestedAt = Date.now();
  const requestId =
    existing?._id ??
    (await ctx.db.insert("conversationAnalyticsRefreshRequests", {
      conversationId,
      revision,
      requestedAt,
    }));

  if (existing !== null) {
    await ctx.db.patch(existing._id, { revision, requestedAt });
  }

  await ctx.scheduler.runAfter(0, internal.analyticsRefreshWorker.run, {
    requestId,
    revision,
  });

  return { requestId, revision };
}

export const request = internalMutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    return await requestConversationAnalyticsRefresh(
      ctx,
      args.conversationId,
    );
  },
});

