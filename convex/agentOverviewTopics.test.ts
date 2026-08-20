/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import {
  createAgentOverviewFixture,
  enableAgentOverviewTopicAnalytics,
  insertAgentOverviewConversation,
  registerAgentOverviewAggregateComponents,
} from "./agentOverviewTestHelpers";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

function createOverviewTest() {
  const t = convexTest(schema, modules);
  registerAgentOverviewAggregateComponents(t);
  return t;
}

test("returns customer sentiment distribution for a Growth workspace", async () => {
  const t = createOverviewTest();
  const { authed, agentId, now } = await createAgentOverviewFixture(t);
  const positiveConversationId = await insertAgentOverviewConversation(t, { agentId, now });
  const negativeConversationId = await insertAgentOverviewConversation(t, { agentId, now: now + 1 });
  await enableAgentOverviewTopicAnalytics(t);

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

  expect(summary.sentimentDistribution).toEqual({ positive: 1, neutral: 0, negative: 1 });
});

test("returns distinct-customer trending topics for a Growth workspace", async () => {
  const t = createOverviewTest();
  const { authed, agentId, now } = await createAgentOverviewFixture(t);
  const conversationId = await insertAgentOverviewConversation(t, { agentId, now });
  const secondConversationId = await insertAgentOverviewConversation(t, { agentId, now: now + 1 });
  await enableAgentOverviewTopicAnalytics(t);

  await t.run(async (ctx) => {
    const topicId = await ctx.db.insert("conversationTopics", {
      orgId: "", name: "Pricing", slug: "pricing", totalCount: 1, weekCount: 1,
      lastSeenAt: now, createdAt: now, updatedAt: now,
    });
    for (const [assignedConversationId, detectedAt] of [[conversationId, now], [secondConversationId, now + 1]] as const) {
      await ctx.db.insert("conversationTopicAssignments", {
        orgId: "", conversationId: assignedConversationId, topicId, confidence: 0.9,
        detectedAt, createdAt: detectedAt, updatedAt: detectedAt,
      });
    }
  });

  const summary = await authed.query(api.agentOverview.getSummary, { agentId });

  expect(summary.trendingTopics).toEqual([
    expect.objectContaining({ topic: "Pricing", count: 1 }),
  ]);
});
