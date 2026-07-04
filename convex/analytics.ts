import { v } from "convex/values";
import { query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { internalMutation } from "./triggers";
import type { Doc, Id } from "./_generated/dataModel";
import { getAuthContext } from "./authUtils";
import { Permission } from "../shared/permissions";
import { workosOrgRoleSlug } from "../shared/teamRoleCatalog";

import { analyticsMetrics } from "./aggregates";
import { checkAiFeature, getTeamStripePlanHelper } from "./plans";
import { getLast6CalendarMonths } from "./usageMonthKey";
import {
  CUSTOMER_SENTIMENTS,
  type CustomerSentiment,
} from "../shared/customerSentiment";

const CHANNEL_SERVICES: ConversationService[] = ["whatsapp", "instagram", "messenger", "web"];

const rangeValidator = v.union(
  v.literal("7d"),
  v.literal("30d"),
  v.literal("90d"),
  v.literal("all"),
);

type AnalyticsMetric = Doc<"analyticsMetricEntries">["metric"];
type ConversationService = Doc<"conversations">["service"];
type RangeKey = "7d" | "30d" | "90d" | "all";

const CONVERTED_TAG = "converted";
const TOPIC_RANGE_LIMIT = 250;
const MESSAGE_ANALYTICS_LIMIT = 500;

function emptyTopicsResponse() {
  return { topTopics: [], trendingTopics: [], bubbles: [], tableRows: [] };
}

function emptySentimentCounts(): Record<CustomerSentiment, number> {
  return { positive: 0, neutral: 0, negative: 0 };
}

function dominantSentiment(
  counts: Record<CustomerSentiment, number>,
): CustomerSentiment | null {
  const ranked = CUSTOMER_SENTIMENTS
    .map((sentiment) => ({ sentiment, count: counts[sentiment] }))
    .filter((entry) => entry.count > 0)
    .sort((left, right) => right.count - left.count);
  return ranked[0]?.sentiment ?? null;
}

async function getOrgSentimentDistribution(
  ctx: QueryCtx,
  orgId: string,
  range: RangeKey,
) {
  const start = rangeStart(range);
  const assignments = await ctx.db
    .query("conversationTopicAssignments")
    .withIndex("by_orgId_and_detectedAt", (q) =>
      start === null
        ? q.eq("orgId", orgId)
        : q.eq("orgId", orgId).gte("detectedAt", start),
    )
    .collect();

  const sentimentDistribution = emptySentimentCounts();
  const seenConversations = new Set<string>();

  for (const assignment of assignments) {
    if (!assignment.customerSentiment) continue;
    if (seenConversations.has(assignment.conversationId)) continue;
    seenConversations.add(assignment.conversationId);
    sentimentDistribution[assignment.customerSentiment] += 1;
  }

  return sentimentDistribution;
}

async function getSentimentByTopicId(
  ctx: QueryCtx,
  orgId: string,
  topicIds: Set<string>,
  range: RangeKey,
) {
  const start = rangeStart(range);
  const assignments = await ctx.db
    .query("conversationTopicAssignments")
    .withIndex("by_orgId_and_detectedAt", (q) =>
      start === null
        ? q.eq("orgId", orgId)
        : q.eq("orgId", orgId).gte("detectedAt", start),
    )
    .collect();

  const countsByTopicId = new Map<string, Record<CustomerSentiment, number>>();

  for (const assignment of assignments) {
    if (!topicIds.has(assignment.topicId)) continue;
    if (!assignment.customerSentiment) continue;
    const current = countsByTopicId.get(assignment.topicId) ?? emptySentimentCounts();
    current[assignment.customerSentiment] += 1;
    countsByTopicId.set(assignment.topicId, current);
  }

  const sentimentByTopicId = new Map<string, CustomerSentiment | null>();
  for (const topicId of topicIds) {
    const counts = countsByTopicId.get(topicId) ?? emptySentimentCounts();
    sentimentByTopicId.set(topicId, dominantSentiment(counts));
  }

  return sentimentByTopicId;
}

function hasConvertedTag(tags: string[] | undefined) {
  return (tags ?? []).some((tag) => tag.trim().toLowerCase() === CONVERTED_TAG);
}

function teamNamespace(orgId: string, metric: AnalyticsMetric) {
  return `team:${orgId}:metric:${metric}`;
}

function memberNamespace(orgId: string, memberUserId: string, metric: AnalyticsMetric) {
  return `member:${orgId}:${memberUserId}:metric:${metric}`;
}

function serviceNamespace(orgId: string, service: ConversationService, metric: AnalyticsMetric) {
  return `channel:${orgId}:service:${service}:metric:${metric}`;
}

function channelNamespace(orgId: string, channelId: Id<"channels">, metric: AnalyticsMetric) {
  return `channel:${orgId}:id:${channelId}:metric:${metric}`;
}

function topicNamespace(orgId: string, topicId: Id<"conversationTopics">) {
  return `topic:${orgId}:${topicId}:metric:topicMentionCount`;
}

function rangeStart(range: RangeKey, now = Date.now()) {
  if (range === "all") return null;
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  return now - days * 24 * 60 * 60 * 1000;
}

function rangeBounds(range: RangeKey, now = Date.now()) {
  const start = rangeStart(range, now);
  if (start === null) return undefined;
  return {
    lower: { key: start, inclusive: true },
    upper: { key: now, inclusive: true },
  };
}

function formatDuration(ms: number | null) {
  if (ms === null || !Number.isFinite(ms)) return "—";
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round((minutes / 60) * 10) / 10;
  if (hours < 48) return `${hours}h`;
  const days = Math.round((hours / 24) * 10) / 10;
  return `${days}d`;
}

function pct(numerator: number, denominator: number) {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function formatPct(value: number) {
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
}

function displayName(user: Doc<"users">) {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || user.email || user.workosUserId;
}

async function assertAnalyticsAccess(ctx: QueryCtx) {
  const auth = await getAuthContext(ctx);
  if (auth.orgId && auth.orgId !== "personal" && !auth.permissions.includes(Permission.ANALYTICS_READ)) {
    throw new Error("Forbidden");
  }
  return auth;
}

async function canReadTeamAnalytics(
  ctx: QueryCtx,
  orgId: string,
  userId: string,
) {
  try {
    const stripeInfo = await getTeamStripePlanHelper(ctx, { workosOrgId: orgId, userId });
    return checkAiFeature(stripeInfo.plan, "team_analytics");
  } catch {
    return false;
  }
}

async function canReadTopicAnalytics(
  ctx: QueryCtx,
  orgId: string,
  userId: string,
) {
  try {
    const stripeInfo = await getTeamStripePlanHelper(ctx, { workosOrgId: orgId, userId });
    return checkAiFeature(stripeInfo.plan, "topic_analytics");
  } catch {
    return false;
  }
}

async function metricSums(
  ctx: QueryCtx,
  namespaces: string[],
  range: RangeKey,
) {
  const bounds = rangeBounds(range);
  return await analyticsMetrics.sumBatch(
    ctx,
    namespaces.map((namespace) =>
      bounds === undefined ? { namespace } : { namespace, bounds },
    ),
  );
}

function metricEntry(
  args: {
    orgId: string;
    metric: AnalyticsMetric;
    namespace: string;
    sortKey: number | undefined;
    value: number;
    sourceKey: string;
    sourceConversationId?: Id<"conversations">;
    sourceMessageId?: Id<"messages">;
    memberUserId?: string;
    service?: ConversationService;
    channelId?: Id<"channels">;
    topicId?: Id<"conversationTopics">;
  },
): Omit<Doc<"analyticsMetricEntries">, "_id" | "_creationTime"> | null {
  if (args.sortKey === undefined || !Number.isFinite(args.sortKey)) {
    return null;
  }
  const now = Date.now();
  return {
    namespace: args.namespace,
    sortKey: args.sortKey,
    value: args.value,
    metric: args.metric,
    orgId: args.orgId,
    memberUserId: args.memberUserId,
    service: args.service,
    channelId: args.channelId,
    topicId: args.topicId,
    sourceConversationId: args.sourceConversationId,
    sourceMessageId: args.sourceMessageId,
    sourceKey: args.sourceKey,
    createdAt: now,
    updatedAt: now,
  };
}

async function deleteMetricEntriesForConversation(
  ctx: MutationCtx,
  conversationId: Id<"conversations">,
) {
  const rows = await ctx.db
    .query("analyticsMetricEntries")
    .withIndex("by_sourceConversationId", (q) =>
      q.eq("sourceConversationId", conversationId),
    )
    .take(200);
  for (const row of rows) {
    await ctx.db.delete(row._id);
  }
}

async function getExistingFact(
  ctx: MutationCtx,
  conversationId: Id<"conversations">,
) {
  return await ctx.db
    .query("conversationAnalyticsFacts")
    .withIndex("by_conversationId", (q) => q.eq("conversationId", conversationId))
    .unique();
}

async function getConversationTopicAssignments(
  ctx: MutationCtx,
  conversationId: Id<"conversations">,
) {
  const assignments = await ctx.db
    .query("conversationTopicAssignments")
    .withIndex("by_conversationId", (q) => q.eq("conversationId", conversationId))
    .take(20);
  return assignments.sort(
    (a, b) =>
      (a.rank ?? Number.MAX_SAFE_INTEGER) -
        (b.rank ?? Number.MAX_SAFE_INTEGER) ||
      a._creationTime - b._creationTime,
  );
}

async function syncConversationAnalyticsHandler(
  ctx: MutationCtx,
  args: { conversationId: Id<"conversations"> },
) {
    const conversation = await ctx.db.get(args.conversationId);
    if (conversation === null || conversation.service === "playground") {
      return null;
    }

    const [existingFact, messages, customer, topicAssignments] = await Promise.all([
      getExistingFact(ctx, args.conversationId),
      ctx.db
        .query("messages")
        .withIndex("by_conversationId_and_createdAt", (q) =>
          q.eq("conversationId", args.conversationId),
        )
        .order("asc")
        .take(MESSAGE_ANALYTICS_LIMIT),
      conversation.customerId ? ctx.db.get(conversation.customerId) : null,
      getConversationTopicAssignments(ctx, args.conversationId),
    ]);

    const incoming = messages.filter((message) => message.direction === "incoming");
    const outgoing = messages.filter((message) => message.direction === "outgoing");
    const firstCustomerMessageAt = incoming[0]?.createdAt;
    const firstOutgoingAt =
      firstCustomerMessageAt === undefined
        ? undefined
        : outgoing.find((message) => message.createdAt >= firstCustomerMessageAt)
            ?.createdAt;
    const firstHumanOutgoingAt =
      firstCustomerMessageAt === undefined
        ? undefined
        : outgoing.find(
            (message) =>
              message.authorUserId !== undefined &&
              message.createdAt >= firstCustomerMessageAt,
          )?.createdAt;
    const sourceMessageMaxCreatedAt = messages.at(-1)?.createdAt;
    const converted = hasConvertedTag(conversation.tags);
    const convertedAt = converted
      ? existingFact?.convertedAt ?? Date.now()
      : undefined;
    const dropped = customer?.leadTemperature === "Cold";
    const droppedAt = dropped
      ? existingFact?.droppedAt ?? Date.now()
      : undefined;
    const conversionDurationMs =
      convertedAt !== undefined && firstCustomerMessageAt !== undefined
        ? Math.max(0, convertedAt - firstCustomerMessageAt)
        : undefined;
    const firstReplyDurationMs =
      firstOutgoingAt !== undefined && firstCustomerMessageAt !== undefined
        ? Math.max(0, firstOutgoingAt - firstCustomerMessageAt)
        : undefined;
    const firstHumanReplyDurationMs =
      firstHumanOutgoingAt !== undefined && firstCustomerMessageAt !== undefined
        ? Math.max(0, firstHumanOutgoingAt - firstCustomerMessageAt)
        : undefined;
    const now = Date.now();
    const humanMessageCount = outgoing.filter((m) => m.authorUserId !== undefined).length;
    const aiMessageCount = outgoing.filter((m) => m.agentId !== undefined && m.authorUserId === undefined).length;

    const fact = {
      orgId: conversation.orgId,
      conversationId: conversation._id,
      service: conversation.service,
      channelId: conversation.channelId,
      assignedUserId: conversation.assignedUserId,
      customerId: conversation.customerId,
      firstCustomerMessageAt,
      firstOutgoingAt,
      firstHumanOutgoingAt,
      conversionDurationMs,
      firstReplyDurationMs,
      firstHumanReplyDurationMs,
      incomingMessageCount: incoming.length,
      outgoingMessageCount: outgoing.length,
      humanMessageCount,
      aiMessageCount,
      convertedAt,
      droppedAt,
      topicId: topicAssignments[0]?.topicId,
      sourceMessageMaxCreatedAt,
      createdAt: existingFact?.createdAt ?? now,
      updatedAt: now,
    };

    if (existingFact === null) {
      await ctx.db.insert("conversationAnalyticsFacts", fact);
    } else {
      await ctx.db.patch(existingFact._id, fact);
    }

    await deleteMetricEntriesForConversation(ctx, conversation._id);

    const entries: Array<Omit<Doc<"analyticsMetricEntries">, "_id" | "_creationTime">> = [];
    const push = (entry: ReturnType<typeof metricEntry>) => {
      if (entry !== null) entries.push(entry);
    };
    const baseSource = `conversation:${conversation._id}`;
    const startedAt = firstCustomerMessageAt ?? conversation.createdAt;

    push(metricEntry({
      orgId: conversation.orgId,
      metric: "conversationCount",
      namespace: teamNamespace(conversation.orgId, "conversationCount"),
      sortKey: startedAt,
      value: 1,
      service: conversation.service,
      channelId: conversation.channelId,
      sourceConversationId: conversation._id,
      sourceKey: `${baseSource}:team:conversationCount`,
    }));
    if (conversation.status !== "closed") {
      push(metricEntry({
        orgId: conversation.orgId,
        metric: "activeConversationCount",
        namespace: teamNamespace(conversation.orgId, "activeConversationCount"),
        sortKey: conversation.lastMessageAt,
        value: 1,
        service: conversation.service,
        channelId: conversation.channelId,
        sourceConversationId: conversation._id,
        sourceKey: `${baseSource}:team:activeConversationCount`,
      }));
    }
    if (convertedAt !== undefined) {
      push(metricEntry({
        orgId: conversation.orgId,
        metric: "convertedCount",
        namespace: teamNamespace(conversation.orgId, "convertedCount"),
        sortKey: startedAt,
        value: 1,
        service: conversation.service,
        channelId: conversation.channelId,
        sourceConversationId: conversation._id,
        sourceKey: `${baseSource}:team:convertedCount`,
      }));
      push(metricEntry({
        orgId: conversation.orgId,
        metric: "conversionDurationMs",
        namespace: teamNamespace(conversation.orgId, "conversionDurationMs"),
        sortKey: startedAt,
        value: conversionDurationMs ?? 0,
        service: conversation.service,
        channelId: conversation.channelId,
        sourceConversationId: conversation._id,
        sourceKey: `${baseSource}:team:conversionDurationMs`,
      }));
    }
    if (droppedAt !== undefined) {
      push(metricEntry({
        orgId: conversation.orgId,
        metric: "droppedCount",
        namespace: teamNamespace(conversation.orgId, "droppedCount"),
        sortKey: startedAt,
        value: 1,
        service: conversation.service,
        channelId: conversation.channelId,
        sourceConversationId: conversation._id,
        sourceKey: `${baseSource}:team:droppedCount`,
      }));
    }
    if (firstReplyDurationMs !== undefined && firstOutgoingAt !== undefined) {
      push(metricEntry({
        orgId: conversation.orgId,
        metric: "firstReplyCount",
        namespace: teamNamespace(conversation.orgId, "firstReplyCount"),
        sortKey: firstOutgoingAt,
        value: 1,
        service: conversation.service,
        channelId: conversation.channelId,
        sourceConversationId: conversation._id,
        sourceKey: `${baseSource}:team:firstReplyCount`,
      }));
      push(metricEntry({
        orgId: conversation.orgId,
        metric: "firstReplyDurationMs",
        namespace: teamNamespace(conversation.orgId, "firstReplyDurationMs"),
        sortKey: firstOutgoingAt,
        value: firstReplyDurationMs,
        service: conversation.service,
        channelId: conversation.channelId,
        sourceConversationId: conversation._id,
        sourceKey: `${baseSource}:team:firstReplyDurationMs`,
      }));
    }

    push(metricEntry({
      orgId: conversation.orgId,
      metric: "channelConversationCount",
      namespace: serviceNamespace(conversation.orgId, conversation.service, "channelConversationCount"),
      sortKey: startedAt,
      value: 1,
      service: conversation.service,
      channelId: conversation.channelId,
      sourceConversationId: conversation._id,
      sourceKey: `${baseSource}:service:${conversation.service}:channelConversationCount`,
    }));
    if (convertedAt !== undefined) {
      push(metricEntry({
        orgId: conversation.orgId,
        metric: "channelConvertedCount",
        namespace: serviceNamespace(conversation.orgId, conversation.service, "channelConvertedCount"),
        sortKey: startedAt,
        value: 1,
        service: conversation.service,
        channelId: conversation.channelId,
        sourceConversationId: conversation._id,
        sourceKey: `${baseSource}:service:${conversation.service}:channelConvertedCount`,
      }));
    }
    if (conversation.channelId !== undefined) {
      push(metricEntry({
        orgId: conversation.orgId,
        metric: "channelConversationCount",
        namespace: channelNamespace(conversation.orgId, conversation.channelId, "channelConversationCount"),
        sortKey: startedAt,
        value: 1,
        service: conversation.service,
        channelId: conversation.channelId,
        sourceConversationId: conversation._id,
        sourceKey: `${baseSource}:channel:${conversation.channelId}:channelConversationCount`,
      }));
      if (convertedAt !== undefined) {
        push(metricEntry({
          orgId: conversation.orgId,
          metric: "channelConvertedCount",
          namespace: channelNamespace(conversation.orgId, conversation.channelId, "channelConvertedCount"),
          sortKey: startedAt,
          value: 1,
          service: conversation.service,
          channelId: conversation.channelId,
          sourceConversationId: conversation._id,
          sourceKey: `${baseSource}:channel:${conversation.channelId}:channelConvertedCount`,
        }));
      }
    }

    if (conversation.assignedUserId !== undefined) {
      const memberId = conversation.assignedUserId;
      push(metricEntry({
        orgId: conversation.orgId,
        metric: "assignedConversationCount",
        namespace: memberNamespace(conversation.orgId, memberId, "assignedConversationCount"),
        sortKey: startedAt,
        value: 1,
        memberUserId: memberId,
        service: conversation.service,
        channelId: conversation.channelId,
        sourceConversationId: conversation._id,
        sourceKey: `${baseSource}:member:${memberId}:assignedConversationCount`,
      }));
      push(metricEntry({
        orgId: conversation.orgId,
        metric: "avgMessagesPerConversationDenominator",
        namespace: memberNamespace(conversation.orgId, memberId, "avgMessagesPerConversationDenominator"),
        sortKey: startedAt,
        value: 1,
        memberUserId: memberId,
        service: conversation.service,
        channelId: conversation.channelId,
        sourceConversationId: conversation._id,
        sourceKey: `${baseSource}:member:${memberId}:avgMessagesPerConversationDenominator`,
      }));
      if (conversation.status !== "closed") {
        push(metricEntry({
          orgId: conversation.orgId,
          metric: "activeConversationCount",
          namespace: memberNamespace(conversation.orgId, memberId, "activeConversationCount"),
          sortKey: conversation.lastMessageAt,
          value: 1,
          memberUserId: memberId,
          service: conversation.service,
          channelId: conversation.channelId,
          sourceConversationId: conversation._id,
          sourceKey: `${baseSource}:member:${memberId}:activeConversationCount`,
        }));
      }
      if (convertedAt !== undefined) {
        push(metricEntry({
          orgId: conversation.orgId,
          metric: "convertedCount",
          namespace: memberNamespace(conversation.orgId, memberId, "convertedCount"),
          sortKey: startedAt,
          value: 1,
          memberUserId: memberId,
          service: conversation.service,
          channelId: conversation.channelId,
          sourceConversationId: conversation._id,
          sourceKey: `${baseSource}:member:${memberId}:convertedCount`,
        }));
        push(metricEntry({
          orgId: conversation.orgId,
          metric: "conversionDurationMs",
          namespace: memberNamespace(conversation.orgId, memberId, "conversionDurationMs"),
          sortKey: startedAt,
          value: conversionDurationMs ?? 0,
          memberUserId: memberId,
          service: conversation.service,
          channelId: conversation.channelId,
          sourceConversationId: conversation._id,
          sourceKey: `${baseSource}:member:${memberId}:conversionDurationMs`,
        }));
      }
      if (droppedAt !== undefined) {
        push(metricEntry({
          orgId: conversation.orgId,
          metric: "droppedCount",
          namespace: memberNamespace(conversation.orgId, memberId, "droppedCount"),
          sortKey: startedAt,
          value: 1,
          memberUserId: memberId,
          service: conversation.service,
          channelId: conversation.channelId,
          sourceConversationId: conversation._id,
          sourceKey: `${baseSource}:member:${memberId}:droppedCount`,
        }));
      }
    }

    if (
      firstHumanReplyDurationMs !== undefined &&
      firstHumanOutgoingAt !== undefined
    ) {
      const firstHumanMessage = outgoing.find(
        (message) => message.createdAt === firstHumanOutgoingAt && message.authorUserId !== undefined,
      );
      if (firstHumanMessage?.authorUserId !== undefined) {
        const memberId = firstHumanMessage.authorUserId;
        push(metricEntry({
          orgId: conversation.orgId,
          metric: "firstHumanReplyCount",
          namespace: memberNamespace(conversation.orgId, memberId, "firstHumanReplyCount"),
          sortKey: firstHumanOutgoingAt,
          value: 1,
          memberUserId: memberId,
          service: conversation.service,
          channelId: conversation.channelId,
          sourceConversationId: conversation._id,
          sourceMessageId: firstHumanMessage._id,
          sourceKey: `${baseSource}:member:${memberId}:firstHumanReplyCount`,
        }));
        push(metricEntry({
          orgId: conversation.orgId,
          metric: "firstHumanReplyDurationMs",
          namespace: memberNamespace(conversation.orgId, memberId, "firstHumanReplyDurationMs"),
          sortKey: firstHumanOutgoingAt,
          value: firstHumanReplyDurationMs,
          memberUserId: memberId,
          service: conversation.service,
          channelId: conversation.channelId,
          sourceConversationId: conversation._id,
          sourceMessageId: firstHumanMessage._id,
          sourceKey: `${baseSource}:member:${memberId}:firstHumanReplyDurationMs`,
        }));
      }
    }

    for (const message of outgoing) {
      if (message.authorUserId === undefined) continue;
      push(metricEntry({
        orgId: conversation.orgId,
        metric: "messageSentCount",
        namespace: memberNamespace(conversation.orgId, message.authorUserId, "messageSentCount"),
        sortKey: message.createdAt,
        value: 1,
        memberUserId: message.authorUserId,
        service: conversation.service,
        channelId: conversation.channelId,
        sourceConversationId: conversation._id,
        sourceMessageId: message._id,
        sourceKey: `message:${message._id}:member:${message.authorUserId}:messageSentCount`,
      }));
    }

    for (const assignment of topicAssignments) {
      push(metricEntry({
        orgId: conversation.orgId,
        metric: "topicMentionCount",
        namespace: topicNamespace(conversation.orgId, assignment.topicId),
        sortKey: assignment.detectedAt,
        value: 1,
        topicId: assignment.topicId,
        service: conversation.service,
        channelId: conversation.channelId,
        sourceConversationId: conversation._id,
        sourceKey: `${baseSource}:topic:${assignment.topicId}:topicMentionCount`,
      }));
    }

    for (const entry of entries) {
      await ctx.db.insert("analyticsMetricEntries", entry);
    }
    return { synced: true, metricEntries: entries.length };
}

export const syncConversationAnalytics = internalMutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: syncConversationAnalyticsHandler,
});

