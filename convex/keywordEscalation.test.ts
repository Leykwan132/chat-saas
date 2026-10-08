import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "./schema";
import { internal } from "./_generated/api";

const modules = import.meta.glob("./**/*.ts");

async function fixture() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const now = Date.now();
    const agentId = await ctx.db.insert("agents", {
      name: "Keyword agent", provider: "openrouter", model: "deepseek/deepseek-v4-flash", systemPrompt: "test", templateKey: "blank", fileSize: 0, userId: "user", orgId: "org", createdAt: now, updatedAt: now,
    });
    const workflowId = await ctx.db.insert("workflows", { agentId, orgId: "org", userId: "user", name: "test", createdAt: now, updatedAt: now });
    const nodeId = await ctx.db.insert("workflowNodes", {
      workflowId, kind: "humanEscalation", title: "Human escalation", positionX: 0, positionY: 0, isReady: true, escalationKeywordsEnabled: true, escalationKeywords: ["human", "退款"], escalationMessageEnabled: true, escalationMessage: "A teammate will help.", createdAt: now, updatedAt: now,
    });
    const conversationId = await ctx.db.insert("conversations", {
      orgId: "org", service: "web", orgAddress: "web", contactAddress: "customer", status: "open", assignedAgentId: agentId, assignToAiAgent: true, threadId: "thread", tags: [], lastMessageAt: now, unreadCount: 1, createdAt: now, updatedAt: now,
    });
    const messageId = await ctx.db.insert("messages", {
      orgId: "org", conversationId, service: "web", orgAddress: "web", contactAddress: "customer", direction: "incoming", contentType: "text", content: "I want a HUMAN please", agentMessageId: "source", createdAt: now,
    });
    return { nodeId, conversationId, messageId };
  });
  return { t, ...ids };
}

test("matches the exact incoming message and returns the configured handoff message", async () => {
  const { t, conversationId, messageId } = await fixture();
  expect(await t.query(internal.chat.keywordEscalation.match, { conversationId, promptMessageId: "source" })).toMatchObject({ keyword: "human", question: "I want a HUMAN please", message: "A teammate will help.", sourceAgentMessageId: "source" });
  await t.run((ctx) => ctx.db.patch(messageId, { content: "我要退款" }));
  expect(await t.query(internal.chat.keywordEscalation.match, { conversationId, promptMessageId: "source" })).toMatchObject({ keyword: "退款" });
});

test("disabled detection and nonmatching messages leave the normal flow available", async () => {
  const { t, nodeId, conversationId, messageId } = await fixture();
  await t.run((ctx) => ctx.db.patch(nodeId, { escalationKeywordsEnabled: false }));
  expect(await t.query(internal.chat.keywordEscalation.match, { conversationId, promptMessageId: "source" })).toBeNull();
  await t.run(async (ctx) => {
    await ctx.db.patch(nodeId, { escalationKeywordsEnabled: true });
    await ctx.db.patch(messageId, { content: "hello" });
  });
  expect(await t.query(internal.chat.keywordEscalation.match, { conversationId, promptMessageId: "source" })).toBeNull();
});

test("outgoing and missing messages cannot trigger keywords", async () => {
  const { t, conversationId, messageId } = await fixture();
  expect(await t.query(internal.chat.keywordEscalation.match, { conversationId, promptMessageId: "missing" })).toBeNull();
  await t.run((ctx) => ctx.db.patch(messageId, { direction: "outgoing" }));
  expect(await t.query(internal.chat.keywordEscalation.match, { conversationId, promptMessageId: "source" })).toBeNull();
});

test("closed or manually handled conversations do not trigger keywords", async () => {
  const { t, conversationId } = await fixture();
  await t.run((ctx) => ctx.db.patch(conversationId, { assignToAiAgent: false }));
  expect(await t.query(internal.chat.keywordEscalation.match, { conversationId, promptMessageId: "source" })).toBeNull();
  await t.run((ctx) => ctx.db.patch(conversationId, { assignToAiAgent: true, status: "closed" }));
  expect(await t.query(internal.chat.keywordEscalation.match, { conversationId, promptMessageId: "source" })).toBeNull();
});

test("an existing escalation cannot be triggered again", async () => {
  const { t, conversationId } = await fixture();
  await t.run((ctx) => ctx.db.patch(conversationId, { escalation: { question: "help", context: "already escalated", escalatedAt: Date.now() } }));
  expect(await t.query(internal.chat.keywordEscalation.match, { conversationId, promptMessageId: "source" })).toBeNull();
});

test("a source message from a different conversation cannot trigger escalation", async () => {
  const { t, conversationId, messageId } = await fixture();
  await t.run(async (ctx) => {
    const original = await ctx.db.get(conversationId);
    if (!original) throw new Error("Missing fixture conversation");
    const { _id, _creationTime, ...values } = original;
    expect(_id).toBe(conversationId);
    expect(_creationTime).toBeGreaterThan(0);
    const otherConversationId = await ctx.db.insert("conversations", { ...values, threadId: "other-thread" });
    await ctx.db.patch(messageId, { conversationId: otherConversationId });
  });
  expect(await t.query(internal.chat.keywordEscalation.match, { conversationId, promptMessageId: "source" })).toBeNull();
});
