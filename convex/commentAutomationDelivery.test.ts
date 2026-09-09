/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
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

test("counts a successful private reply and one later customer response", async () => {
  const t = convexTest(schema, modules);
  registerAgent(t);
  t.registerComponent("conversationLogWorkpool", workpoolSchema, workpoolModules);
  const fixture = await t.run(async (ctx) => {
    const now = 1_788_758_518_000;
    const channelId = await ctx.db.insert("channels", {
      orgId: "org",
      service: "messenger",
      pageId: "page-1",
      accessToken: "token",
      status: "connected",
      connectedByUserId: "owner",
      createdAt: now,
      updatedAt: now,
    });
    const automationId = await ctx.db.insert("commentAutomations", {
      orgId: "org",
      name: "Pricing",
      status: "active",
      trigger: "any_comment",
      keywords: [],
      privateMessage: "Sent privately",
      publicReply: "Check your inbox",
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
    const deliveryId = await ctx.db.insert("commentAutomationDeliveries", {
      automationId,
      channelId,
      externalCommentId: "comment-1",
      contactAddress: "customer-1",
      commentText: "Pricing?",
      commentCreatedAt: now,
      privateStatus: "pending",
      createdAt: now,
      updatedAt: now,
    });
    return { automationId, channelId, deliveryId, now };
  });

  expect(await t.mutation(
    internal.commentAutomationDelivery.claimDelivery,
    { deliveryId: fixture.deliveryId },
  )).not.toBeNull();
  expect(await t.mutation(
    internal.commentAutomationDelivery.completePrivateDelivery,
    { deliveryId: fixture.deliveryId, success: true },
  )).toBe(true);
  const responseAt = Date.now() + 1_000;
  await t.mutation(internal.commentAutomationDelivery.recordCustomerResponse, {
    channelId: fixture.channelId,
    contactAddress: "customer-1",
    timestampMs: responseAt,
  });
  await t.mutation(internal.commentAutomationDelivery.recordCustomerResponse, {
    channelId: fixture.channelId,
    contactAddress: "customer-1",
    timestampMs: responseAt + 1_000,
  });

  const result = await t.run(async (ctx) => ({
    automation: await ctx.db.get(fixture.automationId),
    delivery: await ctx.db.get(fixture.deliveryId),
  }));
  expect(result.automation?.sentCount).toBe(1);
  expect(result.automation?.respondedCount).toBe(1);
  expect(result.delivery?.privateStatus).toBe("sent");
  expect(result.delivery?.respondedAt).toBe(responseAt);

  const invalidDeliveryId = await t.run(async (ctx) => {
    await ctx.db.patch(fixture.channelId, { accessToken: undefined });
    return await ctx.db.insert("commentAutomationDeliveries", {
      automationId: fixture.automationId,
      channelId: fixture.channelId,
      externalCommentId: "comment-2",
      contactAddress: "customer-2",
      commentText: "Hello",
      commentCreatedAt: responseAt,
      privateStatus: "pending",
      createdAt: responseAt,
      updatedAt: responseAt,
    });
  });
  expect(await t.mutation(
    internal.commentAutomationDelivery.claimDelivery,
    { deliveryId: invalidDeliveryId },
  )).toBeNull();
  expect(await t.run(async (ctx) =>
    (await ctx.db.get(invalidDeliveryId))?.privateStatus
  )).toBe("failed");

  const instagramDeliveryId = await t.run(async (ctx) => {
    await ctx.db.patch(fixture.channelId, {
      service: "instagram",
      pageId: undefined,
      igUserId: "17841415503021124",
      accessToken: "instagram-token",
    });
    return await ctx.db.insert("commentAutomationDeliveries", {
      automationId: fixture.automationId,
      channelId: fixture.channelId,
      externalCommentId: "comment-3",
      contactAddress: "customer-3",
      commentText: "Hello",
      commentCreatedAt: responseAt,
      privateStatus: "pending",
      createdAt: responseAt,
      updatedAt: responseAt,
    });
  });
  expect(await t.mutation(
    internal.commentAutomationDelivery.claimDelivery,
    { deliveryId: instagramDeliveryId },
  )).not.toBeNull();
});
