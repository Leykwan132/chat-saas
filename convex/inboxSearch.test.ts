/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import { upsertInboxConversationSummary } from "./inboxConversationSummary";
import {
  upsertInboxChatSearchDocument,
  upsertInboxMessageSearchDocument,
} from "./inboxSearchProjection";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function createFixture() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      workosUserId: "inbox-search-query-owner",
      email: "owner@example.com",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("teams", {
      type: "personal",
      name: "Inbox search query",
      ownerId: userId,
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
      userId: "inbox-search-query-owner",
      orgId: "",
      createdAt: now,
      updatedAt: now,
    });
    const channelId = await ctx.db.insert("channels", {
      orgId: "",
      service: "whatsapp",
      phoneNumberId: "inbox-search-query-phone",
      status: "connected",
      connectedByUserId: "inbox-search-query-owner",
      conversationCount: 1,
      createdAt: now,
      updatedAt: now,
    });
    const conversationId = await ctx.db.insert("conversations", {
      orgId: "",
      userId: "inbox-search-query-owner",
      channelId,
      service: "whatsapp",
      orgAddress: "+60999999999",
      contactAddress: "+60123456789",
      contactName: "Aisha Rahman",
      status: "open",
      assignedAgentId: agentId,
      assignToAiAgent: true,
      threadId: "inbox-search-query-thread",
      lastMessageAt: now,
      lastMessagePreview: "Need to reschedule Friday",
      unreadCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    const messageIds = await Promise.all([now, now + 1].map((createdAt) =>
      ctx.db.insert("messages", {
        orgId: "",
        conversationId,
        channelId,
        service: "whatsapp",
        orgAddress: "+60999999999",
        contactAddress: "+60123456789",
        direction: "incoming",
        contentType: "text",
        content: "Need to reschedule Friday",
        createdAt,
      }),
    ));
    await upsertInboxConversationSummary(ctx, conversationId);
    await upsertInboxChatSearchDocument(ctx, conversationId);
    for (const messageId of messageIds) await upsertInboxMessageSearchDocument(ctx, messageId);
    return { agentId };
  });
  const client = t.withIdentity({ subject: "inbox-search-query-owner" });
  await client.mutation(api.authUtils.upsertUser, {});
  return { client, ...ids };
}

test("returns at most five scoped contact matches", async () => {
  const fixture = await createFixture();
  const result = await fixture.client.query(api.inboxSearch.searchChatsForCurrentOrg, {
    agentId: fixture.agentId,
    searchQuery: "aisha",
  });
  expect(result).toHaveLength(1);
  expect(result[0]).toMatchObject({ contactName: "Aisha Rahman" });
});

test("returns separate message hits with current summary presentation data", async () => {
  const fixture = await createFixture();
  const result = await fixture.client.query(api.inboxSearch.searchMessagesForCurrentOrg, {
    agentId: fixture.agentId,
    searchQuery: "reschedule",
    paginationOpts: { cursor: null, numItems: 20 },
  });
  expect(result.page).toHaveLength(2);
  expect(result.page[0]).toMatchObject({
    matchedMessage: "Need to reschedule Friday",
    matchedMessageAt: expect.any(Number),
  });
});
