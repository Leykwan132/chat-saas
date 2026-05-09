import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    workosUserId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    profilePictureUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workosUserId", ["workosUserId"])
    .index("by_email", ["email"]),
  organizations: defineTable({
    workosOrgId: v.string(),
    name: v.string(),
    members: v.array(v.id("users")),
    admins: v.array(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_workosOrgId", ["workosOrgId"]),
  // Used for webhook idempotency. WorkOS may retry deliveries; dedupe on event.id.
  processedEvents: defineTable({
    eventId: v.string(),
    processedAt: v.number(),
  }).index("by_eventId", ["eventId"]),
  messages: defineTable({
    author: v.string(),
    text: v.string(),
  }).index("by_author", ["author"]),
  agents: defineTable({
    name: v.string(),
    provider: v.literal("google"),
    model: v.string(),
    systemPrompt: v.string(),
    templateKey: v.union(
      v.literal("blank"),
      v.literal("sales"),
      v.literal("support"),
    ),
    websiteUrls: v.optional(v.array(v.string())),
    contacts: v.optional(v.string()),
    fileSize: v.number(),
    userId: v.string(),
    orgId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_orgId", ["orgId"])
    .index("by_userId_and_orgId", ["userId", "orgId"]),
  textEntries: defineTable({
    agentId: v.id("agents"),
    title: v.string(),
    content: v.string(),
    fileSize: v.number(),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("queued"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("deleting"),
    )),
    cfItemId: v.optional(v.string()),
    userId: v.string(),
    orgId: v.string(),
    createdAt: v.number(),
  })
    .index("by_agentId", ["agentId"])
    .index("by_userId_and_orgId", ["userId", "orgId"]),
  fileEntries: defineTable({
    agentId: v.id("agents"),
    title: v.optional(v.string()),
    fileName: v.string(),
    fileSize: v.number(),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("queued"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("deleting"),
    )),
    cfItemId: v.optional(v.string()),
    userId: v.string(),
    orgId: v.string(),
    createdAt: v.number(),
  })
    .index("by_agentId", ["agentId"])
    .index("by_userId_and_orgId", ["userId", "orgId"]),
  webEntries: defineTable({
    agentId: v.id("agents"),
    url: v.string(),
    fileSize: v.number(),
    status: v.optional(v.union(
      v.literal("gettingLinks"),
      v.literal("linksObtained"),
      v.literal("gettingMarkdown"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("deleting"),
    )),
    cfItemId: v.optional(v.string()),
    parentUrl: v.optional(v.string()),
    parentId: v.optional(v.id("webEntries")),
    userId: v.string(),
    orgId: v.string(),
    createdAt: v.number(),
  })
    .index("by_agentId", ["agentId"])
    .index("by_userId_and_orgId", ["userId", "orgId"]),
  qaEntries: defineTable({
    agentId: v.id("agents"),
    question: v.string(),
    answer: v.string(),
    fileSize: v.number(),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("queued"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("deleting"),
    )),
    cfItemId: v.optional(v.string()),
    userId: v.string(),
    orgId: v.string(),
    createdAt: v.number(),
  })
    .index("by_agentId", ["agentId"])
    .index("by_userId_and_orgId", ["userId", "orgId"]),
  conversations: defineTable({
    threadId: v.string(),
    sender: v.string(),
    recipient: v.string(),
    agentId: v.id("agents"),
    userId: v.string(),
    orgId: v.string(),
    createdAt: v.number(),
  })
    .index("by_threadId", ["threadId"])
    .index("by_agentId", ["agentId"])
    .index("by_userId_and_orgId", ["userId", "orgId"]),
});