export const backfillRecentConversations = internalMutation({
  args: {
    cursor: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 25, 1), 50);
    const rows = await ctx.db
      .query("conversations")
      .withIndex("by_lastMessageAt")
      .order("desc")
      .take(limit);
    for (const conversation of rows) {
      if (conversation.service === "playground") continue;
      await syncConversationAnalyticsHandler(ctx, {
        conversationId: conversation._id,
      });
    }
    return {
      processed: rows.length,
      nextCursor: rows.at(-1)?.lastMessageAt,
    };
  },
});

export const getOverview = query({
  args: { range: rangeValidator },
  handler: async (ctx, args) => {
    const { orgId, userId } = await assertAnalyticsAccess(ctx);
    if (!orgId || orgId === "personal") {
      return null;
    }
    if (!(await canReadTeamAnalytics(ctx, orgId, userId))) {
      return null;
    }
    const namespaces = [
      teamNamespace(orgId, "conversationCount"),
      teamNamespace(orgId, "convertedCount"),
      teamNamespace(orgId, "droppedCount"),
      teamNamespace(orgId, "conversionDurationMs"),
      teamNamespace(orgId, "firstReplyDurationMs"),
      teamNamespace(orgId, "firstReplyCount"),
    ];
    const [
      conversationCount,
      convertedCount,
      droppedCount,
      conversionDurationMs,
      firstReplyDurationMs,
      firstReplyCount,
    ] = await metricSums(ctx, namespaces, args.range);
    const conversionRate = pct(convertedCount, conversationCount);
    const dropRate = pct(droppedCount, conversationCount);
    const avgConversionMs =
      convertedCount > 0 ? conversionDurationMs / convertedCount : null;
    const avgFirstReplyMs =
      firstReplyCount > 0 ? firstReplyDurationMs / firstReplyCount : null;
    return {
      range: args.range,
      totals: {
        conversationCount,
        convertedCount,
        droppedCount,
        firstReplyCount,
        conversionDurationMs,
        firstReplyDurationMs,
      },
      cards: [
        {
          key: "conversionRate",
          label: "Average conversion rate",
          value: formatPct(conversionRate),
          rawValue: conversionRate,
        },
        {
          key: "dropRate",
          label: "Average drop rate",
          value: formatPct(dropRate),
          rawValue: dropRate,
        },
        {
          key: "avgConversionTime",
          label: "Average time to conversion",
          value: formatDuration(avgConversionMs),
          rawValue: avgConversionMs,
        },
        {
          key: "avgFirstReplyTime",
          label: "Average time to first reply",
          value: formatDuration(avgFirstReplyMs),
          rawValue: avgFirstReplyMs,
        },
      ],
    };
  },
});

