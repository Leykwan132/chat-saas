import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { internalMutation } from "./triggers";
import {
  topicAnalyticsNamespace,
  v2ConversationSourceKey,
} from "./analyticsMetricModel";
import {
  reconcileMetricContributions,
  type AnalyticsMetricContribution,
} from "./analyticsMetricContributions";

const MAX_TOPICS_PER_CONVERSATION = 5;
const TOPIC_INTEGRITY_READ_LIMIT = MAX_TOPICS_PER_CONVERSATION + 1;

export async function reconcileConversationTopics(
  ctx: MutationCtx,
  conversationId: Id<"conversations">,
) {
  const conversation = await ctx.db.get(conversationId);
  if (conversation === null) {
    return { projected: false, reason: "missing" as const };
  }
  if (conversation.service === "playground") {
    return { projected: false, reason: "playground" as const };
  }
  const assignments = await ctx.db
    .query("conversationTopicAssignments")
    .withIndex("by_conversationId", (query) =>
      query.eq("conversationId", conversationId),
    )
    .take(TOPIC_INTEGRITY_READ_LIMIT);
  if (assignments.length > MAX_TOPICS_PER_CONVERSATION) {
    throw new Error(
      `Conversation ${conversationId} has more than 5 topic assignments`,
    );
  }
  const existingRows = await ctx.db
    .query("analyticsMetricEntries")
    .withIndex(
      "by_sourceConversationId_and_metric_and_sourceKey",
      (query) =>
        query
          .eq("sourceConversationId", conversationId)
          .eq("metric", "topicMentionCount")
          .gte("sourceKey", "v2:")
          .lt("sourceKey", "v2;"),
    )
    .take(TOPIC_INTEGRITY_READ_LIMIT);
  if (existingRows.length > MAX_TOPICS_PER_CONVERSATION) {
    throw new Error(
      `Conversation ${conversationId} has more than 5 v2 topic contributions`,
    );
  }
  const desired: AnalyticsMetricContribution[] = assignments.map(
    (assignment) => ({
      namespace: topicAnalyticsNamespace(
        "v2",
        conversation.orgId,
        assignment.topicId,
      ),
      sortKey: assignment.detectedAt,
      value: 1,
      metric: "topicMentionCount",
      orgId: conversation.orgId,
      topicId: assignment.topicId,
      service: conversation.service,
      channelId: conversation.channelId,
      sourceConversationId: conversationId,
      sourceKey: v2ConversationSourceKey(
        conversationId,
        `topic:${assignment.topicId}:topicMentionCount`,
      ),
    }),
  );
  const sourceKeys = [
    ...new Set([
      ...desired.map((row) => row.sourceKey),
      ...existingRows.map((row) => row.sourceKey),
    ]),
  ];
  await reconcileMetricContributions(ctx, desired, sourceKeys);
  return {
    projected: true,
    metricEntries: desired.length,
  };
}

export const run = internalMutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) =>
    await reconcileConversationTopics(ctx, args.conversationId),
});
