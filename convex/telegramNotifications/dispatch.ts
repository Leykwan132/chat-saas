import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { telegramNotificationWorkpool } from "./pool";

export async function enqueueTelegramAgentNotification(
  ctx: MutationCtx,
  agentId: Id<"agents">,
  text: string,
): Promise<number> {
  const subscriptions = await ctx.db
    .query("agentTelegramNotificationSubscriptions")
    .withIndex("by_agentId_and_status", (q) => q.eq("agentId", agentId).eq("status", "enabled"))
    .take(5);
  for (const subscription of subscriptions) {
    await telegramNotificationWorkpool.enqueueAction(
      ctx,
      internal.telegramNotifications.worker.sendNotification,
      { subscriptionId: subscription._id, text },
    );
  }
  return subscriptions.length;
}