export const getCustomerSentimentDistribution = query({
  args: { range: rangeValidator },
  handler: async (ctx, args) => {
    const { orgId, userId } = await assertAnalyticsAccess(ctx);
    if (!orgId || orgId === "personal") {
      return emptySentimentCounts();
    }
    if (!(await canReadTopicAnalytics(ctx, orgId, userId))) {
      return emptySentimentCounts();
    }
    return await getOrgSentimentDistribution(ctx, orgId, args.range);
  },
});

export const getMemberPerformance = query({
  args: { range: rangeValidator },
  handler: async (ctx, args) => {
    const { orgId, userId } = await assertAnalyticsAccess(ctx);
    if (!orgId || orgId === "personal") return [];
    if (!(await canReadTeamAnalytics(ctx, orgId, userId))) return [];
    const team = await ctx.db
      .query("teams")
      .withIndex("by_workosOrgId", (q) => q.eq("workosOrgId", orgId))
      .unique();
    if (team === null) return [];

    const memberships = await ctx.db
      .query("teamMemberships")
      .withIndex("by_teamId", (q) => q.eq("teamId", team._id))
      .collect();

    const users: Doc<"users">[] = [];
    for (const membership of memberships) {
      const user = await ctx.db.get(membership.userId);
      if (user !== null) users.push(user);
    }

    const metricNames: AnalyticsMetric[] = [
      "assignedConversationCount",
      "activeConversationCount",
      "messageSentCount",
      "avgMessagesPerConversationDenominator",
      "firstHumanReplyDurationMs",
      "firstHumanReplyCount",
      "convertedCount",
      "conversionDurationMs",
      "droppedCount",
    ];
    const roleByUserId = new Map<Id<"users">, Doc<"teamMemberships">["role"]>();
    if (team !== null) {
      const memberships = await ctx.db
        .query("teamMemberships")
        .withIndex("by_teamId", (q) => q.eq("teamId", team._id))
        .collect();
      for (const membership of memberships) {
        roleByUserId.set(membership.userId, membership.role);
      }
    }
    const namespaces = users.flatMap((user) =>
      metricNames.map((metric) => memberNamespace(orgId, user.workosUserId, metric)),
    );
    const sums = await metricSums(ctx, namespaces, args.range);
    return users
      .map((user, userIndex) => {
        const offset = userIndex * metricNames.length;
        const assigned = sums[offset] ?? 0;
        const active = sums[offset + 1] ?? 0;
        const messagesSent = sums[offset + 2] ?? 0;
        const messageDenominator = sums[offset + 3] ?? 0;
        const firstHumanReplyDurationMs = sums[offset + 4] ?? 0;
        const firstHumanReplyCount = sums[offset + 5] ?? 0;
        const converted = sums[offset + 6] ?? 0;
        const conversionDurationMs = sums[offset + 7] ?? 0;
        const dropped = sums[offset + 8] ?? 0;
        const averageConversionMs =
          converted > 0 ? conversionDurationMs / converted : null;
        return {
          userId: user._id,
          workosUserId: user.workosUserId,
          name: displayName(user),
          email: user.email,
          roleSlug: workosOrgRoleSlug(roleByUserId.get(user._id) ?? "member"),
          assignedConversationCount: assigned,
          activeConversationCount: active,
          messageSentCount: messagesSent,
          averageMessagesPerConversation:
            messageDenominator > 0 ? messagesSent / messageDenominator : 0,
          averageFirstReplyMs:
            firstHumanReplyCount > 0
              ? firstHumanReplyDurationMs / firstHumanReplyCount
              : null,
          averageFirstReplyLabel: formatDuration(
            firstHumanReplyCount > 0
              ? firstHumanReplyDurationMs / firstHumanReplyCount
              : null,
          ),
          averageConversionMs,
          averageConversionLabel: formatDuration(averageConversionMs),
          conversionRate: pct(converted, assigned),
          dropRate: pct(dropped, assigned),
          convertedCount: converted,
          droppedCount: dropped,
        };
      })
      .sort((a, b) => b.assignedConversationCount - a.assignedConversationCount);
  },
});

