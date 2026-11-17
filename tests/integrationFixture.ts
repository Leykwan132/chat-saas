import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { internal } from "../convex/_generated/api";
import agentTest from "@convex-dev/agent/test";
import { upsertInboxConversationSummary } from "../convex/inboxConversationSummary";
import { upsertInboxChatSearchDocument } from "../convex/inboxSearchProjection";
import { integrationTestModules as modules } from "./integrationModules";

export const principal = {
  issuer: "https://auth.example",
  subject: "user_test",
  orgId: "org_test",
  consentId: "consent_test",
  clientId: "client_test",
  grantedScopes: ["openid"],
};
export async function fixture() {
  const t = convexTest(schema, modules);
  agentTest.register(t);
  const ids = await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      workosUserId: principal.subject,
      email: "test@example.com",
      createdAt: now,
      updatedAt: now,
    });
    const teamId = await ctx.db.insert("teams", {
      name: "Test",
      type: "organizational",
      workosOrgId: principal.orgId,
      createdAt: now,
      updatedAt: now,
    });
    const memberId = await ctx.db.insert("teamMemberships", {
      userId,
      teamId,
      role: "member",
      createdAt: now,
    });
    const baseAgent = {
      name: "Support",
      provider: "openrouter" as const,
      model: "test",
      systemPrompt: "Secret system prompt",
      templateKey: "blank" as const,
      fileSize: 0,
      userId: principal.subject,
      createdAt: now,
      updatedAt: now,
    };
    const agentId = await ctx.db.insert("agents", {
      ...baseAgent,
      orgId: principal.orgId,
    });
    const foreignAgentId = await ctx.db.insert("agents", {
      ...baseAgent,
      orgId: "org_foreign",
    });
    const channelId = await ctx.db.insert("channels", {
      orgId: principal.orgId,
      service: "whatsapp",
      phoneNumberId: "test",
      status: "connected",
      connectedByUserId: principal.subject,
      conversationCount: 1,
      createdAt: now,
      updatedAt: now,
    });
    const conversationId = await ctx.db.insert("conversations", {
      orgId: principal.orgId,
      userId: principal.subject,
      channelId,
      service: "whatsapp",
      orgAddress: "private",
      contactAddress: "private",
      contactName: "Refund customer",
      status: "open",
      assignedAgentId: agentId,
      assignToAiAgent: true,
      threadId: "thread",
      lastMessageAt: now,
      lastMessagePreview: "Refund request",
      unreadCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    await upsertInboxConversationSummary(ctx, conversationId);
    await upsertInboxChatSearchDocument(ctx, conversationId);
    return {
      teamId,
      memberId,
      userId,
      agentId,
      foreignAgentId,
      conversationId,
      channelId,
    };
  });
  const connectionId = await t.mutation(
    internal.integrations.connections.ensurePendingConnection,
    { principal },
  );
  const approve = () =>
    t.mutation(internal.integrations.connections.approvePilotConnection, {
      connectionId,
      expectedIssuer: principal.issuer,
      expectedSubject: principal.subject,
      expectedOrgId: principal.orgId,
      expectedClientId: principal.clientId,
    });
  return { t, ids, connectionId, approve };
}
