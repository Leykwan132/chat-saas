import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { telegramNotificationKindsValidator } from "../telegramNotifications/kinds";
import { allowedKinds, subscriptionAccess } from "./access";
import { validatePushEndpoint, validatePushKeys } from "./validation";

export const getForAgent = query({
  args: {
    agentId: v.id("agents"),
    origin: v.string(),
    endpoint: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { auth } = await subscriptionAccess(ctx, args.agentId, args.origin);
    const configured = Boolean(
      process.env.WEB_PUSH_PUBLIC_KEY &&
      process.env.WEB_PUSH_PRIVATE_KEY &&
      process.env.WEB_PUSH_SUBJECT,
    );
    const device = args.endpoint
      ? await ctx.db
          .query("pushDevices")
          .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint!))
          .unique()
      : null;
    const owned =
      device?.ownerTokenIdentifier === auth.identity.tokenIdentifier &&
      device.origin === args.origin;
    const subscription = owned
      ? await ctx.db
          .query("pushAgentSubscriptions")
          .withIndex("by_deviceId_and_agentId", (q) =>
            q.eq("deviceId", device._id).eq("agentId", args.agentId),
          )
          .unique()
      : null;
    const lastDelivery = subscription
      ? await ctx.db
          .query("pushDeliveries")
          .withIndex("by_subscriptionId_and_createdAt", (q) =>
            q.eq("subscriptionId", subscription._id),
          )
          .order("desc")
          .first()
      : null;
    return {
      lastDelivery: lastDelivery
        ? { status: lastDelivery.status, statusCode: lastDelivery.statusCode }
        : null,
      needsNewSubscription: Boolean(device && !owned),
      configured,
      publicKey: configured ? process.env.WEB_PUSH_PUBLIC_KEY! : null,
      subscription: subscription
        ? { enabled: subscription.enabled, kinds: subscription.kinds }
        : null,
      personal: !auth.orgId || auth.orgId === "personal",
      permissions: auth.permissions,
    };
  },
});

export const subscribe = mutation({
  args: {
    agentId: v.id("agents"),
    origin: v.string(),
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    kinds: telegramNotificationKindsValidator,
  },
  returns: v.id("pushAgentSubscriptions"),
  handler: async (ctx, args) => {
    const { auth, partnerOrganizationId } = await subscriptionAccess(
      ctx,
      args.agentId,
      args.origin,
    );
    const publicKey = process.env.WEB_PUSH_PUBLIC_KEY;
    if (
      !publicKey ||
      !process.env.WEB_PUSH_PRIVATE_KEY ||
      !process.env.WEB_PUSH_SUBJECT
    )
      throw new Error("Push delivery is not configured");
    validatePushEndpoint(args.endpoint);
    validatePushKeys(args.p256dh, args.auth);
    const kinds = allowedKinds(
      auth.permissions,
      !auth.orgId || auth.orgId === "personal",
      args.kinds,
    );
    let device = await ctx.db
      .query("pushDevices")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .unique();
    if (
      device &&
      (device.ownerTokenIdentifier !== auth.identity.tokenIdentifier ||
        device.origin !== args.origin)
    ) {
      throw new Error("This device subscription belongs to another session");
    }
    const now = Date.now();
    if (!device) {
      const devices = await ctx.db
        .query("pushDevices")
        .withIndex("by_userId_and_origin", (q) =>
          q.eq("userId", auth.userDbId).eq("origin", args.origin),
        )
        .take(20);
      if (devices.length >= 20)
        throw new Error(
          "Device limit reached. Disable an existing device first.",
        );
      const id = await ctx.db.insert("pushDevices", {
        ownerTokenIdentifier: auth.identity.tokenIdentifier,
        userId: auth.userDbId,
        origin: args.origin,
        endpoint: args.endpoint,
        p256dh: args.p256dh,
        auth: args.auth,
        vapidPublicKey: publicKey,
        createdAt: now,
        updatedAt: now,
      });
      device = (await ctx.db.get(id))!;
    } else {
      await ctx.db.patch(device._id, {
        p256dh: args.p256dh,
        auth: args.auth,
        vapidPublicKey: publicKey,
        updatedAt: now,
      });
    }
    const existing = await ctx.db
      .query("pushAgentSubscriptions")
      .withIndex("by_deviceId_and_agentId", (q) =>
        q.eq("deviceId", device._id).eq("agentId", args.agentId),
      )
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        enabled: true,
        kinds,
        teamId: auth.activeTeamId,
        partnerOrganizationId,
      });
      return existing._id;
    }
    const subscriptions = await ctx.db
      .query("pushAgentSubscriptions")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", device._id))
      .take(20);
    if (subscriptions.length >= 20)
      throw new Error("This device has reached its agent notification limit");
    return await ctx.db.insert("pushAgentSubscriptions", {
      deviceId: device._id,
      agentId: args.agentId,
      teamId: auth.activeTeamId,
      partnerOrganizationId,
      kinds,
      enabled: true,
    });
  },
});

export const setPreferences = mutation({
  args: {
    agentId: v.id("agents"),
    origin: v.string(),
    endpoint: v.string(),
    kinds: telegramNotificationKindsValidator,
    enabled: v.boolean(),
  },
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
    const subscription = await ctx.db
      .query("pushAgentSubscriptions")
      .withIndex("by_deviceId_and_agentId", (q) =>
        q.eq("deviceId", device._id).eq("agentId", args.agentId),
      )
      .unique();
    if (!subscription) throw new Error("Agent notification settings not found");
    const kinds = allowedKinds(
      auth.permissions,
      !auth.orgId || auth.orgId === "personal",
      args.kinds,
    );
    await ctx.db.patch(subscription._id, { kinds, enabled: args.enabled });
    return null;
  },
});

export const removeDevice = mutation({
  args: { endpoint: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const device = await ctx.db
      .query("pushDevices")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .unique();
    if (!device) return null;
    if (device.ownerTokenIdentifier !== identity.tokenIdentifier)
      throw new Error("Device not found");
    const subscriptions = await ctx.db
      .query("pushAgentSubscriptions")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", device._id))
      .collect();
    for (const subscription of subscriptions)
      await ctx.db.delete(subscription._id);
    await ctx.db.delete(device._id);
    return null;
  },
});