function serviceLabel(service: ConversationService) {
  return service[0]!.toUpperCase() + service.slice(1);
}

function monthBounds(sortKey: string) {
  const [year, monthNum] = sortKey.split("-").map(Number);
  return {
    lower: { key: Date.UTC(year, monthNum - 1, 1), inclusive: true },
    upper: { key: Date.UTC(year, monthNum, 1), inclusive: false },
  };
}

export const getDropOffRateMonthly = query({
  args: { range: rangeValidator },
  handler: async (ctx, args) => {
    const { orgId, userId } = await assertAnalyticsAccess(ctx);
    if (!orgId || orgId === "personal") {
      return { rows: [] };
    }
    if (!(await canReadTeamAnalytics(ctx, orgId, userId))) {
      return { rows: [] };
    }

    const months = getLast6CalendarMonths(Date.now());
    const batchRequests = months.flatMap((month) => [
      {
        namespace: teamNamespace(orgId, "conversationCount"),
        bounds: monthBounds(month.sortKey),
      },
      {
        namespace: teamNamespace(orgId, "droppedCount"),
        bounds: monthBounds(month.sortKey),
      },
    ]);
    const sums = await analyticsMetrics.sumBatch(ctx, batchRequests);
    const rows = months
      .map((month, monthIndex) => {
        const conversationCount = sums[monthIndex * 2] ?? 0;
        const droppedCount = sums[monthIndex * 2 + 1] ?? 0;
        return {
          monthKey: month.sortKey,
          month: month.label,
          conversationCount,
          droppedCount,
          dropOffRate: pct(droppedCount, conversationCount),
        };
      })
      .filter((row) => row.conversationCount > 0);

    return {
      rows,
      range: args.range,
    };
  },
});

