/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import {
  removeInboxMessageSearchDocument,
  upsertInboxChatSearchDocument,
  upsertInboxMessageSearchDocument,
} from "./inboxSearchProjection";
import { upsertInboxConversationSummary } from "./inboxConversationSummary";
import schema from "./schema";
import { triggers } from "./triggers";

const modules = import.meta.glob("./**/*.ts");

async function createFixture() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      workosUserId: "inbox-search-owner",
      email: "owner@example.com",
      createdAt: now,
      updatedAt: now,
    });
    const agentId = await ctx.db.insert("agents", {
      name: "Inbox search agent",
      provider: "openrouter",
      model: "test-model",
      systemPrompt: "Help.",
      templateKey: "blank",
      fileSize: 0,
      userId: "inbox-search-owner",
      orgId: "",
      createdAt: now,
      updatedAt: now,
    });
    const channelId = await ctx.db.insert("channels", {
      orgId: "",
      service: "whatsapp",
      phoneNumberId: "inbox-search-phone",
      status: "connected",
      connectedByUserId: "inbox-search-owner",
      conversationCount: 1,
      createdAt: now,
      updatedAt: now,
    });
    const customerId = await ctx.db.insert("customers", {
      orgId: "",
      userId: "inbox-search-owner",
      agentId,
      service: "whatsapp",
      contactAddress: "+60123456789",
      name: "Aisha Rahman",
      email: "aisha@example.com",
      phone: "+60111222333",
      tags: [],
      source: "whatsapp",
      firstSeenAt: now,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    });
    const conversationId = await ctx.db.insert("conversations", {
      orgId: "",
      userId: "inbox-search-owner",
      channelId,
      service: "whatsapp",
      orgAddress: "+60999999999",
      contactAddress: "+60123456789",
      contactName: "Aisha Rahman",
      customerId,
      status: "open",
      assignedAgentId: agentId,
      assignToAiAgent: true,
      threadId: "inbox-search-thread",
      lastMessageAt: now,
      lastMessagePreview: "Need to reschedule Friday",
      unreadCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    const messageId = await ctx.db.insert("messages", {
      orgId: "",
      conversationId,
      channelId,
      service: "whatsapp",
      orgAddress: "+60999999999",
      contactAddress: "+60123456789",
      direction: "incoming",
      contentType: "text",
      content: "Need to reschedule Friday",
      createdAt: now,
    });
    return { agentId, channelId, conversationId, customerId, messageId, userId };
  });

  return { t, ...ids };
}

async function chatSearch(fixture: Awaited<ReturnType<typeof createFixture>>) {
  return fixture.t.run((ctx) =>
    ctx.db
      .query("inboxChatSearchDocuments")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", fixture.conversationId))
      .unique(),
  );
}

async function messageSearch(
  fixture: Awaited<ReturnType<typeof createFixture>>,
  messageId = fixture.messageId,
) {
  return fixture.t.run((ctx) =>
    ctx.db
      .query("inboxMessageSearchDocuments")
      .withIndex("by_messageId", (q) => q.eq("messageId", messageId))
      .unique(),
  );
}

test("creates searchable contact and text-message documents in the conversation scope", async () => {
  const fixture = await createFixture();
  await fixture.t.run(async (ctx) => {
    await upsertInboxConversationSummary(ctx, fixture.conversationId);
    await upsertInboxChatSearchDocument(ctx, fixture.conversationId);
    await upsertInboxMessageSearchDocument(ctx, fixture.messageId);
  });

  expect(await chatSearch(fixture)).toMatchObject({
    conversationId: fixture.conversationId,
    searchText: expect.stringContaining("Aisha"),
    isChannelConnected: true,
  });
  expect(await messageSearch(fixture)).toMatchObject({
    messageId: fixture.messageId,
    content: "Need to reschedule Friday",
    assignedAgentId: fixture.agentId,
  });
});

test("excludes media-only messages and removes search documents on deletion", async () => {
  const fixture = await createFixture();
  const imageMessageId = await fixture.t.run(async (ctx) => {
    await upsertInboxConversationSummary(ctx, fixture.conversationId);
    return ctx.db.insert("messages", {
      orgId: "",
      conversationId: fixture.conversationId,
      channelId: fixture.channelId,
      service: "whatsapp",
      orgAddress: "+60999999999",
      contactAddress: "+60123456789",
      direction: "incoming",
      contentType: "image",
      content: "",
      createdAt: Date.now(),
    });
  });

  await fixture.t.run(async (ctx) => {
    await upsertInboxMessageSearchDocument(ctx, imageMessageId);
    await upsertInboxMessageSearchDocument(ctx, fixture.messageId);
    await removeInboxMessageSearchDocument(ctx, fixture.messageId);
  });

  expect(await messageSearch(fixture, imageMessageId)).toBeNull();
  expect(await messageSearch(fixture)).toBeNull();
});

test("keeps message search scope current through trigger-wrapped reassignment and disconnection", async () => {
  const fixture = await createFixture();
  const nextAgentId = await fixture.t.run(async (ctx) => {
    const now = Date.now();
    const agentId = await ctx.db.insert("agents", {
      name: "Next agent",
      provider: "openrouter",
      model: "test-model",
      systemPrompt: "Help.",
      templateKey: "blank",
      fileSize: 0,
      userId: "inbox-search-owner",
      orgId: "",
      createdAt: now,
      updatedAt: now,
    });
    const triggerCtx = triggers.wrapDB(ctx);
    await triggerCtx.db.patch(fixture.conversationId, { assignedAgentId: agentId });
    return agentId;
  });

  expect(await messageSearch(fixture)).toMatchObject({ assignedAgentId: nextAgentId });

  await fixture.t.run(async (ctx) => {
    const triggerCtx = triggers.wrapDB(ctx);
    await triggerCtx.db.patch(fixture.channelId, { status: "disconnected" });
  });

  expect(await chatSearch(fixture)).toMatchObject({ isChannelConnected: false });
  expect(await messageSearch(fixture)).toMatchObject({ isChannelConnected: false });
});
