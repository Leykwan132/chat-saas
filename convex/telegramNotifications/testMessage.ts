import { v } from "convex/values";
import { action, internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { assertManageableAgent } from "../agentAccess";
import { requireNotificationBotToken } from "./config";
import { telegramNotificationKindValidator } from "./kinds";
import { TelegramDeliveryError, sendTelegramMessage } from "./telegramApi";
import { formatEventTestPreview } from "./testPreview";

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

export const reserveEventPreview = internalMutation({
  args: { agentId: v.id("agents") },
  returns: v.array(v.object({
    recipientId: v.id("telegramNotificationRecipients"),
    chatId: v.string(),
    agentName: v.string(),
  })),
  handler: async (ctx, args) => {
    const { agent } = await assertManageableAgent(ctx, args.agentId);
    const subscriptions = await ctx.db
      .query("agentTelegramNotificationSubscriptions")
      .withIndex("by_agentId_and_status", (q) => q.eq("agentId", args.agentId).eq("status", "enabled"))
      .take(5);
    const recipients: Array<{
      recipientId: typeof subscriptions[number]["recipientId"];
      chatId: string;
      agentName: string;
    }> = [];
    for (const subscription of subscriptions) {
      const recipient = await ctx.db.get(subscription.recipientId);
      if (recipient?.status === "verified" && recipient.telegramChatId) {
        recipients.push({
          recipientId: recipient._id,
          chatId: recipient.telegramChatId,
          agentName: agent.name,
        });
      }
    }
    if (recipients.length === 0) {
      throw new Error("Add and verify a Telegram recipient before sending a test");
    }
    return recipients;
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

export const sendEventPreview = action({
  args: { agentId: v.id("agents"), kind: telegramNotificationKindValidator },
  returns: v.object({ sent: v.number() }),
  handler: async (ctx, args) => {
    const recipients = await ctx.runMutation(
      internal.telegramNotifications.testMessage.reserveEventPreview,
      { agentId: args.agentId },
    );
    const text = formatEventTestPreview(args.kind, recipients[0].agentName);
    let sent = 0;
    for (const recipient of recipients) {
      try {
        await sendTelegramMessage(requireNotificationBotToken(process.env), {
          chatId: recipient.chatId,
          text,
        });
        sent += 1;
      } catch (error) {
        if (error instanceof TelegramDeliveryError && (error.kind === "blocked" || error.kind === "unavailable")) {
          await ctx.runMutation(internal.telegramNotifications.testMessage.markRecipientBlocked, {
            recipientId: recipient.recipientId,
          });
          continue;
        }
        throw error;
      }
    }
    return { sent };
  },
});