export const getCustomersByChannelMonthly = query({
  args: { range: rangeValidator },
  handler: async (ctx, args) => {
    const { orgId, userId } = await assertAnalyticsAccess(ctx);
    if (!orgId || orgId === "personal") {
      return { rows: [], services: [] };
    }
    if (!(await canReadTeamAnalytics(ctx, orgId, userId))) {
      return { rows: [], services: [] };
    }

    const months = getLast6CalendarMonths(Date.now());
    const batchRequests = months.flatMap((month) =>
      CHANNEL_SERVICES.map((service) => ({
        namespace: serviceNamespace(orgId, service, "channelConversationCount"),
        bounds: monthBounds(month.sortKey),
      })),
    );
    const sums = await analyticsMetrics.sumBatch(ctx, batchRequests);
    const rows = months.map((month, monthIndex) => {
      const row: Record<string, string | number> = {
        monthKey: month.sortKey,
        month: month.label,
      };
      CHANNEL_SERVICES.forEach((service, serviceIndex) => {
        row[service] = sums[monthIndex * CHANNEL_SERVICES.length + serviceIndex] ?? 0;
      });
      return row;
    });

    return {
      rows,
      services: CHANNEL_SERVICES.map((service) => ({
        key: service,
        label: serviceLabel(service),
      })),
      range: args.range,
    };
  },
});

