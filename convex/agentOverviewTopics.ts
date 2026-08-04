import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

const MAX_TOPICS_PER_CONVERSATION = 10;
const TRENDING_TOPIC_LIMIT = 8;

type AgentTopicRow = {
  topicId: Id<"conversationTopics">;
  topic: string;
  customerKeys: Set<string>;
  lastSeenAt: number;
  description: string | null;
};

export async function getAgentOverviewTrendingTopics(
  ctx: QueryCtx,
  conversations: Doc<"conversations">[],
  periodStartMs: number,
  periodEndMs: number,
) {
  const topicsById = new Map<Id<"conversationTopics">, AgentTopicRow>();

  for (const conversation of conversations) {
    const assignments = await ctx.db
      .query("conversationTopicAssignments")
      .withIndex("by_conversationId", (q) =>
        q.eq("conversationId", conversation._id),
      )
      .take(MAX_TOPICS_PER_CONVERSATION);

    for (const assignment of assignments) {
      if (
        assignment.detectedAt < periodStartMs ||
        assignment.detectedAt >= periodEndMs
      ) {
        continue;
      }

      const topic = await ctx.db.get(assignment.topicId);
      if (topic === null) {
        continue;
      }

      const current = topicsById.get(topic._id);
      const customerKey = topicCustomerKey(conversation);
      const customerKeys = current?.customerKeys ?? new Set<string>();
      customerKeys.add(customerKey);
      topicsById.set(topic._id, {
        topicId: topic._id,
        topic: topic.name,
        customerKeys,
        lastSeenAt: Math.max(current?.lastSeenAt ?? 0, assignment.detectedAt),
        description: topic.description ?? null,
      });
    }
  }

  const rows = [...topicsById.values()]
    .sort(
      (left, right) =>
        right.customerKeys.size - left.customerKeys.size ||
        right.lastSeenAt - left.lastSeenAt,
    )
    .slice(0, TRENDING_TOPIC_LIMIT);

  return rows.map(({ customerKeys, ...row }) => ({
    ...row,
    count: customerKeys.size,
  }));
}

function topicCustomerKey(conversation: Doc<"conversations">) {
  return conversation.customerId?.toString() ?? conversation.contactAddress;
}
