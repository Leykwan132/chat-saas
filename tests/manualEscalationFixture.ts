import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";
import { integrationTestModules } from "./integrationModules";
import { createPersonalTeamForUser } from "../convex/teamHelpers";
import { upsertInboxConversationSummary } from "../convex/inboxConversationSummary";

export async function manualEscalationFixture(personal = false) {
  const t = convexTest(schema, integrationTestModules);
  const ids = await t.run(async (ctx) => {
    const now = Date.now();
    const orgId = personal ? "" : "org";
    const userId = await ctx.db.insert("users", {
      workosUserId: "teammate",
      email: "teammate@example.com",
      createdAt: now,
      updatedAt: now,
    });
    if (!personal) await createPersonalTeamForUser(ctx, userId);
    const teamId = await ctx.db.insert("teams", {
      name: "Inbox",
      memberPermissions: ["chats:read", "chats:assign"],
      type: personal ? "personal" : "organizational",
      ownerId: userId,
      ...(personal ? {} : { workosOrgId: orgId }),
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("teamMemberships", {
      userId,
      teamId,
      role: "member",
      createdAt: now,
    });
    await ctx.db.patch(userId, { activeTeamId: teamId });
    const agentId = await ctx.db.insert("agents", {
      name: "Support",
      provider: "openrouter",
      model: "test",
      systemPrompt: "test",
      templateKey: "blank",
      fileSize: 0,
      userId: "teammate",
      orgId,
      createdAt: now,
      updatedAt: now,
    });
    const channelId = await ctx.db.insert("channels", {
      conversationCount: 1,
      orgId,
      service: "web",
      status: "connected",
      connectedByUserId: "teammate",
      createdAt: now,
      updatedAt: now,
    });
    const conversationId = await ctx.db.insert("conversations", {
      orgId,
      userId: "teammate",
      service: "web",
      orgAddress: "web",
      contactAddress: "visitor",
      status: "open",
      assignedAgentId: agentId,
      assignedUserId: "teammate",
      assignToAiAgent: true,
      channelId,
      threadId: "thread",
      lastMessageAt: now,
      unreadCount: 3,
      createdAt: now,
      updatedAt: now,
    });
    const messageId = await ctx.db.insert("messages", {
      orgId,
      conversationId,
      service: "web",
      orgAddress: "web",
      contactAddress: "visitor",
      direction: "incoming",
      contentType: "text",
      content: "Hello",
      status: "sent",
      createdAt: now,
    });
    await upsertInboxConversationSummary(ctx, conversationId);
    return { conversationId, agentId, teamId, messageId, now };
  });
  const authed = t.withIdentity({ subject: "teammate", name: "Team Member" });
  const escalate = () =>
    authed.mutation(api.inboxManualEscalation.escalate, {
      conversationId: ids.conversationId,
    });
  const conversation = () => t.run((ctx) => ctx.db.get(ids.conversationId));
  return { t, ...ids, authed, escalate, conversation };
}