export const getChannelConversions = query({
  args: { range: rangeValidator },
  handler: async (ctx, args) => {
    const { orgId, userId } = await assertAnalyticsAccess(ctx);
    if (!orgId || orgId === "personal") return [];
    if (!(await canReadTeamAnalytics(ctx, orgId, userId))) return [];
    const channels = await ctx.db
      .query("channels")
      .withIndex("by_orgId_and_service", (q) => q.eq("orgId", orgId))
      .take(100);
    const services: ConversationService[] = ["whatsapp", "instagram", "messenger", "web"];
    const serviceNamespaces = services.flatMap((service) => [
      serviceNamespace(orgId, service, "channelConversationCount"),
      serviceNamespace(orgId, service, "channelConvertedCount"),
    ]);
    const channelNamespaces = channels.flatMap((channel) => [
      channelNamespace(orgId, channel._id, "channelConversationCount"),
      channelNamespace(orgId, channel._id, "channelConvertedCount"),
    ]);
    const sums = await metricSums(ctx, [...serviceNamespaces, ...channelNamespaces], args.range);
    const serviceRows = services.map((service, index) => {
      const conversationCount = sums[index * 2] ?? 0;
      const convertedCount = sums[index * 2 + 1] ?? 0;
      return {
        key: `service:${service}`,
        label: service[0]!.toUpperCase() + service.slice(1),
        service,
        conversationCount,
        convertedCount,
        conversionRate: pct(convertedCount, conversationCount),
        kind: "service" as const,
      };
    });
    const channelStart = serviceNamespaces.length;
    const channelRows = channels.map((channel, index) => {
      const conversationCount = sums[channelStart + index * 2] ?? 0;
      const convertedCount = sums[channelStart + index * 2 + 1] ?? 0;
      return {
        key: `channel:${channel._id}`,
        label:
          channel.displayUsername ??
          channel.displayPhoneNumber ??
          channel.service,
        service: channel.service,
        channelId: channel._id,
        conversationCount,
        convertedCount,
        conversionRate: pct(convertedCount, conversationCount),
        kind: "channel" as const,
      };
    });
    return [...serviceRows, ...channelRows].filter((row) => row.conversationCount > 0);
  },
});

