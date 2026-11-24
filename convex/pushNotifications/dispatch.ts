import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { telegramNotificationWorkpool } from "../telegramNotifications/pool";
import { pushEventValidator, type PushEvent } from "./payload";

export async function queuePushDelivery(
  ctx: MutationCtx,
  subscriptionId: Id<"pushAgentSubscriptions">,
  event: PushEvent,
) {
  const existing = await ctx.db
    .query("pushDeliveries")
    .withIndex("by_subscriptionId_and_eventKey", (q) =>
      q.eq("subscriptionId", subscriptionId).eq("eventKey", event.eventKey),
    )
    .unique();
  if (existing) return;
  const now = Date.now();
  const deliveryId = await ctx.db.insert("pushDeliveries", {
    subscriptionId,
    eventKey: event.eventKey,
    status: "queued",
    createdAt: now,
    updatedAt: now,
  });
  await telegramNotificationWorkpool.enqueueAction(
    ctx,
    internal.pushNotifications.send.deliver,
    { deliveryId, event },
    {
      retry: { maxAttempts: 5, initialBackoffMs: 2000, base: 2 },
    },
  );
  await ctx.scheduler.runAfter(
    7 * 24 * 60 * 60 * 1000,
    internal.pushNotifications.delivery.expire,
    { deliveryId },
  );
}

export async function dispatchPushEvent(
  ctx: MutationCtx,
  agentId: Id<"agents">,
  event: PushEvent,
  cursor: string | null = null,
) {
  const page = await ctx.db
    .query("pushAgentSubscriptions")
    .withIndex("by_agentId", (q) => q.eq("agentId", agentId))
    .paginate({ numItems: 64, cursor });
  for (const subscription of page.page) {
    if (subscription.enabled && subscription.kinds.includes(event.kind))
      await queuePushDelivery(ctx, subscription._id, event);
  }
  if (!page.isDone)
    await ctx.scheduler.runAfter(
      0,
      internal.pushNotifications.dispatch.continueDispatch,
      {
        agentId,
        event,
        cursor: page.continueCursor,
      },
    );
}

export const continueDispatch = internalMutation({
  args: {
    agentId: v.id("agents"),
    event: pushEventValidator,
    cursor: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await dispatchPushEvent(ctx, args.agentId, args.event, args.cursor);
    return null;
  },
});
