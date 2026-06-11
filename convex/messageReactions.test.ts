/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";
import agentSchema from "../node_modules/@convex-dev/agent/dist/component/schema.js";

const modules = import.meta.glob("./**/*.ts");

function registerAgent(t: ReturnType<typeof convexTest>) {
  t.registerComponent("agent", agentSchema, {
    "apiKeys": () => import("../node_modules/@convex-dev/agent/dist/component/apiKeys.js"),
    "files": () => import("../node_modules/@convex-dev/agent/dist/component/files.js"),
    "messages": () => import("../node_modules/@convex-dev/agent/dist/component/messages.js"),
    "streams": () => import("../node_modules/@convex-dev/agent/dist/component/streams.js"),
    "threads": () => import("../node_modules/@convex-dev/agent/dist/component/threads.js"),
    "users": () => import("../node_modules/@convex-dev/agent/dist/component/users.js"),
    "_generated/server": () => import("../node_modules/@convex-dev/agent/dist/component/_generated/server.js"),
  });
}

test("reaction persistence patches target message row", async () => {
  const t = convexTest(schema, modules);
  registerAgent(t);

  const { conversationId, messageId } = await t.run(async (ctx) => {
    const channelId = await ctx.db.insert("channels", {
      orgId: "org-123",
      service: "whatsapp",
      phoneNumberId: "phone-123",
      accessToken: "token",
      status: "connected",
      connectedByUserId: "user-123",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const conversationId = await ctx.db.insert("conversations", {
      orgId: "org-123",
      channelId,
      service: "whatsapp",
      orgAddress: "phone-123",
      contactAddress: "+60123456789",
      status: "open",
      tags: [],
      assignToAiAgent: false,
      threadId: "thread-123",
      lastMessageAt: Date.now(),
      unreadCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const messageId = await ctx.db.insert("messages", {
      orgId: "org-123",
      conversationId,
      channelId,
      service: "whatsapp",
      externalId: "wamid.target",
      orgAddress: "phone-123",
      contactAddress: "+60123456789",
      direction: "incoming",
      contentType: "text",
      content: "Done",
      createdAt: Date.now(),
    });
    return { conversationId, messageId };
  });

  const result = await t.mutation(internal.chat.reactions.internalUpsertReaction, {
    conversationId,
    messageId,
    emoji: "✅",
    source: "human",
    actorUserId: "user-123",
    actorName: "Jane",
  });
  expect(result.ok).toBe(true);

  const msg = await t.run(async (ctx) => await ctx.db.get(messageId));
  expect(msg?.reactions).toMatchObject([
    {
      emoji: "✅",
      source: "human",
      actorUserId: "user-123",
      actorName: "Jane",
    },
  ]);
});

test("WhatsApp reaction webhook updates target message without creating a new message", async () => {
  const t = convexTest(schema, modules);
  registerAgent(t);

  const { messageId } = await t.run(async (ctx) => {
    const channelId = await ctx.db.insert("channels", {
      orgId: "org-123",
      service: "whatsapp",
      phoneNumberId: "phone-123",
      accessToken: "token",
      status: "connected",
      connectedByUserId: "user-123",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const conversationId = await ctx.db.insert("conversations", {
      orgId: "org-123",
      channelId,
      service: "whatsapp",
      orgAddress: "phone-123",
      contactAddress: "+60123456789",
      status: "open",
      tags: [],
      assignToAiAgent: false,
      threadId: "thread-123",
      lastMessageAt: Date.now(),
      unreadCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const messageId = await ctx.db.insert("messages", {
      orgId: "org-123",
      conversationId,
      channelId,
      service: "whatsapp",
      externalId: "wamid.target",
      orgAddress: "phone-123",
      contactAddress: "+60123456789",
      direction: "outgoing",
      contentType: "text",
      content: "Confirmed",
      createdAt: Date.now(),
    });
    return { messageId };
  });

  await t.mutation(internal.whatsappWebhook.handleReaction, {
    phoneNumberId: "phone-123",
    from: "+60123456789",
    profileName: "Customer",
    targetExternalId: "wamid.target",
    emoji: "🔥",
  });

  const rows = await t.run(async (ctx) => await ctx.db.query("messages").collect());
  expect(rows.length).toBe(1);
  const msg = await t.run(async (ctx) => await ctx.db.get(messageId));
  expect(msg?.reactions?.[0]).toMatchObject({
    emoji: "🔥",
    source: "customer",
    actorName: "Customer",
  });
});
