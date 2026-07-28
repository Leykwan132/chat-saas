/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import {
  createAgentOverviewFixture as createFixture,
  insertAgentOverviewConversation as insertConversation,
  registerAgentOverviewAggregateComponents,
} from "./agentOverviewTestHelpers";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

function createOverviewTest() {
  const t = convexTest(schema, modules);
  registerAgentOverviewAggregateComponents(t);
  return t;
}

test("returns empty overview for an agent with no activity", async () => {
  const t = createOverviewTest();
  const { authed, agentId } = await createFixture(t);

  const summary = await authed.query(api.agentOverview.getSummary, { agentId });

  expect([summary.totalMessagesSent, summary.messagesSentByAgent]).toEqual([0, 0]);
  expect(summary.bookedAppointments).toBe(0);
  expect(summary.conversationCount).toBe(0);
  expect(summary.aiAssistedConversationCount).toBe(0);
  expect(summary.bookedRate).toBeNull();
  expect(summary.avgMessagesToClose).toBeNull();
  expect(summary.sentimentDistribution).toEqual({
    positive: 0,
    neutral: 0,
    negative: 0,
  });
  expect(summary.trendingTopics).toEqual([]);
  expect(summary.daily.length).toBeGreaterThan(0);
  expect(summary.daily.every((row) => row.messages === 0 && row.aiMessages === 0 && row.aiAssistedConversations === 0 && row.bookings === 0)).toBe(true);
});

test("credit-only data does not create operational overview metrics", async () => {
  const t = createOverviewTest();
  const { authed, agentId, userId, now } = await createFixture(t);

  await t.run(async (ctx) => {
    const creditLogId = await ctx.db.insert("creditLogs", {
      orgId: "",
      userId,
      amount: -12,
      type: "deduction",
      eventType: "usage",
      balanceBefore: 100,
      balanceAfter: 88,
      creditCost: 12,
      modelId: "deepseek/deepseek-v4-flash",
      agentId,
      createdAt: now,
    });
    await ctx.db.insert("creditUsageEvents", {
      userId,
      orgId: "",
      agentId,
      modelId: "deepseek/deepseek-v4-flash",
      credits: 12,
      creditLogId,
      createdAt: now,
    });
  });

  const summary = await authed.query(api.agentOverview.getSummary, { agentId });

  expect([summary.totalMessagesSent, summary.messagesSentByAgent]).toEqual([0, 0]);
  expect(summary.bookedAppointments).toBe(0);
  expect(summary.bookedRate).toBeNull();
  expect(summary.avgMessagesToClose).toBeNull();
});

test("rolling time ranges ignore the billing period start", async () => {
  const t = createOverviewTest();
  const { authed, agentId, teamId, userId, now } = await createFixture(t);
  const dayMs = 24 * 60 * 60 * 1000; const oldAt = now - 15 * dayMs;
  const conversationId = await insertConversation(t, { agentId, now: oldAt });

  await t.run(async (ctx) => {
    await ctx.db.patch(userId, {
      stripeSubscriptionCurrentPeriodEnd: now + 30 * dayMs,
      updatedAt: now,
    });
    await ctx.db.insert("messages", {
      orgId: "",
      conversationId,
      service: "whatsapp",
      orgAddress: "business",
      contactAddress: "+60123456789",
      contentType: "text",
      content: "AI reply",
      direction: "outgoing",
      agentId,
      status: "sent",
      createdAt: oldAt,
    });
    await ctx.db.insert("calendarEvents", {
      teamId,
      title: "Consultation - Customer",
      startAt: oldAt + 3_600_000,
      endAt: oldAt + 5_400_000,
      timeZone: "UTC",
      status: "confirmed",
      createdBy: userId,
      agentId,
      conversationId,
      bookingSource: "ai",
      createdAt: oldAt,
      updatedAt: oldAt,
    });
  });

  const sevenDays = await authed.query(api.agentOverview.getSummary, { agentId, timeRange: "7d" });
  const thirtyDays = await authed.query(api.agentOverview.getSummary, { agentId, timeRange: "30d" });

  expect([sevenDays.totalMessagesSent, sevenDays.messagesSentByAgent, sevenDays.bookedAppointments]).toEqual([0, 0, 0]);
  expect([thirtyDays.totalMessagesSent, thirtyDays.messagesSentByAgent, thirtyDays.bookedAppointments]).toEqual([1, 1, 1]);
});

