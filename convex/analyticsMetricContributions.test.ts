import { expect, test } from "vitest";
import type { Id } from "./_generated/dataModel";
import {
  ensureMetricContribution,
  reconcileMetricContributions,
  removeMetricContribution,
  replaceMetricContribution,
  type AnalyticsMetricContribution,
} from "./analyticsMetricContributions";
import {
  analyticsProjectionTest,
  type AnalyticsProjectionTest,
} from "./analyticsProjection.testUtils";

function teamConversationContribution(
  conversationId: Id<"conversations">,
  sortKey: number,
): AnalyticsMetricContribution {
  return {
    namespace: "v2:team:org-1:metric:conversationCount",
    sortKey,
    value: 1,
    metric: "conversationCount",
    orgId: "org-1",
    sourceConversationId: conversationId,
    sourceKey: `v2:conversation:${conversationId}:team:conversationCount`,
  };
}

async function insertConversationId(test: AnalyticsProjectionTest) {
  return await test.run(async (ctx) => {
    const now = 1_700_000_000_000;
    return await ctx.db.insert("conversations", {
      orgId: "org-1",
      service: "web",
      orgAddress: "widget-1",
      contactAddress: "visitor-1",
      status: "open",
      tags: [],
      assignToAiAgent: false,
      threadId: "thread-1",
      lastMessageAt: now,
      unreadCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  });
}

async function metricRowsBySourceKey(
  test: AnalyticsProjectionTest,
  sourceKey: string,
) {
  return await test.run(async (ctx) =>
    await ctx.db
      .query("analyticsMetricEntries")
      .withIndex("by_sourceKey", (query) => query.eq("sourceKey", sourceKey))
      .take(3),
  );
}

test("ensure inserts once and duplicate retry is a no-op", async () => {
  const convex = analyticsProjectionTest();
  const conversationId = await insertConversationId(convex);
  const desired = teamConversationContribution(conversationId, 1000);
  await convex.run(async (ctx) => ensureMetricContribution(ctx, desired));
  await convex.run(async (ctx) => ensureMetricContribution(ctx, desired));
  const rows = await metricRowsBySourceKey(convex, desired.sourceKey);
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ value: 1, sortKey: 1000 });
});

test("ensure patches changes without changing createdAt", async () => {
  const convex = analyticsProjectionTest();
  const conversationId = await insertConversationId(convex);
  const original = teamConversationContribution(conversationId, 1000);
  await convex.run(async (ctx) => ensureMetricContribution(ctx, original));
  const before = (await metricRowsBySourceKey(convex, original.sourceKey))[0]!;
  await convex.run(async (ctx) =>
    replaceMetricContribution(ctx, { ...original, sortKey: 900 }),
  );
  const after = (await metricRowsBySourceKey(convex, original.sourceKey))[0]!;
  expect(after.sortKey).toBe(900);
  expect(after.createdAt).toBe(before.createdAt);
  expect(after.updatedAt).toBeGreaterThanOrEqual(before.updatedAt);
});

test("remove and retrying removal are idempotent", async () => {
  const convex = analyticsProjectionTest();
  const conversationId = await insertConversationId(convex);
  const desired = teamConversationContribution(conversationId, 1000);
  await convex.run(async (ctx) => ensureMetricContribution(ctx, desired));
  await convex.run(async (ctx) =>
    removeMetricContribution(ctx, desired.sourceKey),
  );
  await convex.run(async (ctx) =>
    removeMetricContribution(ctx, desired.sourceKey),
  );
  expect(await metricRowsBySourceKey(convex, desired.sourceKey)).toEqual([]);
});

test("duplicate source keys fail visibly", async () => {
  const convex = analyticsProjectionTest();
  const conversationId = await insertConversationId(convex);
  const desired = teamConversationContribution(conversationId, 1000);
  await convex.run(async (ctx) => {
    await ctx.db.insert("analyticsMetricEntries", {
      ...desired,
      createdAt: 1000,
      updatedAt: 1000,
    });
    await ctx.db.insert("analyticsMetricEntries", {
      ...desired,
      createdAt: 1001,
      updatedAt: 1001,
    });
  });
  await expect(
    convex.run(async (ctx) => ensureMetricContribution(ctx, desired)),
  ).rejects.toThrow();
});

test("reconcile inserts desired rows and removes obsolete rows", async () => {
  const convex = analyticsProjectionTest();
  const conversationId = await insertConversationId(convex);
  const desired = teamConversationContribution(conversationId, 1000);
  const obsolete = {
    ...teamConversationContribution(conversationId, 900),
    sourceKey: `v2:conversation:${conversationId}:team:activeConversationCount`,
    metric: "activeConversationCount" as const,
    namespace: "v2:team:org-1:metric:activeConversationCount",
  };
  await convex.run(async (ctx) => ensureMetricContribution(ctx, obsolete));
  await convex.run(async (ctx) =>
    reconcileMetricContributions(
      ctx,
      [desired],
      [desired.sourceKey, obsolete.sourceKey],
    ),
  );
  expect(await metricRowsBySourceKey(convex, desired.sourceKey)).toHaveLength(1);
  expect(await metricRowsBySourceKey(convex, obsolete.sourceKey)).toEqual([]);
});
