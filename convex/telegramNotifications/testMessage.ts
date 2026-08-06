import { v } from "convex/values";
import { action, internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { assertManageableAgent } from "../agentAccess";
import { telegramNotificationKindValidator } from "./kinds";
import { telegramNotificationWorkpool } from "./pool";
import { reserveTelegramMessage } from "./queue";
import { formatEventTestPreview } from "./testPreview";

const subscriptionIdValidator = v.id("agentTelegramNotificationSubscriptions");

export const reserve = internalMutation({
  args: { subscriptionId: subscriptionIdValidator },
  returns: v.object({ agentName: v.string(), scheduledFor: v.number() }),
  handler: async (ctx, args) => {
    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription) throw new Error("Telegram subscription not found");
    const { agent } = await assertManageableAgent(ctx, subscription.agentId);
    const reservation = await reserveTelegramMessage(ctx, subscription._id);
    if (!reservation) {
      throw new Error("This Telegram recipient is not connected and enabled");
    }
    return { agentName: agent.name, scheduledFor: reservation.scheduledFor };
  },
});

export const send = action({
  args: { subscriptionId: subscriptionIdValidator },
  returns: v.object({ sent: v.literal(true) }),
  handler: async (ctx, args) => {
    const reservation = await ctx.runMutation(internal.telegramNotifications.testMessage.reserve, args);
    await telegramNotificationWorkpool.enqueueAction(
      ctx,
      internal.telegramNotifications.worker.sendNotification,
      { subscriptionId: args.subscriptionId, text: `✅ Test notification\n\nNotifications from ${reservation.agentName} are connected and ready.` },
      { runAt: reservation.scheduledFor },
    );
    return { sent: true as const };
  },
});

export const sendEventPreview = action({
  args: { subscriptionId: subscriptionIdValidator, kind: telegramNotificationKindValidator },
  returns: v.object({ sent: v.literal(true) }),
  handler: async (ctx, args) => {
    const reservation = await ctx.runMutation(internal.telegramNotifications.testMessage.reserve, {
      subscriptionId: args.subscriptionId,
    });
    await telegramNotificationWorkpool.enqueueAction(
      ctx,
      internal.telegramNotifications.worker.sendNotification,
      { subscriptionId: args.subscriptionId, text: formatEventTestPreview(args.kind, reservation.agentName) },
      { runAt: reservation.scheduledFor },
    );
    return { sent: true as const };
  },
});
