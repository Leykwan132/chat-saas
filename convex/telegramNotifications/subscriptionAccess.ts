import type { MutationCtx } from "../_generated/server";

export function subscriptionState(
  subscriptionStatus: "enabled" | "disabled",
  recipientStatus: "pending" | "verified" | "blocked",
) {
  if (subscriptionStatus === "disabled") return "disabled" as const;
  if (recipientStatus === "blocked") return "blocked" as const;
  if (recipientStatus === "verified") return "connected" as const;
  return "pending" as const;
}

export async function deleteSubscriptionsForAgent(
  ctx: MutationCtx,
  agentId: string,
): Promise<void> {
  const subscriptions = await ctx.db
    .query("agentTelegramNotificationSubscriptions")
    .withIndex("by_agentId", (q) => q.eq("agentId", agentId as never))
    .take(5);

  for (const subscription of subscriptions) {
    await ctx.db.delete(subscription._id);
  }
}
