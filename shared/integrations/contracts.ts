import { z } from "zod";
import { snapshotInput, snapshotSchema } from "./snapshot";

const identifier = z.string().min(1).max(200);
const cursor = z.string().min(1).max(8000).nullable().optional();
export const principalSchema = z.strictObject({
  issuer: z.url(),
  subject: identifier,
  orgId: identifier,
  consentId: identifier,
  clientId: identifier,
  grantedScopes: z.array(z.string().max(100)).max(50),
});
export const contextInput = z.strictObject({
  agentLimit: z.number().int().min(1).max(25).default(10),
  agentCursor: cursor,
});
export const searchInput = z.strictObject({
  agentId: identifier,
  query: z.string().trim().min(1).max(200),
  limit: z.number().int().min(1).max(25).default(10),
  cursor,
});
export const conversationInput = z.strictObject({
  conversationId: identifier,
  limit: z.number().int().min(1).max(50).default(50),
  cursor,
});
export const operationSchema = z.discriminatedUnion("operation", [
  snapshotInput.extend({ operation: z.literal("get_agent_snapshot") }),
  contextInput.extend({ operation: z.literal("get_connection_context") }),
  searchInput.extend({ operation: z.literal("search_conversations") }),
  conversationInput.extend({ operation: z.literal("get_conversation") }),
]);
export const integrationRequestSchema = z.strictObject({
  principal: principalSchema,
  operation: operationSchema,
});
const resultBase = z.strictObject({
  nextCursor: z.string().nullable(),
  workspace: z.strictObject({ id: identifier, name: z.string() }),
});
export const summaryItemSchema = z.strictObject({
  conversationId: identifier,
  contactName: z.string().max(200),
  preview: z.string().max(400),
  status: z.string(),
  lastMessageAt: z.number(),
  escalated: z.boolean(),
});
export const integrationResultSchema = z.discriminatedUnion("operation", [
  resultBase.extend({
    operation: z.literal("get_agent_snapshot"),
    snapshot: snapshotSchema,
    items: z
      .array(summaryItemSchema.extend({ service: z.string().max(40) }))
      .max(5),
  }),
  resultBase.extend({
    operation: z.literal("get_connection_context"),
    items: z
      .array(
        z.strictObject({
          agentId: identifier,
          name: z.string().max(200),
          capability: z.literal("conversations:read"),
        }),
      )
      .max(25),
  }),
  resultBase.extend({
    operation: z.literal("search_conversations"),
    items: z.array(summaryItemSchema).max(25),
  }),
  resultBase.extend({
    operation: z.literal("get_conversation"),
    items: z
      .array(
        z.strictObject({
          id: identifier,
          sender: z.enum(["user", "assistant"]),
          timestamp: z.number(),
          text: z.string().max(400),
          truncated: z.boolean(),
          hasNonTextContent: z.boolean(),
        }),
      )
      .max(50),
  }),
]);
export type ConversationSummaryItem = z.infer<typeof summaryItemSchema>;
export type VerifiedMcpPrincipal = z.infer<typeof principalSchema>;
export type IntegrationOperation = z.infer<typeof operationSchema>;
export type IntegrationResult = z.infer<typeof integrationResultSchema>;
export const INTEGRATION_PATH = "/integrations/mcp/read";
export const REQUEST_LIMIT = 20 * 1024;
export const RESPONSE_LIMIT = 128 * 1024;
