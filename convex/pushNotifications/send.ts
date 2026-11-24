"use node";

import webpush from "web-push";
import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { pushEventValidator } from "./payload";
import { validatePushEndpoint } from "./validation";

export const deliver = internalAction({
  args: { deliveryId: v.id("pushDeliveries"), event: pushEventValidator },
  returns: v.null(),
  handler: async (ctx, args) => {
    const delivery = await ctx.runQuery(
      internal.pushNotifications.delivery.get,
      {
        deliveryId: args.deliveryId,
        kind: args.event.kind,
      },
    );
    if (!delivery) {
      await ctx.runMutation(internal.pushNotifications.delivery.record, {
        deliveryId: args.deliveryId,
        status: "skipped",
      });
      return null;
    }
    const publicKey = process.env.WEB_PUSH_PUBLIC_KEY;
    const privateKey = process.env.WEB_PUSH_PRIVATE_KEY;
    const subject = process.env.WEB_PUSH_SUBJECT;
    if (!publicKey || !privateKey || !subject)
      throw new Error("Push delivery signing keys are not configured");
    validatePushEndpoint(delivery.endpoint);
    const url = new URL(args.event.path, delivery.origin);
    if (
      url.origin !== delivery.origin ||
      !url.pathname.startsWith("/dashboard/")
    )
      throw new Error("Invalid push destination");
    try {
      await webpush.sendNotification(
        { endpoint: delivery.endpoint, keys: delivery.keys },
        JSON.stringify({
          title: `${delivery.branding.name} · ${args.event.title}`.slice(
            0,
            160,
          ),
          body: args.event.body,
          icon: delivery.branding.icon,
          tag: args.event.eventKey,
          url: url.toString(),
        }),
        {
          vapidDetails: { subject, publicKey, privateKey },
          TTL: 3600,
          timeout: 10000,
        },
      );
      await ctx.runMutation(internal.pushNotifications.delivery.record, {
        deliveryId: args.deliveryId,
        status: "sent",
      });
    } catch (error) {
      const statusCode =
        error &&
        typeof error === "object" &&
        "statusCode" in error &&
        typeof error.statusCode === "number"
          ? error.statusCode
          : undefined;
      await ctx.runMutation(internal.pushNotifications.delivery.record, {
        deliveryId: args.deliveryId,
        status: "failed",
        statusCode,
        expiredDeviceId:
          statusCode === 404 || statusCode === 410
            ? delivery.deviceId
            : undefined,
      });
      if (!statusCode || statusCode === 429 || statusCode >= 500) throw error;
    }
    return null;
  },
});
