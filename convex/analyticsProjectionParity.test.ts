import { expect, test } from "vitest";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  analyticsProjectionTest,
  type AnalyticsProjectionTest,
} from "./analyticsProjection.testUtils";

async function createConversation(
  t: AnalyticsProjectionTest,
  input: {
    orgId: string;
    service: "whatsapp" | "web";
    contactAddress: string;
    assignedUserId: string;
    converted: boolean;
    dropped: boolean;
    messageStart: number;
    agentId: Id<"agents">;
  },
) {
  return await t.run(async (ctx) => {
    const channelId = await ctx.db.insert("channels", {
      orgId: input.orgId,
      service: input.service,
      phoneNumberId:
        input.service === "whatsapp" ? "phone-parity" : undefined,
      status: "connected",
      connectedByUserId: input.assignedUserId,
      createdAt: 1000,
      updatedAt: 1000,
    });
    const customerId = await ctx.db.insert("customers", {
      orgId: input.orgId,
      service: input.service,
      contactAddress: input.contactAddress,
      tags: [],
      leadTemperature: input.dropped ? "Cold" : "Warm",
      source: input.service,
      firstSeenAt: 1000,
      lastSeenAt: 1000,
      createdAt: 1000,
      updatedAt: 1000,
    });
    const conversationId = await ctx.db.insert("conversations", {
      orgId: input.orgId,
      channelId,
      service: input.service,
      orgAddress: `${input.service}-org`,
      contactAddress: input.contactAddress,
      customerId,
      status: "open",
      tags: input.converted ? ["Converted"] : [],
      assignedAgentId: input.agentId,
      assignedUserId: input.assignedUserId,
      assignToAiAgent: true,
      threadId: `thread-${input.contactAddress}`,
      lastMessageAt: input.messageStart + 200,
      unreadCount: 0,
      createdAt: 1000,
      updatedAt: 1000,
    });
    await ctx.db.patch(customerId, { lastConversationId: conversationId });
    await ctx.db.insert("messages", {
      orgId: input.orgId,
      conversationId,
      channelId,
      service: input.service,
      orgAddress: `${input.service}-org`,
      contactAddress: input.contactAddress,
      direction: "incoming",
      contentType: "text",
      content: "Customer question",
      createdAt: input.messageStart,
    });
    await ctx.db.insert("messages", {
      orgId: input.orgId,
      conversationId,
      channelId,
      service: input.service,
      orgAddress: `${input.service}-org`,
      contactAddress: input.contactAddress,
      direction: "outgoing",
      agentId: input.agentId,
      contentType: "text",
      content: "AI response",
      status: "sent",
      createdAt: input.messageStart + 100,
    });
    await ctx.db.insert("messages", {
      orgId: input.orgId,
      conversationId,
      channelId,
      service: input.service,
      orgAddress: `${input.service}-org`,
      contactAddress: input.contactAddress,
      direction: "outgoing",
      authorUserId: input.assignedUserId,
      contentType: "text",
      content: "Human response",
      status: "sent",
      createdAt: input.messageStart + 200,
    });
    return { channelId, customerId, conversationId };
  });
}

async function createParityFixture() {
  const t = analyticsProjectionTest();
  const orgId = "org-parity";
  const agentId = await t.run(async (ctx) =>
    await ctx.db.insert("agents", {
      name: "Parity Agent",
      provider: "openrouter",
      model: "deepseek/deepseek-v4-flash",
      systemPrompt: "Parity",
      templateKey: "blank",
      fileSize: 0,
      userId: "member-1",
      orgId,
      createdAt: 1000,
      updatedAt: 1000,
    }),
  );
  const first = await createConversation(t, {
    orgId,
    service: "whatsapp",
    contactAddress: "+60111111111",
    assignedUserId: "member-1",
    converted: true,
    dropped: false,
    messageStart: 2000,
    agentId,
  });
  const second = await createConversation(t, {
    orgId,
    service: "web",
    contactAddress: "visitor-parity",
    assignedUserId: "member-2",
    converted: false,
    dropped: true,
    messageStart: 3000,
    agentId,
  });
  const topicIds = await t.run(async (ctx) => {
    const firstTopicId = await ctx.db.insert("conversationTopics", {
      orgId,
      name: "Sales",
      slug: "sales",
      totalCount: 1,
      weekCount: 1,
      lastSeenAt: 4000,
      createdAt: 1000,
      updatedAt: 1000,
    });
    const secondTopicId = await ctx.db.insert("conversationTopics", {
      orgId,
      name: "Support",
      slug: "support",
      totalCount: 1,
      weekCount: 1,
      lastSeenAt: 4000,
      createdAt: 1000,
      updatedAt: 1000,
    });
    for (const [conversationId, topicId, detectedAt] of [
      [first.conversationId, firstTopicId, 2500],
      [second.conversationId, secondTopicId, 3500],
    ] as const) {
      await ctx.db.insert("conversationTopicAssignments", {
        orgId,
        conversationId,
        topicId,
        confidence: 1,
        rank: 0,
        detectedAt,
        createdAt: detectedAt,
        updatedAt: detectedAt,
      });
    }
    return { firstTopicId, secondTopicId };
  });
  for (const conversationId of [
    first.conversationId,
    second.conversationId,
  ]) {
    await t.mutation(internal.analytics.syncConversationAnalytics, {
      conversationId,
    });
    await t.mutation(
      internal.analyticsProjectionRepair.repairConversation,
      { conversationId },
    );
  }
  return { t, orgId, first, second, ...topicIds };
}

