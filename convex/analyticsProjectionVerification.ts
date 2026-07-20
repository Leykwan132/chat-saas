import { v } from "convex/values";
import { analyticsMetrics } from "./aggregates";
import { internalQuery, type QueryCtx } from "./_generated/server";
import {
  channelAnalyticsNamespace,
  memberAnalyticsNamespace,
  serviceAnalyticsNamespace,
  teamAnalyticsNamespace,
  topicAnalyticsNamespace,
  type AnalyticsMetric,
  type ConversationService,
} from "./analyticsMetricModel";

type NamespaceComparison = {
  metric: AnalyticsMetric;
  v1: string;
  v2: string;
};

const rangeArgs = {
  start: v.optional(v.number()),
  end: v.optional(v.number()),
};

const serviceValidator = v.union(
  v.literal("whatsapp"),
  v.literal("instagram"),
  v.literal("messenger"),
  v.literal("web"),
  v.literal("playground"),
);

function comparisonBounds(
  start: number | undefined,
  end: number | undefined,
) {
  if (start === undefined && end === undefined) return undefined;
  return {
    lower:
      start === undefined
        ? undefined
        : { key: start, inclusive: true },
    upper:
      end === undefined
        ? undefined
        : { key: end, inclusive: true },
  };
}

async function compareNamespaces(
  ctx: QueryCtx,
  comparisons: readonly NamespaceComparison[],
  start: number | undefined,
  end: number | undefined,
) {
  const bounds = comparisonBounds(start, end);
  const requests = comparisons.flatMap((comparison) =>
    [comparison.v1, comparison.v2].map((namespace) =>
      bounds === undefined ? { namespace } : { namespace, bounds },
    ),
  );
  const sums = await analyticsMetrics.sumBatch(ctx, requests);
  return Object.fromEntries(
    comparisons.map((comparison, index) => {
      const v1 = sums[index * 2] ?? 0;
      const v2 = sums[index * 2 + 1] ?? 0;
      return [
        comparison.metric,
        { v1, v2, delta: v2 - v1 },
      ];
    }),
  );
}

function versionedComparison(
  metric: AnalyticsMetric,
  namespace: (version: "v1" | "v2") => string,
): NamespaceComparison {
  return {
    metric,
    v1: namespace("v1"),
    v2: namespace("v2"),
  };
}

export const compareTeam = internalQuery({
  args: {
    orgId: v.string(),
    ...rangeArgs,
  },
  handler: async (ctx, args) =>
    await compareNamespaces(
      ctx,
      [
        "conversationCount",
        "activeConversationCount",
        "convertedCount",
        "conversionDurationMs",
        "droppedCount",
        "firstReplyCount",
        "firstReplyDurationMs",
      ].map((metric) =>
        versionedComparison(
          metric as AnalyticsMetric,
          (version) =>
            teamAnalyticsNamespace(
              version,
              args.orgId,
              metric as AnalyticsMetric,
            ),
        ),
      ),
      args.start,
      args.end,
    ),
});

export const compareMember = internalQuery({
  args: {
    orgId: v.string(),
    memberUserId: v.string(),
    ...rangeArgs,
  },
  handler: async (ctx, args) =>
    await compareNamespaces(
      ctx,
      [
        "assignedConversationCount",
        "avgMessagesPerConversationDenominator",
        "activeConversationCount",
        "convertedCount",
        "conversionDurationMs",
        "droppedCount",
        "firstHumanReplyCount",
        "firstHumanReplyDurationMs",
        "messageSentCount",
      ].map((metric) =>
        versionedComparison(
          metric as AnalyticsMetric,
          (version) =>
            memberAnalyticsNamespace(
              version,
              args.orgId,
              args.memberUserId,
              metric as AnalyticsMetric,
            ),
        ),
      ),
      args.start,
      args.end,
    ),
});

function channelComparisons(
  namespace: (
    version: "v1" | "v2",
    metric: AnalyticsMetric,
  ) => string,
) {
  return [
    "channelConversationCount",
    "channelConvertedCount",
  ].map((metric) =>
    versionedComparison(
      metric as AnalyticsMetric,
      (version) => namespace(version, metric as AnalyticsMetric),
    ),
  );
}

export const compareService = internalQuery({
  args: {
    orgId: v.string(),
    service: serviceValidator,
    ...rangeArgs,
  },
  handler: async (ctx, args) =>
    await compareNamespaces(
      ctx,
      channelComparisons((version, metric) =>
        serviceAnalyticsNamespace(
          version,
          args.orgId,
          args.service as ConversationService,
          metric,
        ),
      ),
      args.start,
      args.end,
    ),
});

export const compareChannel = internalQuery({
  args: {
    orgId: v.string(),
    channelId: v.id("channels"),
    ...rangeArgs,
  },
  handler: async (ctx, args) =>
    await compareNamespaces(
      ctx,
      channelComparisons((version, metric) =>
        channelAnalyticsNamespace(
          version,
          args.orgId,
          args.channelId,
          metric,
        ),
      ),
      args.start,
      args.end,
    ),
});

export const compareTopic = internalQuery({
  args: {
    orgId: v.string(),
    topicId: v.id("conversationTopics"),
    ...rangeArgs,
  },
  handler: async (ctx, args) =>
    await compareNamespaces(
      ctx,
      [
        versionedComparison(
          "topicMentionCount",
          (version) =>
            topicAnalyticsNamespace(
              version,
              args.orgId,
              args.topicId,
            ),
        ),
      ],
      args.start,
      args.end,
    ),
});

export const inspectConversation = internalQuery({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const state = await ctx.db
      .query("conversationAnalyticsProjectionStates")
      .withIndex("by_conversationId", (query) =>
        query.eq("conversationId", args.conversationId),
      )
      .unique();
    const metricRows = await ctx.db
      .query("analyticsMetricEntries")
      .withIndex("by_sourceConversationId_and_sourceKey", (query) =>
        query
          .eq("sourceConversationId", args.conversationId)
          .gte("sourceKey", "v2:")
          .lt("sourceKey", "v2;"),
      )
      .take(50);
    const sourceKeyCounts = new Map<string, number>();
    for (const row of metricRows) {
      sourceKeyCounts.set(
        row.sourceKey,
        (sourceKeyCounts.get(row.sourceKey) ?? 0) + 1,
      );
    }
    const duplicateSourceKeys = [...sourceKeyCounts]
      .filter(([, count]) => count > 1)
      .map(([sourceKey]) => sourceKey);
    return { state, metricRows, duplicateSourceKeys };
  },
});
