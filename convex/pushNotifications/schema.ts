import { defineTable } from "convex/server";
import { v } from "convex/values";
import { telegramNotificationKindsValidator } from "../telegramNotifications/kinds";

export const pushNotificationTables = {
  pushDevices: defineTable({
    ownerTokenIdentifier: v.string(),
    userId: v.id("users"),
    origin: v.string(),
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    vapidPublicKey: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastTestAt: v.optional(v.number()),
  })
    .index("by_endpoint", ["endpoint"])
    .index("by_userId_and_origin", ["userId", "origin"]),
  pushAgentSubscriptions: defineTable({
    deviceId: v.id("pushDevices"),
    agentId: v.id("agents"),
    teamId: v.id("teams"),
    partnerOrganizationId: v.optional(v.id("whiteLabelPartnerOrganizations")),
    kinds: telegramNotificationKindsValidator,
    enabled: v.boolean(),
  })
    .index("by_agentId", ["agentId"])
    .index("by_teamId", ["teamId"])
    .index("by_deviceId", ["deviceId"])
    .index("by_deviceId_and_agentId", ["deviceId", "agentId"]),
  pushDeliveries: defineTable({
    subscriptionId: v.id("pushAgentSubscriptions"),
    eventKey: v.string(),
    status: v.union(
      v.literal("queued"),
      v.literal("sent"),
      v.literal("failed"),
      v.literal("skipped"),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
    statusCode: v.optional(v.number()),
  })
    .index("by_subscriptionId_and_eventKey", ["subscriptionId", "eventKey"])
    .index("by_subscriptionId_and_createdAt", ["subscriptionId", "createdAt"]),
};
