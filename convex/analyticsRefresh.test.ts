/// <reference types="vite/client" />
import { convexTest, type TestConvex } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import aggregateSchema from "../node_modules/@convex-dev/aggregate/dist/component/schema.js";
import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const mockAggregate = {
  public: () =>
    import("../node_modules/@convex-dev/aggregate/dist/component/public.js"),
  "_generated/server": () =>
    import(
      "../node_modules/@convex-dev/aggregate/dist/component/_generated/server.js"
    ),
};

afterEach(() => {
  vi.useRealTimers();
});

async function insertConversationFixture(
  t: TestConvex<typeof schema>,
) {
  return await t.run(async (ctx) => {
    const now = 1_700_000_000_000;
    const channelId = await ctx.db.insert("channels", {
      orgId: "org-refresh",
      service: "whatsapp",
      phoneNumberId: "phone-refresh",
      accessToken: "token",
      status: "connected",
      connectedByUserId: "user-refresh",
      createdAt: now,
      updatedAt: now,
    });
    const customerId = await ctx.db.insert("customers", {
      orgId: "org-refresh",
      service: "whatsapp",
      contactAddress: "+60111111111",
      tags: [],
      source: "whatsapp",
      firstSeenAt: now,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    });
    const conversationId = await ctx.db.insert("conversations", {
      orgId: "org-refresh",
      channelId,
      service: "whatsapp",
      orgAddress: "phone-refresh",
      contactAddress: "+60111111111",
      customerId,
      status: "open",
      tags: [],
      assignToAiAgent: false,
      threadId: "thread-refresh",
      lastMessageAt: now,
      lastCustomerMessageAt: now,
      unreadCount: 1,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("messages", {
      orgId: "org-refresh",
      conversationId,
      channelId,
      service: "whatsapp",
      externalId: "refresh-message",
      orgAddress: "phone-refresh",
      contactAddress: "+60111111111",
      direction: "incoming",
      contentType: "text",
      content: "Hello",
      createdAt: now,
    });
    return conversationId;
  });
}

test("refresh requests coalesce by conversation and advance the revision", async () => {
  vi.useFakeTimers();
  const t = convexTest(schema, modules);
  const conversationId = await insertConversationFixture(t);

  const first = await t.mutation(
    internal.analyticsRefreshRequest.request,
    { conversationId },
  );
  const second = await t.mutation(
    internal.analyticsRefreshRequest.request,
    { conversationId },
  );

  const requests = await t.run(async (ctx) => {
    return await ctx.db
      .query("conversationAnalyticsRefreshRequests")
      .collect();
  });

  expect(first.revision).toBe(1);
  expect(second.requestId).toBe(first.requestId);
  expect(second.revision).toBe(2);
  expect(requests).toHaveLength(1);
  expect(requests[0].revision).toBe(2);
});

test("only the latest worker refreshes analytics and clears the request", async () => {
  vi.useFakeTimers();
  const t = convexTest(schema, modules);
  t.registerComponent("analyticsMetrics", aggregateSchema, mockAggregate);
  const conversationId = await insertConversationFixture(t);

  const first = await t.mutation(
    internal.analyticsRefreshRequest.request,
    { conversationId },
  );
  const second = await t.mutation(
    internal.analyticsRefreshRequest.request,
    { conversationId },
  );

  const staleResult = await t.mutation(
    internal.analyticsRefreshWorker.run,
    {
      requestId: first.requestId,
      revision: first.revision,
    },
  );
  const requestAfterStaleWorker = await t.run(async (ctx) => {
    return await ctx.db.get(first.requestId);
  });

  expect(staleResult).toEqual({ refreshed: false });
  expect(requestAfterStaleWorker?.revision).toBe(second.revision);

  const latestResult = await t.mutation(
    internal.analyticsRefreshWorker.run,
    {
      requestId: second.requestId,
      revision: second.revision,
    },
  );
  const state = await t.run(async (ctx) => {
    const request = await ctx.db.get(second.requestId);
    const fact = await ctx.db
      .query("conversationAnalyticsFacts")
      .withIndex("by_conversationId", (q) =>
        q.eq("conversationId", conversationId),
      )
      .unique();
    return { request, fact };
  });

  expect(latestResult).toEqual({ refreshed: true });
  expect(state.request).toBeNull();
  expect(state.fact?.conversationId).toBe(conversationId);
});
