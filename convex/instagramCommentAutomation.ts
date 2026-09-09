import { v } from "convex/values";
import { internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

export const internalGetInstagramCommentContext = internalQuery({
  args: { igUserId: v.string() },
  handler: async (ctx, args) => {
    const channel = await ctx.db
      .query("channels")
      .withIndex("by_igUserId", (q) => q.eq("igUserId", args.igUserId))
      .unique();
    if (
      channel === null ||
      channel.service !== "instagram" ||
      channel.status !== "connected"
    ) {
      return null;
    }
    const pages = await ctx.db
      .query("commentAutomationPages")
      .withIndex("by_channelId", (q) => q.eq("channelId", channel._id))
      .take(100);
    for (const page of pages) {
      if (page.subscriptionStatus !== "subscribed") continue;
      const automation = await ctx.db.get(page.automationId);
      if (automation?.status === "active") return { channel };
    }
    return null;
  },
});

export const processInstagramComment = internalAction({
  args: {
    igUserId: v.string(),
    externalCommentId: v.string(),
    authorAddress: v.string(),
    authorName: v.optional(v.string()),
    text: v.string(),
    timestampMs: v.number(),
  },
  handler: async (ctx, args) => {
    const context = await ctx.runQuery(
      internal.instagramCommentAutomation.internalGetInstagramCommentContext,
      { igUserId: args.igUserId },
    );
    if (context === null) {
      console.log("[comment-to-inbox] skipped:no-active-automation", {
        igUserId: args.igUserId,
        externalCommentId: args.externalCommentId,
      });
      return;
    }
    await ctx.runMutation(internal.commentAutomationIngest.ingestComment, {
      channelId: context.channel._id,
      externalCommentId: args.externalCommentId,
      authorAddress: args.authorAddress,
      authorName: args.authorName,
      text: args.text,
      timestampMs: args.timestampMs,
    });
  },
});
