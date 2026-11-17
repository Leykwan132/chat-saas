import { defineTable } from "convex/server";
import { v } from "convex/values";

export const integrationTables = {
  integrationConnections: defineTable({
    issuer: v.string(),
    subject: v.string(),
    orgId: v.string(),
    consentId: v.string(),
    clientId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("revoked"),
    ),
    capability: v.literal("conversations:read"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_issuer_and_consentId", ["issuer", "consentId"])
    .index("by_subject", ["subject"]),
  integrationAudit: defineTable({
    consentId: v.string(),
    orgId: v.string(),
    operation: v.string(),
    outcome: v.string(),
    createdAt: v.number(),
    requestId: v.optional(v.string()),
    durationMs: v.optional(v.number()),
    resultCount: v.optional(v.number()),
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_consentId_and_createdAt", ["consentId", "createdAt"]),
};

export const principalValidator = v.object({
  issuer: v.string(),
  subject: v.string(),
  orgId: v.string(),
  consentId: v.string(),
  clientId: v.string(),
  grantedScopes: v.array(v.string()),
});

export const operationValidator = v.union(
  v.object({ operation: v.literal("get_agent_snapshot"), agentId: v.string() }),
  v.object({
    operation: v.literal("get_connection_context"),
    agentLimit: v.number(),
    agentCursor: v.optional(v.union(v.string(), v.null())),
  }),
  v.object({
    operation: v.literal("search_conversations"),
    agentId: v.string(),
    query: v.string(),
    limit: v.number(),
    cursor: v.optional(v.union(v.string(), v.null())),
  }),
  v.object({
    operation: v.literal("get_conversation"),
    conversationId: v.string(),
    limit: v.number(),
    cursor: v.optional(v.union(v.string(), v.null())),
  }),
);
