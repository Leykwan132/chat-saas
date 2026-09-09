import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { getMessengerComment } from "./commentAutomationMeta";
import { matchesCommentAutomation } from "./commentAutomationMatching";
import { ingestChannelMessage } from "./chat/threads";
import type { Doc } from "./_generated/dataModel";

export const internalGetMessengerCommentContext = internalQuery({
  args: { pageId: v.string() },
  handler: async (ctx, args) => {
    const channel = await ctx.db
      .query("channels")
      .withIndex("by_pageId", (q) => q.eq("pageId", args.pageId))
      .unique();
    if (
      channel === null ||
      channel.service !== "messenger" ||
      channel.status !== "connected"
    ) {
      return null;
    }

    const pages = await ctx.db
      .query("commentAutomationPages")
      .withIndex("by_channelId", (q) => q.eq("channelId", channel._id))
      .take(100);
    let hasActiveAutomation = false;
    let requiresCommentText = false;
    let hasAnyCommentAutomation = false;
    for (const page of pages) {
      if (page.subscriptionStatus !== "subscribed") continue;
      const automation = await ctx.db.get(page.automationId);
      if (automation?.status !== "active") continue;
      hasActiveAutomation = true;
      requiresCommentText ||= automation.trigger === "keywords";
      hasAnyCommentAutomation ||= automation.trigger === "any_comment";
    }
    return hasActiveAutomation
      ? { channel, requiresCommentText, hasAnyCommentAutomation }
      : null;
  },
});

export const processMessengerComment = internalAction({
  args: {
    pageId: v.string(),
    externalCommentId: v.string(),
    authorAddress: v.string(),
    authorName: v.optional(v.string()),
    text: v.optional(v.string()),
    timestampMs: v.number(),
  },
  handler: async (ctx, args) => {
    const context = await ctx.runQuery(
      internal.commentAutomationIngest.internalGetMessengerCommentContext,
      { pageId: args.pageId },
    );
    if (context === null) {
      console.log("[comment-to-inbox] skipped:no-active-automation", {
        pageId: args.pageId,
        externalCommentId: args.externalCommentId,
      });
      return;
    }

    let text = args.text;
    let authorAddress = args.authorAddress;
    let authorName = args.authorName;
    if (text === undefined && context.requiresCommentText) {
      try {
        const comment = await getMessengerComment(
          context.channel,
          args.externalCommentId,
        );
        text = comment.message;
        authorAddress = comment.authorId ?? authorAddress;
        authorName = comment.authorName ?? authorName;
      } catch (error) {
        if (!context.hasAnyCommentAutomation) throw error;
        console.error("[comment-to-inbox] comment-fetch-failed", {
          pageId: args.pageId,
          externalCommentId: args.externalCommentId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    await ctx.runMutation(internal.commentAutomationIngest.ingestComment, {
      channelId: context.channel._id,
      externalCommentId: args.externalCommentId,
      authorAddress,
      authorName,
      text: text ?? "",
      timestampMs: args.timestampMs,
    });
  },
});

export const ingestComment = internalMutation({
  args: {
    channelId: v.id("channels"),
    externalCommentId: v.string(),
    authorAddress: v.string(),
    authorName: v.optional(v.string()),
    text: v.string(),
    timestampMs: v.number(),
  },
  handler: async (ctx, args) => {
    const channel = await ctx.db.get(args.channelId);
    if (
      channel === null ||
      (channel.service !== "messenger" && channel.service !== "instagram") ||
      channel.status !== "connected"
    ) {
      return;
    }

    const existingDelivery = await ctx.db
      .query("commentAutomationDeliveries")
      .withIndex("by_externalCommentId", (q) =>
        q.eq("externalCommentId", args.externalCommentId),
      )
      .first();
    if (existingDelivery !== null) return;

    const pages = await ctx.db
      .query("commentAutomationPages")
      .withIndex("by_channelId", (q) => q.eq("channelId", channel._id))
      .take(100);
    const matches: Doc<"commentAutomations">[] = [];
    for (const page of pages) {
      if (page.subscriptionStatus !== "subscribed") continue;
      const automation = await ctx.db.get(page.automationId);
      if (
        automation?.status !== "active" ||
        !matchesCommentAutomation({
          trigger: automation.trigger,
          keywords: automation.keywords,
          commentText: args.text,
        })
      ) {
        continue;
      }
      matches.push(automation);
    }
    const automation = matches.sort((a, b) => {
      if (a.trigger !== b.trigger) return a.trigger === "keywords" ? -1 : 1;
      return a.createdAt - b.createdAt;
    })[0];
    if (automation === undefined) {
      console.log("[comment-to-inbox] skipped:no-match", {
        channelId: channel._id,
        externalCommentId: args.externalCommentId,
      });
      return;
    }

    const ingestResult = await ingestChannelMessage(ctx, {
      channelId: channel._id,
      externalId: `comment:${args.externalCommentId}`,
      contactAddress: args.authorAddress,
      contactName: args.authorName,
      direction: "incoming",
      content: args.text,
      contentType: "text",
      timestampMs: args.timestampMs,
      isHistorical: true,
    });
    const conversation = await ctx.db.get(ingestResult.conversationId);
    if (conversation?.customerId === undefined) {
      throw new Error("Comment customer was not persisted");
    }

    const now = Date.now();
    const deliveryId = await ctx.db.insert("commentAutomationDeliveries", {
      automationId: automation._id,
      channelId: channel._id,
      externalCommentId: args.externalCommentId,
      contactAddress: args.authorAddress,
      commentText: args.text,
      commentCreatedAt: args.timestampMs,
      conversationId: conversation._id,
      customerId: conversation.customerId,
      privateStatus: "pending",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.scheduler.runAfter(
      0,
      internal.commentAutomationDelivery.sendDelivery,
      { deliveryId },
    );
    console.log("[comment-to-inbox] queued", {
      channelId: channel._id,
      externalCommentId: args.externalCommentId,
      automationId: automation._id,
    });
  },
});
