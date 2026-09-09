/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test, vi } from "vitest";
import agentSchema from "../node_modules/@convex-dev/agent/dist/component/schema.js";
import workpoolSchema from "../node_modules/@convex-dev/workpool/dist/component/schema.js";
import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const workpoolModules = {
  complete: () => import("../node_modules/@convex-dev/workpool/dist/component/complete.js"),
  config: () => import("../node_modules/@convex-dev/workpool/dist/component/config.js"),
  crons: () => import("../node_modules/@convex-dev/workpool/dist/component/crons.js"),
  danger: () => import("../node_modules/@convex-dev/workpool/dist/component/danger.js"),
  kick: () => import("../node_modules/@convex-dev/workpool/dist/component/kick.js"),
  lib: () => import("../node_modules/@convex-dev/workpool/dist/component/lib.js"),
  logging: () => import("../node_modules/@convex-dev/workpool/dist/component/logging.js"),
  loop: () => import("../node_modules/@convex-dev/workpool/dist/component/loop.js"),
  recovery: () => import("../node_modules/@convex-dev/workpool/dist/component/recovery.js"),
  stats: () => import("../node_modules/@convex-dev/workpool/dist/component/stats.js"),
  worker: () => import("../node_modules/@convex-dev/workpool/dist/component/worker.js"),
  "_generated/server": () =>
    import("../node_modules/@convex-dev/workpool/dist/component/_generated/server.js"),
};

function registerAgent(t: ReturnType<typeof convexTest>) {
  t.registerComponent("agent", agentSchema, {
    apiKeys: () => import("../node_modules/@convex-dev/agent/dist/component/apiKeys.js"),
    files: () => import("../node_modules/@convex-dev/agent/dist/component/files.js"),
    messages: () => import("../node_modules/@convex-dev/agent/dist/component/messages.js"),
    streams: () => import("../node_modules/@convex-dev/agent/dist/component/streams.js"),
    threads: () => import("../node_modules/@convex-dev/agent/dist/component/threads.js"),
    users: () => import("../node_modules/@convex-dev/agent/dist/component/users.js"),
    "_generated/server": () =>
      import("../node_modules/@convex-dev/agent/dist/component/_generated/server.js"),
  });
}

test("chooses the keyword match once and persists the customer first", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
    recipient_id: "customer-1",
    message_id: "message-1",
  }), { status: 200 })));
  const t = convexTest(schema, modules);
  registerAgent(t);
  t.registerComponent(
    "conversationLogWorkpool",
    workpoolSchema,
    workpoolModules,
  );
  const fixture = await t.run(async (ctx) => {
    const now = 1_788_758_518_000;
    const agentId = await ctx.db.insert("agents", {
      name: "Comment Agent",
      provider: "openrouter",
      model: "deepseek/deepseek-v4-flash",
      systemPrompt: "Test",
      templateKey: "blank",
      fileSize: 0,
      userId: "owner",
      orgId: "org",
      createdAt: now,
      updatedAt: now,
    });
    const channelId = await ctx.db.insert("channels", {
      orgId: "org",
      service: "messenger",
      pageId: "page-1",
      accessToken: "token",
      status: "connected",
      connectedByUserId: "owner",
      defaultAgentId: agentId,
      createdAt: now,
      updatedAt: now,
    });
    for (const trigger of ["any_comment", "keywords"] as const) {
      const automationId = await ctx.db.insert("commentAutomations", {
        orgId: "org",
        agentId,
        name: trigger,
        status: "active",
        trigger,
        keywords: trigger === "keywords" ? ["pricing"] : [],
        privateMessage: "Sent privately",
        sentCount: 0,
        respondedCount: 0,
        createdByUserId: "owner",
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert("commentAutomationPages", {
        automationId,
        channelId,
        subscriptionStatus: "subscribed",
        updatedAt: now,
      });
    }
    return { channelId, agentId, now };
  });

  const input = {
    channelId: fixture.channelId,
    externalCommentId: "comment-1",
    authorAddress: "customer-1",
    authorName: "Alex",
    text: "Can I get pricing?",
    timestampMs: fixture.now,
  };
  await t.mutation(internal.commentAutomationIngest.ingestComment, input);
  await t.mutation(internal.commentAutomationIngest.ingestComment, input);
  const deliveryId = await t.run(async (ctx) =>
    (await ctx.db.query("commentAutomationDeliveries").unique())?._id
  );
  if (deliveryId === undefined) throw new Error("Comment delivery was not created");
  expect(await t.mutation(
    internal.commentAutomationDelivery.claimDelivery,
    { deliveryId },
  )).not.toBeNull();
  expect(await t.mutation(
    internal.commentAutomationDelivery.completePrivateDelivery,
    { deliveryId, success: true, externalId: "private-reply-1" },
  )).toBe(true);

  const result = await t.run(async (ctx) => {
    const deliveries = await ctx.db.query("commentAutomationDeliveries").collect();
    const automation = deliveries[0]
      ? await ctx.db.get(deliveries[0].automationId)
      : null;
    const customers = await ctx.db.query("customers").collect();
    const conversations = await ctx.db.query("conversations").collect();
    const messages = await ctx.db.query("messages").collect();
    return { deliveries, automation, customers, conversations, messages };
  });
  expect(result.deliveries).toHaveLength(1);
  expect(result.automation?.trigger).toBe("keywords");
  expect(result.customers).toHaveLength(1);
  expect(result.customers[0]?.name).toBe("Alex");
  expect(result.conversations).toHaveLength(1);
  expect(result.messages).toHaveLength(2);
  expect(result.messages).toContainEqual(expect.objectContaining({
    externalId: "private-reply-1",
    direction: "outgoing",
    content: "Sent privately",
    workflowAutomationSource: "commentAutomation",
  }));
  expect(result.deliveries.every((row) =>
    row.customerId === result.customers[0]?._id &&
    row.conversationId === result.conversations[0]?._id
  )).toBe(true);
});
