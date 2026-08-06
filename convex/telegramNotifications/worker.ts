import { v } from "convex/values";
import { internalAction, internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { requireNotificationBotToken } from "./config";
import { telegramNotificationWorkpool } from "./pool";
import { TELEGRAM_CHAT_MESSAGE_DELAY_MS } from "./queue";
import { TelegramDeliveryError, sendTelegramMessage } from "./telegramApi";

export const getDelivery = internalMutation({
  args: { subscriptionId: v.id("agentTelegramNotificationSubscriptions") },
  returns: v.union(
    v.null(),
    v.object({ recipientId: v.id("telegramNotificationRecipients"), chatId: v.string() }),
    v.object({ retryAt: v.number() }),
  ),
  handler: async (ctx, args) => {
    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription || subscription.status !== "enabled") return null;
    const recipient = await ctx.db.get(subscription.recipientId);
    if (recipient?.status !== "verified" || !recipient.telegramChatId) return null;
    const now = Date.now();
    if (recipient.nextTelegramMessageAvailableAt && now < recipient.nextTelegramMessageAvailableAt) {
      return { retryAt: recipient.nextTelegramMessageAvailableAt };
    }
    await ctx.db.patch(recipient._id, {
      nextTelegramMessageAvailableAt: now + TELEGRAM_CHAT_MESSAGE_DELAY_MS,
      updatedAt: now,
    });
    return { recipientId: recipient._id, chatId: recipient.telegramChatId };
  },
});

export const markRecipientBlocked = internalMutation({
  args: { recipientId: v.id("telegramNotificationRecipients") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.recipientId, { status: "blocked", updatedAt: Date.now() });
    return null;
  },
});

export const sendNotification = internalAction({
  args: { subscriptionId: v.id("agentTelegramNotificationSubscriptions"), text: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const delivery = await ctx.runMutation(internal.telegramNotifications.worker.getDelivery, {
      subscriptionId: args.subscriptionId,
    });
    if (!delivery) return null;
    if ("retryAt" in delivery) {
      await telegramNotificationWorkpool.enqueueAction(
        ctx,
        internal.telegramNotifications.worker.sendNotification,
        args,
        { runAt: delivery.retryAt },
      );
      return null;
    }
    try {
      await sendTelegramMessage(requireNotificationBotToken(process.env), {
        chatId: delivery.chatId,
        text: args.text,
      });
    } catch (error) {
      if (error instanceof TelegramDeliveryError && (error.kind === "blocked" || error.kind === "unavailable")) {
        await ctx.runMutation(internal.telegramNotifications.worker.markRecipientBlocked, {
          recipientId: delivery.recipientId,
        });
        return null;
      }
      throw error;
    }
    return null;
  },
});
