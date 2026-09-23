/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("AI channel delivery is blocked after a conversation is taken over", async () => {
  const t = convexTest(schema, modules);
  const now = Date.now();

  const conversationId = await t.run(async (ctx) => {
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
      service: "whatsapp",
      orgAddress: "phone-takeover",
      contactAddress: "+60123456789",
      status: "open",
      assignToAiAgent: false,
      threadId: "thread-takeover",
      lastMessageAt: now,
      unreadCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  });

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
