/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import {
  createAgentOverviewFixture as createFixture,
  insertAgentOverviewConversation as insertConversation,
  registerAgentOverviewAggregateComponents,
} from "./agentOverviewTestHelpers";
import {
  recordAiAssistedConversationFact,
  recordHumanEscalationFact,
} from "./agentOverviewAggregates";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

function createOverviewTest() {
  const t = convexTest(schema, modules);
  registerAgentOverviewAggregateComponents(t);
  return t;
}

test("counts unique AI-assisted conversations for the selected agent", async () => {
  const t = createOverviewTest();
  const { authed, agentId, now } = await createFixture(t);
  const aiConversationId = await insertConversation(t, { agentId, now });
  const assignedOnlyConversationId = await insertConversation(t, { agentId, now: now + 1 });
  const humanOnlyConversationId = await insertConversation(t, { agentId, now: now + 2 });

  await t.run(async (ctx) => {
    const baseMessage = {
      orgId: "",
      service: "whatsapp" as const,
      orgAddress: "business",
      contactAddress: "+60123456789",
      contentType: "text" as const,
      content: "Message",
    };
    await ctx.db.insert("messages", {
      ...baseMessage,
      conversationId: aiConversationId,
      direction: "outgoing",
      agentId,
      status: "sent",
      createdAt: now - 1000,
    });
    await ctx.db.insert("messages", {
      ...baseMessage,
      conversationId: aiConversationId,
      direction: "outgoing",
      agentId,
      status: "sent",
      createdAt: now - 500,
    });
    await ctx.db.insert("messages", {
      ...baseMessage,
      conversationId: humanOnlyConversationId,
      direction: "outgoing",
      authorUserId: "human-user",
      status: "sent",
      createdAt: now - 250,
    });
    await ctx.db.patch(assignedOnlyConversationId, { updatedAt: now + 1 });
  });

  const summary = await authed.query(api.agentOverview.getSummary, { agentId });

  expect(summary.conversationCount).toBe(3);
  expect(summary.aiAssistedConversationCount).toBe(1);
  expect(summary.messagesSentByAgent).toBe(2);
  expect(summary.daily.some((row) => row.aiAssistedConversations === 1 && row.aiMessages === 2)).toBe(true);
});

test("uses daily aggregate rows for AI-assisted conversations and human escalations", async () => {
  const t = createOverviewTest();
  const { authed, agentId, now } = await createFixture(t);
  const conversationId = await insertConversation(t, { agentId, now });

  await t.run(async (ctx) => {
    const conversation = await ctx.db.get(conversationId);
    if (conversation === null) {
      throw new Error("Conversation not found");
    }
    await recordAiAssistedConversationFact(ctx, {
      conversation,
      agentId,
      timestamp: now,
    });
    await recordAiAssistedConversationFact(ctx, {
      conversation,
      agentId,
      timestamp: now + 1,
    });
    await recordHumanEscalationFact(ctx, {
      conversation,
      agentId,
      timestamp: now,
    });
    await recordHumanEscalationFact(ctx, {
      conversation,
      agentId,
      timestamp: now + 1,
    });
  });

  const summary = await authed.query(api.agentOverview.getSummary, { agentId });

  expect(summary.aiAssistedConversationCount).toBe(1);
  expect(summary.escalations).toBe(2);
  expect(summary.daily.some((row) => row.aiAssistedConversations === 1 && row.escalations === 2)).toBe(true);
});
