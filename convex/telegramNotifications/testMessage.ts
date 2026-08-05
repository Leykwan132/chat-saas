import { v } from "convex/values";
import { action, internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { assertManageableAgent } from "../agentAccess";
import { requireNotificationBotToken } from "./config";
import { TelegramDeliveryError, sendTelegramMessage } from "./telegramApi";

const subscriptionIdValidator = v.id("agentTelegramNotificationSubscriptions");

export const reserve = internalMutation({
  args: { subscriptionId: subscriptionIdValidator },
  returns: v.object({ recipientId: v.id("telegramNotificationRecipients"), chatId: v.string(), agentName: v.string() }),
  handler: async (ctx, args) => {
    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription) throw new Error("Telegram subscription not found");
    const { agent } = await assertManageableAgent(ctx, subscription.agentId);
    const recipient = await ctx.db.get(subscription.recipientId);
    if (subscription.status !== "enabled" || recipient?.status !== "verified" || !recipient.telegramChatId) {
      throw new Error("This Telegram recipient is not connected and enabled");
    }
    const now = Date.now();
    if (subscription.lastTestSentAt && now - subscription.lastTestSentAt < 30_000) {
      throw new Error("Please wait 30 seconds before sending another test");
    }
    await ctx.db.patch(subscription._id, { lastTestSentAt: now, updatedAt: now });
    return { recipientId: recipient._id, chatId: recipient.telegramChatId, agentName: agent.name };
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

export const send = action({
  args: { subscriptionId: subscriptionIdValidator },
  returns: v.object({ sent: v.literal(true) }),
  handler: async (ctx, args) => {
    const reservation = await ctx.runMutation(internal.telegramNotifications.testMessage.reserve, args);
    try {
      await sendTelegramMessage(requireNotificationBotToken(process.env), {
        chatId: reservation.chatId,
        text: `✅ Test notification\n\nNotifications from ${reservation.agentName} are connected and ready.`,
      });
    } catch (error) {
      if (error instanceof TelegramDeliveryError && (error.kind === "blocked" || error.kind === "unavailable")) {
        await ctx.runMutation(internal.telegramNotifications.testMessage.markRecipientBlocked, {
          recipientId: reservation.recipientId,
        });
      }
      throw error;
    }
    return { sent: true as const };
  },
});
