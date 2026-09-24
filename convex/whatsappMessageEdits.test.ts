/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("WhatsApp edit and revoke replace the original incoming message and current Inbox preview", async () => {
  const t = convexTest(schema, modules);
  const { conversationId, messageId, now } = await t.run(async (ctx) => {
    const now = 1_700_000_000_000;
    const channelId = await ctx.db.insert("channels", {
      orgId: "org-123",
      service: "whatsapp",
      phoneNumberId: "phone-123",
      accessToken: "token",
      status: "connected",
      connectedByUserId: "user-123",
      conversationCount: 1,
      createdAt: now,
      updatedAt: now,
    });
    const conversationId = await ctx.db.insert("conversations", {
      orgId: "org-123",
      channelId,
      service: "whatsapp",
      orgAddress: "phone-123",
      contactAddress: "+60129499394",
      status: "open",
      tags: [],
      assignToAiAgent: false,
      threadId: "thread-123",
      lastMessageAt: now,
      lastMessagePreview: "Original message",
      unreadCount: 1,
      createdAt: now,
      updatedAt: now,
    });
    const messageId = await ctx.db.insert("messages", {
      orgId: "org-123",
      conversationId,
      channelId,
      service: "whatsapp",
      externalId: "original-message-123",
      orgAddress: "phone-123",
      contactAddress: "+60129499394",
      direction: "incoming",
      contentType: "text",
      content: "Original message",
      createdAt: now,
    });
    return { channelId, conversationId, messageId, now };
  });

  const result = await t.mutation(internal.whatsappWebhook.handleMessageEdit, {
    phoneNumberId: "phone-123",
    originalExternalId: "original-message-123",
    content: "Updated message",
    timestampMs: now + 5000,
  });
  const rows = await t.run(async (ctx) => ({
    message: await ctx.db.get(messageId),
    conversation: await ctx.db.get(conversationId),
    messages: await ctx.db
      .query("messages")
      .withIndex("by_conversationId_and_createdAt", (q) => q.eq("conversationId", conversationId))
      .collect(),
  }));

  expect(result).toEqual({ updated: true });
  expect(rows.messages).toHaveLength(1);
  expect(rows.message).toMatchObject({
    content: "Updated message",
    editedAt: now + 5000,
    createdAt: now,
  });
  expect(rows.conversation).toMatchObject({
    lastMessageAt: now,
    lastMessagePreview: "Updated message",
    unreadCount: 1,
  });

  const revokeResult = await t.mutation(internal.whatsappWebhook.handleMessageRevoke, {
    phoneNumberId: "phone-123",
    originalExternalId: "original-message-123",
    timestampMs: now + 10_000,
  });
  const revoked = await t.run(async (ctx) => ({
    message: await ctx.db.get(messageId),
    conversation: await ctx.db.get(conversationId),
  }));

  expect(revokeResult).toEqual({ updated: true });
  expect(revoked.message).toMatchObject({
    content: "This message was deleted",
    revokedAt: now + 10_000,
    createdAt: now,
  });
  expect(revoked.conversation).toMatchObject({
    lastMessageAt: now,
    lastMessagePreview: "This message was deleted",
    unreadCount: 1,
  });
});
