import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { subscriptionAccess } from "./access";
import { queuePushDelivery } from "./dispatch";

export const send = mutation({
  args: { agentId: v.id("agents"), origin: v.string(), endpoint: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { auth } = await subscriptionAccess(ctx, args.agentId, args.origin);
    const device = await ctx.db
      .query("pushDevices")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .unique();
    if (
      !device ||
      device.ownerTokenIdentifier !== auth.identity.tokenIdentifier ||
      device.origin !== args.origin
    )
      throw new Error("Device not found");
    if (device.lastTestAt && Date.now() - device.lastTestAt < 15000)
      throw new Error("Wait 15 seconds before sending another test");
    const subscription = await ctx.db
      .query("pushAgentSubscriptions")
      .withIndex("by_deviceId_and_agentId", (q) =>
        q.eq("deviceId", device._id).eq("agentId", args.agentId),
      )
      .unique();
    if (!subscription?.enabled || !subscription.kinds.length)
      throw new Error("Enable at least one notification type first");
    const now = Date.now();
    await ctx.db.patch(device._id, { lastTestAt: now });
    await queuePushDelivery(ctx, subscription._id, {
      kind: subscription.kinds[0],
      eventKey: `test:${device._id}:${now}`,
      title: "Test notification",
      body: "Push notifications are connected on this device.",
      path: `/dashboard/${args.agentId}/notifications`,
    });
    return null;
  },
});
