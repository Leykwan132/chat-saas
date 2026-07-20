import { afterEach, expect, test, vi } from "vitest";
import { internal } from "./_generated/api";
import {
  memberAnalyticsNamespace,
  v2MessageSourceKey,
} from "./analyticsMetricModel";
import { markConversationAnalyticsDirty } from "./analyticsDirtyRequest";
import {
  createProjectionFixture,
  type AnalyticsProjectionFixture,
} from "./analyticsProjection.testUtils";

afterEach(() => {
  vi.useRealTimers();
});

async function createDirtyFixtureWithMoreThanOnePage(
  fixture: AnalyticsProjectionFixture,
) {
  for (let index = 0; index < 52; index += 1) {
    await fixture.insertMessage(
      index === 0 ? "incoming" : "outgoing",
      1000 + index,
      index === 0 ? undefined : "member-1",
    );
  }
  return await fixture.t.run(async (ctx) =>
    await markConversationAnalyticsDirty(ctx, {
      conversationId: fixture.conversationId,
      earliestDirtyMessageAt: 1000,
      requestedAt: 2000,
    }),
  );
}

test("unchanged revision completes every page and deletes request", async () => {
  vi.useFakeTimers();
  const fixture = await createProjectionFixture();
  const requestId = await createDirtyFixtureWithMoreThanOnePage(fixture);
  await fixture.t.mutation(internal.analyticsProjectionWorker.run, {
    requestId,
  });
  await fixture.t.finishAllScheduledFunctions(vi.runAllTimers);
  expect(await fixture.t.run(async (ctx) => await ctx.db.get(requestId)))
    .toBeNull();
  expect(await fixture.metricRows("messageSentCount")).toHaveLength(51);
});

test("changed revision stops stale chain and retains request", async () => {
  vi.useFakeTimers();
  const fixture = await createProjectionFixture();
  const requestId = await createDirtyFixtureWithMoreThanOnePage(fixture);
  await fixture.t.mutation(internal.analyticsProjectionWorker.run, {
    requestId,
  });
  await fixture.t.run(async (ctx) =>
    await markConversationAnalyticsDirty(ctx, {
      conversationId: fixture.conversationId,
      earliestDirtyMessageAt: 900,
      requestedAt: 3000,
    }),
  );
  await fixture.t.finishAllScheduledFunctions(vi.runAllTimers);
  expect(await fixture.t.run(async (ctx) => await ctx.db.get(requestId)))
    .toMatchObject({ revision: 2, earliestDirtyMessageAt: 900 });
});

test("failed projection leaves dirty request retryable", async () => {
  const fixture = await createProjectionFixture();
  const messageId = await fixture.insertMessage(
    "outgoing",
    1000,
    "member-1",
  );
  const duplicate = {
    namespace: memberAnalyticsNamespace(
      "v2",
      fixture.orgId,
      "member-1",
      "messageSentCount",
    ),
    sortKey: 1000,
    value: 1,
    metric: "messageSentCount" as const,
    orgId: fixture.orgId,
    memberUserId: "member-1",
    service: "whatsapp" as const,
    channelId: fixture.channelId,
    sourceConversationId: fixture.conversationId,
    sourceMessageId: messageId,
    sourceKey: v2MessageSourceKey(
      messageId,
      "member:messageSentCount",
    ),
  };
  await fixture.t.run(async (ctx) => {
    await ctx.db.insert("analyticsMetricEntries", {
      ...duplicate,
      createdAt: 1000,
      updatedAt: 1000,
    });
    await ctx.db.insert("analyticsMetricEntries", {
      ...duplicate,
      createdAt: 1001,
      updatedAt: 1001,
    });
  });
  const requestId = await fixture.t.run(async (ctx) =>
    await markConversationAnalyticsDirty(ctx, {
      conversationId: fixture.conversationId,
      earliestDirtyMessageAt: 1000,
      requestedAt: 2000,
    }),
  );
  await expect(
    fixture.t.mutation(internal.analyticsProjectionWorker.run, {
      requestId,
    }),
  ).rejects.toThrow(/unique|more than one/i);
  expect(await fixture.t.run(async (ctx) => await ctx.db.get(requestId)))
    .toMatchObject({ revision: 1, nextAttemptAt: 2000 });
});
