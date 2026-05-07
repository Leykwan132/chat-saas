import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
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
    cfItemId: v.optional(v.string()),
    parentUrl: v.optional(v.string()),
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
