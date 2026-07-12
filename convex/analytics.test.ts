/// <reference types="vite/client" />
import { convexTest, type TestConvex } from "convex-test";
import { expect, test } from "vitest";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";
import aggregateSchema from "../node_modules/@convex-dev/aggregate/dist/component/schema.js";

const modules = import.meta.glob("./**/*.ts");

const mockAggregate = {
  "public": () => import("../node_modules/@convex-dev/aggregate/dist/component/public.js"),
  "_generated/server": () => import("../node_modules/@convex-dev/aggregate/dist/component/_generated/server.js"),
};

type AppTestConvex = TestConvex<typeof schema>;

function registerAnalyticsAggregate(t: AppTestConvex) {
  t.registerComponent("analyticsMetrics", aggregateSchema, mockAggregate);
}

async function insertAnalyticsFixture(
  t: AppTestConvex,
  args: {
    tags?: string[];
    leadTemperature?: "Hot" | "Warm" | "Cold";
    assignedUserId?: string;
  } = {},
) {
  return await t.run(async (ctx) => {
    const now = 1_700_000_000_000;
    const channelId = await ctx.db.insert("channels", {
      orgId: "org-123",
      service: "whatsapp",
      phoneNumberId: "phone-123",
      accessToken: "token",
      status: "connected",
      connectedByUserId: "user-owner",
      createdAt: now,
      updatedAt: now,
    });
    const customerId = await ctx.db.insert("customers", {
      orgId: "org-123",
      service: "whatsapp",
      contactAddress: "+60123456789",
      tags: [],
      leadTemperature: args.leadTemperature,
      source: "whatsapp",
      firstSeenAt: now,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    });
    const conversationId = await ctx.db.insert("conversations", {
      orgId: "org-123",
      channelId,
      service: "whatsapp",
      orgAddress: "phone-123",
      contactAddress: "+60123456789",
      customerId,
      status: "open",
      tags: args.tags ?? [],
      assignedUserId: args.assignedUserId,
      assignToAiAgent: false,
      threadId: "thread-analytics",
      lastMessageAt: now + 60_000,
      lastCustomerMessageAt: now,
      unreadCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(customerId, { lastConversationId: conversationId });
    const incomingId = await ctx.db.insert("messages", {
      orgId: "org-123",
      conversationId,
      channelId,
      service: "whatsapp",
      externalId: "inbound-1",
      orgAddress: "phone-123",
      contactAddress: "+60123456789",
      direction: "incoming",
      contentType: "text",
      content: "Hi",
      createdAt: now,
    });
    const replyId = await ctx.db.insert("messages", {
      orgId: "org-123",
      conversationId,
      channelId,
      service: "whatsapp",
      externalId: "outbound-1",
      orgAddress: "phone-123",
      contactAddress: "+60123456789",
      direction: "outgoing",
      authorUserId: args.assignedUserId,
      contentType: "text",
      content: "Hello",
      status: "sent",
      createdAt: now + 60_000,
    });
    return { channelId, customerId, conversationId, incomingId, replyId, now };
  });
}

async function metricRowsForConversation(
  t: AppTestConvex,
  conversationId: Id<"conversations">,
) {
  return await t.run(async (ctx) => {
    return await ctx.db
      .query("analyticsMetricEntries")
      .withIndex("by_sourceConversationId", (q) =>
        q.eq("sourceConversationId", conversationId),
      )
      .collect();
  });
}

test("syncConversationAnalytics stores first reply and conversion metric entries", async () => {
  const t = convexTest(schema, modules);
  registerAnalyticsAggregate(t);
  const { conversationId, now } = await insertAnalyticsFixture(t, {
    tags: ["converted"],
    assignedUserId: "user-member",
  });

  await t.mutation(internal.analytics.syncConversationAnalytics, {
    conversationId,
  });

  const result = await t.run(async (ctx) => {
    const fact = await ctx.db
      .query("conversationAnalyticsFacts")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", conversationId))
      .unique();
    const metrics = await ctx.db
      .query("analyticsMetricEntries")
      .withIndex("by_sourceConversationId", (q) =>
        q.eq("sourceConversationId", conversationId),
      )
      .collect();
    return { fact, metrics };
  });

  expect(result.fact?.firstReplyDurationMs).toBe(60_000);
  expect(result.fact?.firstHumanReplyDurationMs).toBe(60_000);
  expect(result.fact?.convertedAt).toBeGreaterThan(0);
  expect(result.metrics).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ metric: "convertedCount", value: 1, sortKey: now }),
      expect.objectContaining({
        metric: "conversionDurationMs",
        memberUserId: "user-member",
      }),
      expect.objectContaining({ metric: "firstReplyCount", value: 1 }),
      expect.objectContaining({ metric: "firstReplyDurationMs", value: 60_000 }),
      expect.objectContaining({ metric: "messageSentCount", value: 1 }),
    ]),
  );
});