test("averages customer and AI messages before an AI booked appointment", async () => {
  const t = createOverviewTest();
  const { authed, agentId, teamId, userId, now } = await createFixture(t);
  const conversationId = await insertConversation(t, { agentId, now });

  await t.run(async (ctx) => {
    const baseMessage = {
      orgId: "",
      conversationId,
      service: "whatsapp" as const,
      orgAddress: "business",
      contactAddress: "+60123456789",
      contentType: "text" as const,
      content: "Message",
    };
    await ctx.db.insert("messages", {
      ...baseMessage,
      direction: "incoming",
      createdAt: now - 3000,
    });
    await ctx.db.insert("messages", {
      ...baseMessage,
      direction: "outgoing",
      agentId,
      status: "sent",
      createdAt: now - 2000,
    });
    await ctx.db.insert("messages", {
      ...baseMessage,
      direction: "incoming",
      createdAt: now - 1000,
    });
    await ctx.db.insert("messages", {
      ...baseMessage,
      direction: "outgoing",
      authorUserId: "human-user",
      status: "sent",
      createdAt: now - 500,
    });
    await ctx.db.insert("calendarEvents", {
      teamId,
      title: "Consultation - Customer",
      startAt: now + 3_600_000,
      endAt: now + 5_400_000,
      timeZone: "UTC",
      status: "confirmed",
      createdBy: userId,
      agentId,
      conversationId,
      bookingSource: "ai",
      createdAt: now,
      updatedAt: now,
    });
  });

  const summary = await authed.query(api.agentOverview.getSummary, { agentId });

  expect(summary.conversationCount).toBe(1);
  expect(summary.aiAssistedConversationCount).toBe(1);
  expect([summary.totalMessagesSent, summary.messagesSentByAgent, summary.bookedAppointments]).toEqual([2, 1, 1]);
  expect(summary.bookedRate).toBe(1);
  expect(summary.avgMessagesToClose).toBe(3);
  expect(summary.daily.some((row) => row.messages === 2 && row.aiMessages === 1 && row.bookings === 1 && row.messagesToClose === 3)).toBe(true);
});

test("counts AI escalation events for the agent", async () => {
  const t = createOverviewTest();
  const { authed, agentId, now } = await createFixture(t);
  const conversationId = await insertConversation(t, { agentId, now });

  await t.run(async (ctx) => {
    await ctx.db.insert("conversationLogs", {
      conversationId,
      orgId: "",
      action: "escalation_raised",
      actorType: "ai",
      actorName: "Overview Agent",
      actorAgentId: agentId,
      performedAt: now,
    });
  });

  const summary = await authed.query(api.agentOverview.getSummary, { agentId });

  expect(summary.escalations).toBe(1);
  expect(summary.daily.some((row) => row.escalations === 1)).toBe(true);
});

test("returns customer sentiment distribution for analyzed conversations", async () => {
  const t = createOverviewTest();
  const { authed, agentId, now } = await createFixture(t);
  const positiveConversationId = await insertConversation(t, { agentId, now });
  const negativeConversationId = await insertConversation(t, { agentId, now: now + 1 });

  await t.run(async (ctx) => {
    await ctx.db.patch(positiveConversationId, {
      customerSentiment: "positive",
      sentimentAnalyzedAt: now,
      sentimentSourceMessageMaxCreatedAt: now,
    });
    await ctx.db.patch(negativeConversationId, {
      customerSentiment: "negative",
      sentimentAnalyzedAt: now,
      sentimentSourceMessageMaxCreatedAt: now,
    });
  });

  const summary = await authed.query(api.agentOverview.getSummary, { agentId });

  expect(summary.sentimentDistribution).toEqual({
    positive: 1,
    neutral: 0,
    negative: 1,
  });
});

test("returns trending topics for agent conversations in the period", async () => {
  const t = createOverviewTest();
  const { authed, agentId, now } = await createFixture(t);
  const conversationId = await insertConversation(t, { agentId, now });

  await t.run(async (ctx) => {
    const topicId = await ctx.db.insert("conversationTopics", {
      orgId: "",
      name: "Pricing",
      slug: "pricing",
      totalCount: 1,
      weekCount: 1,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("conversationTopicAssignments", {
      orgId: "",
      conversationId,
      topicId,
      confidence: 0.9,
      detectedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  });

  const summary = await authed.query(api.agentOverview.getSummary, { agentId });

  expect(summary.trendingTopics).toEqual([
    expect.objectContaining({ topic: "Pricing", count: 1 }),
  ]);
});
