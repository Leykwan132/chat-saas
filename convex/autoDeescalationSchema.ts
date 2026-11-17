import { defineTable } from "convex/server";
import { v } from "convex/values";

export const autoDeescalationConfigValidator = v.object({
  enabled: v.boolean(),
  inactivityMinutes: v.number(),
  keywords: v.array(v.string()),
  revision: v.number(),
  activationRevision: v.number(),
});

export const autoDeescalationTimersTable = defineTable({
  conversationId: v.id("conversations"),
  agentId: v.id("agents"),
  assignedUserId: v.optional(v.string()),
  escalatedAt: v.number(),
  directTakeover: v.optional(v.boolean()),
  sourceMessageId: v.optional(v.id("messages")),
  lastHumanReplyAt: v.number(),
  dueAt: v.number(),
  revision: v.number(),
  configRevision: v.number(),
  scheduledJobId: v.optional(v.id("_scheduled_functions")),
}).index("by_conversationId", ["conversationId"]);
