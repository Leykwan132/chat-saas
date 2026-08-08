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

function initTest() {
  const t = convexTest(schema, modules);
  t.registerComponent("agent", agentSchema, agentModules);
  return t;
}

test("disconnect deletes agent component threads linked to channel conversations", async () => {
  vi.useFakeTimers();
  const t = initTest();
  const workosUserId = "user-disconnect-threads";

  const threadId = await withComponents(t).runInComponent(
    "agent",
    async (ctx) =>
      await ctx.db.insert("threads", {
        userId: workosUserId,
        title: "Channel thread",
        status: "active",
      }),
  );

  const { channelId, conversationId } = await t.run(async (ctx) => {
    const now = Date.now();
    const userDbId = await ctx.db.insert("users", {
      workosUserId,
      email: "disconnect-threads@example.com",
      createdAt: now,
      updatedAt: now,
    });
    const teamId = await ctx.db.insert("teams", {
      type: "personal",
      name: "Personal",
      ownerId: userDbId,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(userDbId, { activeTeamId: teamId });

    const channelId = await ctx.db.insert("channels", {
      orgId: "",
      service: "whatsapp",
      wabaId: "waba-disconnect-threads",
      status: "connected",
      connectedByUserId: workosUserId,
      createdAt: now,
      updatedAt: now,
    });
    const conversationId = await ctx.db.insert("conversations", {
      orgId: "",
      userId: workosUserId,
      channelId,
      service: "whatsapp",
      orgAddress: "15550000",
      contactAddress: "15551111",
      status: "open",
      assignToAiAgent: true,
      threadId,
      lastMessageAt: now,
      unreadCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("messages", {
      conversationId,
      orgId: "",
      channelId,
      service: "whatsapp",
      orgAddress: "15550000",
      contactAddress: "15551111",
      direction: "incoming",
      contentType: "text",
      content: "hello",
      createdAt: now,
    });
    return { channelId, conversationId };
  });

  const testWithAuth = t.withIdentity({
    subject: workosUserId,
    orgId: "personal",
    email: "disconnect-threads@example.com",
  });
  await testWithAuth.mutation(api.channels.disconnect, { channelId });
  await t.finishAllScheduledFunctions(vi.runAllTimers);

  await t.run(async (ctx) => {
    expect(await ctx.db.get(conversationId)).toBeNull();
    expect(await ctx.db.query("messages").collect()).toHaveLength(0);
    const channel = await ctx.db.get(channelId);
    expect(channel?.status).toBe("disconnected");
  });

  const thread = await withComponents(t).runInComponent(
    "agent",
    async (ctx) => await ctx.db.get(threadId),
  );
  expect(thread).toBeNull();
  vi.useRealTimers();
});