export const getTopics = query({
  args: { range: rangeValidator },
  handler: async (ctx, args) => {
    const { orgId, userId } = await assertAnalyticsAccess(ctx);
    if (!orgId || orgId === "personal") {
      return emptyTopicsResponse();
    }
    if (!(await canReadTopicAnalytics(ctx, orgId, userId))) {
      return emptyTopicsResponse();
    }
    const topics = await ctx.db
      .query("conversationTopics")
      .withIndex("by_orgId_and_totalCount", (q) => q.eq("orgId", orgId))
      .order("desc")
      .take(TOPIC_RANGE_LIMIT);
    if (topics.length === 0) {
      return emptyTopicsResponse();
    }
    const topicIds = new Set(topics.map((topic) => topic._id));
    const sentimentByTopicId = await getSentimentByTopicId(
      ctx,
      orgId,
      topicIds,
      args.range,
    );
    const counts = await metricSums(
      ctx,
      topics.map((topic) => topicNamespace(orgId, topic._id)),
      args.range,
    );
    const now = Date.now();
    const weekBounds = {
      lower: { key: now - 7 * 24 * 60 * 60 * 1000, inclusive: true },
      upper: { key: now, inclusive: true },
    };
    const previousWeekBounds = {
      lower: { key: now - 14 * 24 * 60 * 60 * 1000, inclusive: true },
      upper: { key: now - 7 * 24 * 60 * 60 * 1000, inclusive: false },
    };
    const weekCounts = await analyticsMetrics.sumBatch(
      ctx,
      topics.map((topic) => ({ namespace: topicNamespace(orgId, topic._id), bounds: weekBounds })),
    );
    const previousWeekCounts = await analyticsMetrics.sumBatch(
      ctx,
      topics.map((topic) => ({ namespace: topicNamespace(orgId, topic._id), bounds: previousWeekBounds })),
    );
    const rows = topics
      .map((topic, index) => {
        const count = counts[index] ?? 0;
        const weekCount = weekCounts[index] ?? 0;
        const previousWeekCount = previousWeekCounts[index] ?? 0;
        return {
          topicId: topic._id,
          topic: topic.name,
          count,
          weekCount,
          previousWeekCount,
          trendDelta: weekCount - previousWeekCount,
          totalCount: topic.totalCount,
          lastSeenAt: topic.lastSeenAt,
          description: topic.description ?? null,
          sentiment: sentimentByTopicId.get(topic._id) ?? null,
        };
      })
      .filter((topic) => topic.count > 0 || topic.weekCount > 0)
      .sort((a, b) => b.count - a.count);
    const topTopics = rows.slice(0, 30);
    const trendingTopics = [...rows]
      .filter((row) => row.weekCount > 0)
      .sort((a, b) => b.trendDelta - a.trendDelta || b.weekCount - a.weekCount)
      .slice(0, 10);
    const maxBubble = Math.max(...topTopics.map((topic) => topic.count), 1);
    return {
      topTopics,
      trendingTopics,
      bubbles: topTopics.map((topic) => ({
        topicId: topic.topicId,
        topic: topic.topic,
        count: topic.count,
        size: 36 + Math.round((topic.count / maxBubble) * 64),
      })),
      tableRows: topTopics,
    };
  },
});

export const debugSyncConversation = internalMutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await syncConversationAnalyticsHandler(ctx, args);
  },
});