test("Cold lead temperature creates dropped metrics and removing Cold clears them", async () => {
  const t = convexTest(schema, modules);
  registerAnalyticsAggregate(t);
  const { conversationId, customerId, now } = await insertAnalyticsFixture(t, {
    leadTemperature: "Cold",
    assignedUserId: "user-member",
  });

  await t.mutation(internal.analytics.syncConversationAnalytics, {
    conversationId,
  });
  let metrics = await metricRowsForConversation(t, conversationId);
  expect(metrics).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ metric: "droppedCount", value: 1, sortKey: now }),
    ]),
  );

  await t.run(async (ctx) => {
    await ctx.db.patch(customerId, {
      leadTemperature: "Warm",
      updatedAt: Date.now(),
    });
  });
  await t.mutation(internal.analytics.syncConversationAnalytics, {
    conversationId,
  });
  metrics = await metricRowsForConversation(t, conversationId);
  expect(metrics.some((metric) => metric.metric === "droppedCount")).toBe(false);
});

test("topic assignment supports multiple topics per conversation", async () => {
  const t = convexTest(schema, modules);
  registerAnalyticsAggregate(t);
  const { conversationId, now } = await insertAnalyticsFixture(t);

  await t.mutation(internal.analyticsTopicRecords.assignConversationTopic, {
    conversationId,
    sourceMessageMaxCreatedAt: now + 60_000,
    topics: [
      {
        topicName: "Pricing Questions",
        confidence: 0.92,
        description:
          "Customers ask about product pricing, discounts, and whether quoted rates apply to their order size.",
        summary: "Customer asked about pricing.",
      },
      {
        topicName: "Delivery Status",
        confidence: 0.84,
        summary: "Customer also asked about delivery.",
      },
    ],
  });

  const result = await t.run(async (ctx) => {
    const assignments = await ctx.db
      .query("conversationTopicAssignments")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", conversationId))
      .take(10);
    const metrics = await ctx.db
      .query("analyticsMetricEntries")
      .withIndex("by_sourceConversationId", (q) =>
        q.eq("sourceConversationId", conversationId),
      )
      .collect();
    const pricingTopic = await ctx.db
      .query("conversationTopics")
      .withIndex("by_orgId_and_slug", (q) =>
        q.eq("orgId", "org-123").eq("slug", "pricing-questions"),
      )
      .unique();
    const fact = await ctx.db
      .query("conversationAnalyticsFacts")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", conversationId))
      .unique();
    return { assignments, metrics, fact, pricingTopic };
  });

  expect(result.pricingTopic?.description).toContain("pricing");

  const sortedAssignments = [...result.assignments].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
  expect(sortedAssignments).toHaveLength(2);
  expect(sortedAssignments.map((assignment) => assignment.rank)).toEqual([0, 1]);
  expect(result.fact?.topicId).toBe(sortedAssignments[0]?.topicId);
  expect(result.metrics.filter((metric) => metric.metric === "topicMentionCount")).toHaveLength(2);

  await t.mutation(internal.analyticsTopicRecords.assignConversationTopic, {
    conversationId,
    sourceMessageMaxCreatedAt: now + 60_000,
    topics: [
      {
        topicName: "Pricing Questions",
        confidence: 0.95,
        summary: "Customer asked about pricing.",
      },
    ],
  });

  const after = await t.run(async (ctx) => {
    const assignments = await ctx.db
      .query("conversationTopicAssignments")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", conversationId))
      .take(10);
    const metrics = await ctx.db
      .query("analyticsMetricEntries")
      .withIndex("by_sourceConversationId", (q) =>
        q.eq("sourceConversationId", conversationId),
      )
      .collect();
    const deliveryTopic = await ctx.db
      .query("conversationTopics")
      .withIndex("by_orgId_and_slug", (q) =>
        q.eq("orgId", "org-123").eq("slug", "delivery-status"),
      )
      .unique();
    const pricingTopic = await ctx.db
      .query("conversationTopics")
      .withIndex("by_orgId_and_slug", (q) =>
        q.eq("orgId", "org-123").eq("slug", "pricing-questions"),
      )
      .unique();
    return { assignments, metrics, deliveryTopic, pricingTopic };
  });

  expect(after.assignments).toHaveLength(1);
  expect(after.metrics.filter((metric) => metric.metric === "topicMentionCount")).toHaveLength(1);
  expect(after.assignments[0]?.topicId).toBe(after.pricingTopic?._id);
  expect(after.deliveryTopic?.totalCount).toBe(0);
});

test("combined insights persist sentiment and advance the shared watermark", async () => {
  const t = convexTest(schema, modules);
  registerAnalyticsAggregate(t);
  const { conversationId, now } = await insertAnalyticsFixture(t);

  await t.mutation(internal.analyticsTopicRecords.assignConversationTopic, {
    conversationId,
    sourceMessageMaxCreatedAt: now + 60_000,
    topics: [
      {
        topicName: "Pricing Questions",
        confidence: 0.92,
      },
    ],
  });

  await t.mutation(internal.analyticsInsightRecords.assignConversationInsights, {
    conversationId,
    sentiment: "negative",
    sourceMessageMaxCreatedAt: now + 60_000,
  });

  const result = await t.run(async (ctx) => {
    const conversation = await ctx.db.get(conversationId);
    const assignments = await ctx.db
      .query("conversationTopicAssignments")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", conversationId))
      .take(10);
    return { conversation, assignments };
  });

  expect(result.conversation?.customerSentiment).toBe("negative");
  expect(result.conversation?.advancedAnalyticsSourceMessageMaxCreatedAt).toBe(
    now + 60_000,
  );
  expect(result.conversation?.advancedAnalyticsAnalyzedAt).toBeGreaterThan(0);
  expect(result.assignments).toHaveLength(1);
  expect(result.assignments[0]?.customerSentiment).toBe("negative");
});
