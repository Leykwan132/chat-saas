import { v } from "convex/values";
import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  sendInstagramCommentPrivateReply,
  sendInstagramCommentPublicReply,
  sendMessengerCommentPrivateReply,
  sendMessengerCommentPublicReply,
} from "./commentAutomationMeta";
import { ingestChannelMessage } from "./chat/threads";

export const claimDelivery = internalMutation({
  args: { deliveryId: v.id("commentAutomationDeliveries") },
  handler: async (ctx, args) => {
    const delivery = await ctx.db.get(args.deliveryId);
    if (delivery?.privateStatus !== "pending") return null;
    const [automation, channel, page] = await Promise.all([
      ctx.db.get(delivery.automationId),
      ctx.db.get(delivery.channelId),
      ctx.db
        .query("commentAutomationPages")
        .withIndex("by_automationId_and_channelId", (q) =>
          q
            .eq("automationId", delivery.automationId)
            .eq("channelId", delivery.channelId),
        )
        .unique(),
    ]);
    if (
      automation?.status !== "active" ||
      page?.subscriptionStatus !== "subscribed"
    ) {
      return null;
    }
    if (
      channel === null ||
      (channel.service !== "messenger" && channel.service !== "instagram") ||
      channel.status !== "connected" ||
      (channel.service === "messenger" ? !channel.pageId : !channel.igUserId) ||
      !channel.accessToken?.trim()
    ) {
      await ctx.db.patch(delivery._id, {
        privateStatus: "failed",
        privateError: "Comment channel is unavailable",
        updatedAt: Date.now(),
      });
      return null;
    }
    await ctx.db.patch(delivery._id, {
      privateStatus: "sending",
      updatedAt: Date.now(),
    });
    return {
      delivery,
      channel,
      privateMessage: automation.privateMessage,
      publicReply: automation.publicReply,
    };
  },
});

export const completePrivateDelivery = internalMutation({
  args: {
    deliveryId: v.id("commentAutomationDeliveries"),
    success: v.boolean(),
    error: v.optional(v.string()),
    externalId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const delivery = await ctx.db.get(args.deliveryId);
    if (delivery?.privateStatus !== "sending") return false;
    const now = Date.now();
    if (!args.success) {
      await ctx.db.patch(delivery._id, {
        privateStatus: "failed",
        privateError: args.error,
        updatedAt: now,
      });
      return false;
    }
    const automation = await ctx.db.get(delivery.automationId);
    if (automation === null) return false;
    const sentAt = Date.now();
    const ingestResult = await ingestChannelMessage(ctx, {
      channelId: delivery.channelId,
      externalId: args.externalId ?? `comment-automation:${delivery._id}`,
      contactAddress: delivery.contactAddress,
      contactName: delivery.contactName,
      direction: "outgoing",
      content: automation.privateMessage,
      contentType: "text",
      workflowAutomationSource: "commentAutomation",
      timestampMs: sentAt,
      outboundStatus: "sent",
    });
    const conversation = await ctx.db.get(ingestResult.conversationId);
    if (conversation?.customerId === undefined) {
      throw new Error("Automation customer was not persisted");
    }
    await ctx.db.patch(delivery._id, {
      privateStatus: "sent",
      privateError: undefined,
      sentAt,
      updatedAt: sentAt,
      conversationId: conversation._id,
      customerId: conversation.customerId,
    });
    await ctx.db.patch(automation._id, {
      sentCount: automation.sentCount + 1,
      updatedAt: sentAt,
    });
    return true;
  },
});

export const completePublicDelivery = internalMutation({
  args: {
    deliveryId: v.id("commentAutomationDeliveries"),
    success: v.boolean(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const delivery = await ctx.db.get(args.deliveryId);
    if (delivery?.privateStatus !== "sent" || delivery.publicStatus !== undefined) {
      return;
    }
    await ctx.db.patch(delivery._id, {
      publicStatus: args.success ? "sent" : "failed",
      publicError: args.error,
      updatedAt: Date.now(),
    });
  },
});

export const sendDelivery = internalAction({
  args: { deliveryId: v.id("commentAutomationDeliveries") },
  handler: async (ctx, args) => {
    const claimed = await ctx.runMutation(
      internal.commentAutomationDelivery.claimDelivery,
      args,
    );
    if (claimed === null) return;

    console.log("[comment-to-inbox] private:request", {
      deliveryId: args.deliveryId,
      accountId: claimed.channel.pageId ?? claimed.channel.igUserId,
      commentId: claimed.delivery.externalCommentId,
      text: claimed.privateMessage,
    });
    const privateResult = claimed.channel.service === "instagram"
      ? await sendInstagramCommentPrivateReply(
        claimed.channel,
        claimed.delivery.externalCommentId,
        claimed.privateMessage,
      )
      : await sendMessengerCommentPrivateReply(
        claimed.channel,
        claimed.delivery.externalCommentId,
        claimed.privateMessage,
      );
    const privateCompleted = await ctx.runMutation(
      internal.commentAutomationDelivery.completePrivateDelivery,
      {
        deliveryId: args.deliveryId,
        success: privateResult.ok,
        error: privateResult.ok ? undefined : privateResult.error,
        externalId: privateResult.ok ? privateResult.externalId : undefined,
      },
    );
    console.log("[comment-to-inbox] private:result", {
      deliveryId: args.deliveryId,
      ...privateResult,
    });
    if (!privateCompleted || !claimed.publicReply) return;

    console.log("[comment-to-inbox] public:request", {
      deliveryId: args.deliveryId,
      commentId: claimed.delivery.externalCommentId,
      text: claimed.publicReply,
    });
    const publicResult = claimed.channel.service === "instagram"
      ? await sendInstagramCommentPublicReply(
        claimed.channel,
        claimed.delivery.externalCommentId,
        claimed.publicReply,
      )
      : await sendMessengerCommentPublicReply(
        claimed.channel,
        claimed.delivery.externalCommentId,
        claimed.publicReply,
      );
    await ctx.runMutation(
      internal.commentAutomationDelivery.completePublicDelivery,
      {
        deliveryId: args.deliveryId,
        success: publicResult.ok,
        error: publicResult.ok ? undefined : publicResult.error,
      },
    );
    console.log("[comment-to-inbox] public:result", {
      deliveryId: args.deliveryId,
      ...publicResult,
    });
  },
});

export const recordCustomerResponse = internalMutation({
  args: {
    channelId: v.id("channels"),
    contactAddress: v.string(),
    timestampMs: v.number(),
  },
  handler: async (ctx, args) => {
    const unresolved = await ctx.db
      .query("commentAutomationDeliveries")
      .withIndex("by_channelId_and_contactAddress_and_respondedAt", (q) =>
        q
          .eq("channelId", args.channelId)
          .eq("contactAddress", args.contactAddress)
          .eq("respondedAt", undefined),
      )
      .take(100);
    const delivery = unresolved
      .filter((row) =>
        row.privateStatus === "sent" &&
        row.sentAt !== undefined &&
        row.sentAt <= args.timestampMs,
      )
      .sort((a, b) => a.createdAt - b.createdAt)[0];
    if (delivery === undefined) return;
    const automation = await ctx.db.get(delivery.automationId);
    if (automation === null) return;
    await ctx.db.patch(delivery._id, {
      respondedAt: args.timestampMs,
      updatedAt: Date.now(),
    });
    await ctx.db.patch(automation._id, {
      respondedCount: automation.respondedCount + 1,
      updatedAt: Date.now(),
    });
  },
});
