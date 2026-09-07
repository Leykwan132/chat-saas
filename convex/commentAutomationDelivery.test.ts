/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("counts a successful private reply and one later customer response", async () => {
  const t = convexTest(schema, modules);
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
});
