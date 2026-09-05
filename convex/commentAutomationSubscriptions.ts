import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { ensureCommentSubscription } from "./commentAutomationMeta";

export const internalGetSubscriptionTargets = internalQuery({
  args: { automationId: v.id("commentAutomations") },
  handler: async (ctx, args) => {
    const automation = await ctx.db.get(args.automationId);
    if (automation === null) return null;
    const pages = await ctx.db
      .query("commentAutomationPages")
      .withIndex("by_automationId", (q) => q.eq("automationId", automation._id))
      .take(100);
    const targets = await Promise.all(pages.map(async (page) => ({
      page,
      channel: await ctx.db.get(page.channelId),
    })));
    return { targets };
  },
});

export const internalSetPageSubscription = internalMutation({
  args: {
    pageId: v.id("commentAutomationPages"),
    status: v.union(v.literal("subscribed"), v.literal("failed")),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.pageId, {
      subscriptionStatus: args.status,
      subscriptionError: args.error,
      updatedAt: Date.now(),
    });
  },
});

export const internalFinishSubscription = internalMutation({
  args: { automationId: v.id("commentAutomations") },
  handler: async (ctx, args) => {
    const pages = await ctx.db
      .query("commentAutomationPages")
      .withIndex("by_automationId", (q) => q.eq("automationId", args.automationId))
      .take(100);
    await ctx.db.patch(args.automationId, {
      status: pages.length > 0 && pages.every((page) => page.subscriptionStatus === "subscribed")
        ? "active"
        : "inactive",
      updatedAt: Date.now(),
    });
  },
});

export const activateAutomationPages = internalAction({
  args: { automationId: v.id("commentAutomations") },
  handler: async (ctx, args) => {
    const subscription = await ctx.runQuery(
      internal.commentAutomationSubscriptions.internalGetSubscriptionTargets,
      { automationId: args.automationId },
    );
    if (subscription === null) return;

    for (const target of subscription.targets) {
      if (target.page.subscriptionStatus === "subscribed") continue;
      try {
        if (target.channel === null) throw new Error("Selected page is unavailable");
        await ensureCommentSubscription(target.channel);
        await ctx.runMutation(internal.commentAutomationSubscriptions.internalSetPageSubscription, {
          pageId: target.page._id,
          status: "subscribed",
        });
      } catch (error) {
        await ctx.runMutation(internal.commentAutomationSubscriptions.internalSetPageSubscription, {
          pageId: target.page._id,
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    await ctx.runMutation(internal.commentAutomationSubscriptions.internalFinishSubscription, {
      automationId: args.automationId,
    });
  },
});
