import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internalMutation, type MutationCtx } from "./_generated/server";

export type MarkConversationAnalyticsDirtyArgs = {
  conversationId: Id<"conversations">;
  earliestDirtyMessageAt?: number;
  requestedAt?: number;
};

function minimumDefined(
  first: number | undefined,
  second: number | undefined,
): number | undefined {
  if (first === undefined) return second;
  if (second === undefined) return first;
  return Math.min(first, second);
}

export async function markConversationAnalyticsDirty(
  ctx: MutationCtx,
  args: MarkConversationAnalyticsDirtyArgs,
): Promise<Id<"conversationAnalyticsDirtyRequests">> {
  const existing = await ctx.db
    .query("conversationAnalyticsDirtyRequests")
    .withIndex("by_conversationId", (query) =>
      query.eq("conversationId", args.conversationId),
    )
    .unique();
  const requestedAt = args.requestedAt ?? Date.now();
  if (existing === null) {
    return await ctx.db.insert("conversationAnalyticsDirtyRequests", {
      conversationId: args.conversationId,
      revision: 1,
      requestedAt,
      nextAttemptAt: requestedAt,
      earliestDirtyMessageAt: args.earliestDirtyMessageAt,
    });
  }
  const earliestDirtyMessageAt = minimumDefined(
    existing.earliestDirtyMessageAt,
    args.earliestDirtyMessageAt,
  );
  await ctx.db.patch(existing._id, {
    revision: existing.revision + 1,
    requestedAt,
    earliestDirtyMessageAt,
  });
  return existing._id;
}

export const request = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    earliestDirtyMessageAt: v.optional(v.number()),
    requestedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) =>
    await markConversationAnalyticsDirty(ctx, args),
});
