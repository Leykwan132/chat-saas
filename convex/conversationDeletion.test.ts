/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { withComponents } from "./testUtils";
import agentSchema from "../node_modules/@convex-dev/agent/dist/component/schema.js";

const modules = import.meta.glob("./**/*.ts");

const agentModules = {
  apiKeys: () => import("../node_modules/@convex-dev/agent/dist/component/apiKeys.js"),
  files: () => import("../node_modules/@convex-dev/agent/dist/component/files.js"),
  messages: () => import("../node_modules/@convex-dev/agent/dist/component/messages.js"),
  streams: () => import("../node_modules/@convex-dev/agent/dist/component/streams.js"),
  threads: () => import("../node_modules/@convex-dev/agent/dist/component/threads.js"),
  users: () => import("../node_modules/@convex-dev/agent/dist/component/users.js"),
  "_generated/server": () =>
    import("../node_modules/@convex-dev/agent/dist/component/_generated/server.js"),
};

test("deletes a conversation, its messages, and the channel count", async () => {
  vi.useFakeTimers();
  const t = convexTest(schema, modules);
  t.registerComponent("agent", agentSchema, agentModules);
  const now = 1_700_000_000_000;
  const threadId = await withComponents(t).runInComponent(
    "agent",
    async (ctx) =>
      await ctx.db.insert("threads", {
        userId: "user-delete-conversation",
        title: "Inbox thread",
        status: "active",
      }),
  );
  const conversationId = await t.run(async (ctx) => {
    const channelId = await ctx.db.insert("channels", {
      orgId: "",
      service: "web",
      status: "connected",
      connectedByUserId: "user-delete-conversation",
      conversationCount: 1,
      createdAt: now,
      updatedAt: now,
    });
    const createdConversationId = await ctx.db.insert("conversations", {
      orgId: "",
      channelId,
      service: "web",
      orgAddress: "widget",
      contactAddress: "visitor-1",
      status: "open",
      tags: [],
      assignToAiAgent: false,
      threadId,
      lastMessageAt: now,
      unreadCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("messages", {
      orgId: "",
      conversationId: createdConversationId,
      channelId,
      service: "web",
      orgAddress: "widget",
      contactAddress: "visitor-1",
      direction: "incoming",
      contentType: "text",
      content: "Hello",
      createdAt: now,
    });
    return createdConversationId;
  });

  await t.withIdentity({
    subject: "user-delete-conversation",
    email: "delete-conversation@example.com",
  }).mutation(api.conversationDeletion.remove, { conversationId });
  await t.finishAllScheduledFunctions(vi.runAllTimers);

  const stored = await t.run(async (ctx) => {
    const conversation = await ctx.db.get(conversationId);
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversationId_and_createdAt", (q) =>
        q.eq("conversationId", conversationId),
      )
      .take(5);
    const channel = await ctx.db.query("channels").first();
    return {
      conversation,
      messageCount: messages.length,
      conversationCount: channel?.conversationCount,
    };
  });

  expect(stored.conversation).toBeNull();
  expect(stored.messageCount).toBe(0);
  expect(stored.conversationCount).toBe(0);
  const thread = await withComponents(t).runInComponent("agent", async (ctx) => {
    return await ctx.db.get(threadId);
  });
  expect(thread).toBeNull();
  vi.useRealTimers();
});
