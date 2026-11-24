import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import { deliveryAccess } from "./access";
import { telegramNotificationKindValidator } from "../telegramNotifications/kinds";

export const get = internalQuery({
  args: {
    deliveryId: v.id("pushDeliveries"),
    kind: telegramNotificationKindValidator,
  },
  handler: async (ctx, args) => {
    const delivery = await ctx.db.get(args.deliveryId);
    if (
      !delivery ||
      delivery.status === "sent" ||
      delivery.status === "skipped"
    )
      return null;
    const subscription = await ctx.db.get(delivery.subscriptionId);
    if (!subscription) return null;
    const device = await ctx.db.get(subscription.deviceId);
    if (!device || device.vapidPublicKey !== process.env.WEB_PUSH_PUBLIC_KEY)
      return null;
    const branding = await deliveryAccess(ctx, device, subscription, args.kind);
    if (!branding) return null;
    return {
      deviceId: device._id,
      endpoint: device.endpoint,
      origin: device.origin,
      keys: { p256dh: device.p256dh, auth: device.auth },
      branding,
    };
  },
});

export const record = internalMutation({
  args: {
    deliveryId: v.id("pushDeliveries"),
    status: v.union(
      v.literal("sent"),
      v.literal("failed"),
      v.literal("skipped"),
    ),
    statusCode: v.optional(v.number()),
    expiredDeviceId: v.optional(v.id("pushDevices")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (args.expiredDeviceId) {
      const device = await ctx.db.get(args.expiredDeviceId);
      if (device) {
        const subscriptions = await ctx.db
          .query("pushAgentSubscriptions")
          .withIndex("by_deviceId", (q) => q.eq("deviceId", device._id))
          .collect();
        for (const subscription of subscriptions)
          await ctx.db.delete(subscription._id);
        await ctx.db.delete(device._id);
      }
    }
    const delivery = await ctx.db.get(args.deliveryId);
    if (delivery && delivery.status !== "sent")
      await ctx.db.patch(args.deliveryId, {
        status: args.status,
        statusCode: args.statusCode,
        updatedAt: Date.now(),
      });
    return null;
  },
});

export const expire = internalMutation({
  args: { deliveryId: v.id("pushDeliveries") },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (await ctx.db.get(args.deliveryId)) await ctx.db.delete(args.deliveryId);
    return null;
  },
});
