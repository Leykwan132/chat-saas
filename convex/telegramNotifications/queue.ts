import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export const TELEGRAM_CHAT_MESSAGE_DELAY_MS = 1_000;

export async function reserveTelegramMessage(
  ctx: MutationCtx,
  subscriptionId: Id<"agentTelegramNotificationSubscriptions">,
) {
  const subscription = await ctx.db.get(subscriptionId);
  if (!subscription || subscription.status !== "enabled") return null;
  const recipient = await ctx.db.get(subscription.recipientId);
  if (recipient?.status !== "verified" || !recipient.telegramChatId) return null;

  const now = Date.now();
  const scheduledFor = Math.max(now, recipient.nextTelegramMessageAt ?? now);
  await ctx.db.patch(recipient._id, {
    nextTelegramMessageAt: scheduledFor + TELEGRAM_CHAT_MESSAGE_DELAY_MS,
    updatedAt: now,
  });
  return { recipient, scheduledFor };
}
