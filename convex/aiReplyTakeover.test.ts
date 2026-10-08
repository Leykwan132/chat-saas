/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

afterEach(() => vi.unstubAllGlobals());

async function createConversation(assignToAiAgent = false) {
  const t = convexTest(schema, modules);
  const now = Date.now();

  const conversationId = await t.run(async (ctx) => {
    const customerId = await ctx.db.insert("customers", {
      orgId: "org-takeover",
      userId: "user-takeover",
      source: "whatsapp",
      service: "whatsapp",
      firstSeenAt: now,
      lastSeenAt: now,
      contactAddress: "+60123456789",
      phone: "+60123456789",
      tags: [],
      createdAt: now,
      updatedAt: now,
    });
    const channelId = await ctx.db.insert("channels", {
      conversationCount: 0,
      orgId: "org-takeover",
      service: "whatsapp",
      phoneNumberId: "phone-takeover",
      accessToken: "token-takeover",
      status: "connected",
      connectedByUserId: "user-takeover",
      createdAt: now,
      updatedAt: now,
    });
    return await ctx.db.insert("conversations", {
      orgId: "org-takeover",
      userId: "user-takeover",
      channelId,
      customerId,
      service: "whatsapp",
      orgAddress: "phone-takeover",
      contactAddress: "+60123456789",
      status: "open",
      assignToAiAgent,
      lastCustomerMessageAt: now,
      threadId: "thread-takeover",
      lastMessageAt: now,
      unreadCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  });

  return { t, conversationId };
}

test("AI channel delivery is blocked after a conversation is taken over", async () => {
  const { t, conversationId } = await createConversation();
  const result = await t.action(
    internal.chat.inboxActions.internalSendAiReplyMessages,
    {
      conversationId,
      contents: ["This reply must not be delivered."],
      mediaUrls: [],
    },
  );

  expect(result).toMatchObject({
    ok: false,
    error: "AI replies are disabled for this conversation",
    mediaSent: false,
    sentTextCount: 0,
    textExternalIds: [],
    mediaExternalIds: [],
  });
});

test.each([
  { description: "text reply", contents: ["Must stop after takeover"], mediaUrls: ["https://example.com/photo.png"] },
  { description: "attachment", contents: [], mediaUrls: ["https://example.com/photo.png", "https://example.com/second.png"] },
])("takeover during media delivery stops the remaining $description", async ({ contents, mediaUrls }) => {
  const { t, conversationId } = await createConversation(true);
  let deliveredMessages = 0;
  vi.stubGlobal("fetch", async () => {
    deliveredMessages += 1;
    await t.run(async (ctx) => {
      await ctx.db.patch(conversationId, { assignToAiAgent: false });
    });
    return new Response(JSON.stringify({ messages: [{ id: `sent-${deliveredMessages}` }] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });

  const result = await t.action(internal.chat.inboxActions.internalSendAiReplyMessages, {
    conversationId,
    contents,
    mediaUrls,
  });

  expect(result).toMatchObject({
    ok: false,
    error: "AI replies are disabled for this conversation",
    mediaSent: true,
    mediaExternalIds: ["sent-1"],
    sentTextCount: 0,
    textExternalIds: [],
  });
  expect(deliveredMessages).toBe(1);
});
