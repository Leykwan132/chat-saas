import { defineTable } from "convex/server";
import { v } from "convex/values";

export const inboundReplyCoordinatorsTable = defineTable({
  conversationId: v.id("conversations"),
  agentId: v.id("agents"),
  channelId: v.optional(v.id("channels")),
  assignedUserId: v.optional(v.string()),
  revision: v.number(),
  latestSequence: v.number(),
  answeredSequence: v.number(),
  dueAt: v.number(),
  wakeGeneration: v.number(),
  wakeWorkId: v.optional(v.string()),
  activeRunId: v.optional(v.id("inboundReplyRuns")),
  lastError: v.optional(v.string()),
  pausedRevision: v.optional(v.number()),
}).index("by_conversationId", ["conversationId"]);

export const inboundReplyInputsTable = defineTable({
  coordinatorId: v.id("inboundReplyCoordinators"),
  sequence: v.number(),
  promptMessageId: v.string(),
  externalId: v.optional(v.string()),
  sourceMessageUpdatedAt: v.optional(v.number()),
  readiness: v.union(
    v.literal("waiting"),
    v.literal("ready"),
    v.literal("failed"),
  ),
  error: v.optional(v.string()),
  excluded: v.optional(v.boolean()),
})
  .index("by_coordinatorId_and_sequence", ["coordinatorId", "sequence"])
  .index("by_coordinatorId_and_promptMessageId", [
    "coordinatorId",
    "promptMessageId",
  ]);

export const inboundReplyRunsTable = defineTable({
  coordinatorId: v.id("inboundReplyCoordinators"),
  conversationId: v.id("conversations"),
  agentId: v.id("agents"),
  revision: v.number(),
  afterSequence: v.number(),
  throughSequence: v.number(),
  state: v.union(
    v.literal("queued"),
    v.literal("generating"),
    v.literal("delivering"),
    v.literal("delivered"),
    v.literal("superseded"),
    v.literal("cancelled"),
    v.literal("failed"),
  ),
  error: v.optional(v.string()),
  deliveryStartedAt: v.optional(v.number()),
}).index("by_coordinatorId", ["coordinatorId"]);

export const inboundReplyToolCallsTable = defineTable({
  coordinatorId: v.id("inboundReplyCoordinators"),
  afterSequence: v.number(),
  toolName: v.string(),
  inputKey: v.string(),
  state: v.union(v.literal("executing"), v.literal("completed")),
  resultJson: v.optional(v.string()),
})
  .index("by_coordinatorId_and_afterSequence_and_toolName_and_inputKey", [
    "coordinatorId",
    "afterSequence",
    "toolName",
    "inputKey",
  ])
  .index("by_coordinatorId_and_afterSequence_and_state", [
    "coordinatorId",
    "afterSequence",
    "state",
  ]);