test("v1 and v2 projections match across every bounded dimension", async () => {
  const fixture = await createParityFixture();
  expect(
    await fixture.t.query(
      internal.analyticsProjectionVerification.compareTeam,
      { orgId: fixture.orgId },
    ),
  ).toMatchObject({
    conversationCount: { v1: 2, v2: 2, delta: 0 },
    convertedCount: { v1: 1, v2: 1, delta: 0 },
    droppedCount: { v1: 1, v2: 1, delta: 0 },
    firstReplyCount: { v1: 2, v2: 2, delta: 0 },
  });
  expect(
    await fixture.t.query(
      internal.analyticsProjectionVerification.compareMember,
      { orgId: fixture.orgId, memberUserId: "member-1" },
    ),
  ).toMatchObject({
    assignedConversationCount: { v1: 1, v2: 1, delta: 0 },
    messageSentCount: { v1: 1, v2: 1, delta: 0 },
  });
  expect(
    await fixture.t.query(
      internal.analyticsProjectionVerification.compareService,
      { orgId: fixture.orgId, service: "whatsapp" },
    ),
  ).toEqual({
    channelConversationCount: { v1: 1, v2: 1, delta: 0 },
    channelConvertedCount: { v1: 1, v2: 1, delta: 0 },
  });
  expect(
    await fixture.t.query(
      internal.analyticsProjectionVerification.compareChannel,
      {
        orgId: fixture.orgId,
        channelId: fixture.second.channelId,
      },
    ),
  ).toEqual({
    channelConversationCount: { v1: 1, v2: 1, delta: 0 },
    channelConvertedCount: { v1: 0, v2: 0, delta: 0 },
  });
  expect(
    await fixture.t.query(
      internal.analyticsProjectionVerification.compareTopic,
      { orgId: fixture.orgId, topicId: fixture.firstTopicId },
    ),
  ).toEqual({
    topicMentionCount: { v1: 1, v2: 1, delta: 0 },
  });
});

test("versioned rows remain isolated and legacy refresh preserves v2", async () => {
  const fixture = await createParityFixture();
  const before = await fixture.t.query(
    internal.analyticsProjectionVerification.inspectConversation,
    { conversationId: fixture.first.conversationId },
  );
  expect(before.duplicateSourceKeys).toEqual([]);
  expect(
    before.metricRows.every(
      (row) =>
        row.namespace.startsWith("v2:") &&
        row.sourceKey.startsWith("v2:"),
    ),
  ).toBe(true);

  await fixture.t.mutation(internal.analytics.syncConversationAnalytics, {
    conversationId: fixture.first.conversationId,
  });
  const after = await fixture.t.query(
    internal.analyticsProjectionVerification.inspectConversation,
    { conversationId: fixture.first.conversationId },
  );
  expect(after.metricRows).toEqual(before.metricRows);

  const allRows = await fixture.t.run(async (ctx) =>
    await ctx.db.query("analyticsMetricEntries").take(100),
  );
  expect(
    allRows.every((row) =>
      row.sourceKey.startsWith("v2:")
        ? row.namespace.startsWith("v2:")
        : !row.namespace.startsWith("v2:"),
    ),
  ).toBe(true);
});
