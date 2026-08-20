import { v } from "convex/values";
import { internalMutation, internalQuery, type MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { markConversationAnalyticsDirty } from "./analyticsDirtyRequest";

const TOPIC_CONTEXT_MESSAGE_LIMIT = 80;
const MAX_TOPICS_PER_CONVERSATION = 5;
const TOPIC_ASSIGNMENT_READ_LIMIT = 20;

type TopicDetectionContext = {
  conversation: Doc<"conversations">;
  sourceMessageMaxCreatedAt: number | undefined;
  transcript: Array<{
    direction: "incoming" | "outgoing";
    contentType: Doc<"messages">["contentType"];
    content: string;
    createdAt: number;
  }>;
  existingTopics: Array<{
    id: Id<"conversationTopics">;
    name: string;
    slug: string;
    description: string | undefined;
  }>;
};

function topicSlug(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export const getTopicDetectionContext = internalQuery({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args): Promise<TopicDetectionContext | null> => {
    const conversation = await ctx.db.get(args.conversationId);
    if (conversation === null || conversation.service === "playground") {
      return null;
    }
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversationId_and_createdAt", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .order("desc")
      .take(TOPIC_CONTEXT_MESSAGE_LIMIT);
    const chronological = messages.reverse();
    const topics = await ctx.db
      .query("conversationTopics")
      .withIndex("by_orgId_and_totalCount", (q) =>
        q.eq("orgId", conversation.orgId),
      )
      .order("desc")
      .take(80);
    return {
      conversation,
      sourceMessageMaxCreatedAt: chronological.at(-1)?.createdAt,
      transcript: chronological.map((message) => ({
        direction: message.direction,
        contentType: message.contentType,
        content: message.content.slice(0, 800),
        createdAt: message.createdAt,
      })),
      existingTopics: topics.map((topic) => ({
        id: topic._id,
        name: topic.name,
        slug: topic.slug,
        description: topic.description,
      })),
    };
  },
});

async function resolveTopicId(
  ctx: MutationCtx,
  orgId: string,
  input: {
    topicName: string;
    existingTopicId?: string;
    description?: string;
  },
  now: number,
): Promise<Id<"conversationTopics">> {
  const normalizedName = input.topicName.trim().slice(0, 80) || "General";
  const slug = topicSlug(normalizedName) || "general";
  const description = input.description?.trim().slice(0, 500) || undefined;

  const patchDescription = async (topicId: Id<"conversationTopics">) => {
    if (!description) return;
    await ctx.db.patch(topicId, {
      description,
      updatedAt: now,
    });
  };

  if (input.existingTopicId !== undefined) {
    const normalizedId = ctx.db.normalizeId(
      "conversationTopics",
      input.existingTopicId,
    );
    if (normalizedId !== null) {
      const existing = await ctx.db.get(normalizedId);
      if (existing !== null && existing.orgId === orgId) {
        await patchDescription(existing._id);
        return existing._id;
      }
    }
  }

  const existingBySlug = await ctx.db
    .query("conversationTopics")
    .withIndex("by_orgId_and_slug", (q) =>
      q.eq("orgId", orgId).eq("slug", slug),
    )
    .unique();
  if (existingBySlug) {
    await patchDescription(existingBySlug._id);
    return existingBySlug._id;
  }

  return await ctx.db.insert("conversationTopics", {
    orgId,
    name: normalizedName,
    slug,
    aliases: [],
    totalCount: 0,
    weekCount: 0,
    lastSeenAt: now,
    description,
    createdAt: now,
    updatedAt: now,
  });
}

async function patchTopicCounts(
  ctx: MutationCtx,
  topicId: Id<"conversationTopics">,
  args: {
    totalDelta?: number;
    weekDelta?: number;
    lastSeenAt?: number;
    now: number;
  },
) {
  const topic = await ctx.db.get(topicId);
  if (topic === null) return;
  await ctx.db.patch(topicId, {
    totalCount: Math.max(0, topic.totalCount + (args.totalDelta ?? 0)),
    weekCount: Math.max(0, topic.weekCount + (args.weekDelta ?? 0)),
    lastSeenAt: args.lastSeenAt ?? topic.lastSeenAt,
    updatedAt: args.now,
  });
}

export const assignConversationTopic = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    topics: v.array(
      v.object({
        topicName: v.string(),
        existingTopicId: v.optional(v.string()),
        confidence: v.number(),
        description: v.optional(v.string()),
        summary: v.optional(v.string()),
      }),
    ),
    sourceMessageMaxCreatedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (conversation === null || conversation.service === "playground") {
      return null;
    }
    const now = Date.now();
    const resolvedAssignments: Array<{
      topicId: Id<"conversationTopics">;
      confidence: number;
      summary?: string;
      rank: number;
    }> = [];
    const seenTopicIds = new Set<string>();
    for (const [rank, input] of args.topics
      .filter((topic) => topic.topicName.trim().length > 0)
      .slice(0, MAX_TOPICS_PER_CONVERSATION)
      .entries()) {
      const topicId = await resolveTopicId(ctx, conversation.orgId, input, now);
      if (seenTopicIds.has(topicId)) continue;
      seenTopicIds.add(topicId);
      resolvedAssignments.push({
        topicId,
        confidence: Math.max(0, Math.min(1, input.confidence)),
        summary: input.summary?.trim() || undefined,
        rank,
      });
    }

    const existingAssignments = await ctx.db
      .query("conversationTopicAssignments")
      .withIndex("by_conversationId", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .take(TOPIC_ASSIGNMENT_READ_LIMIT);
    const existingByTopicId = new Map(
      existingAssignments.map((assignment) => [assignment.topicId, assignment]),
    );
    const nextTopicIds = new Set(resolvedAssignments.map((assignment) => assignment.topicId));

    for (const existingAssignment of existingAssignments) {
      if (nextTopicIds.has(existingAssignment.topicId)) continue;
      await ctx.db.delete(existingAssignment._id);
      const withinWeek =
        existingAssignment.detectedAt >= now - 7 * 24 * 60 * 60 * 1000;
      await patchTopicCounts(ctx, existingAssignment.topicId, {
        totalDelta: -1,
        weekDelta: withinWeek ? -1 : 0,
        now,
      });
    }

    for (const assignment of resolvedAssignments) {
      const existingAssignment = existingByTopicId.get(assignment.topicId);
      if (existingAssignment === undefined) {
        await ctx.db.insert("conversationTopicAssignments", {
          orgId: conversation.orgId,
          conversationId: args.conversationId,
          topicId: assignment.topicId,
          confidence: assignment.confidence,
          summary: assignment.summary,
          rank: assignment.rank,
          detectedAt: now,
          sourceMessageMaxCreatedAt: args.sourceMessageMaxCreatedAt,
          customerSentiment: conversation.customerSentiment,
          createdAt: now,
          updatedAt: now,
        });
        await patchTopicCounts(ctx, assignment.topicId, {
          totalDelta: 1,
          weekDelta: 1,
          lastSeenAt: now,
          now,
        });
      } else {
        await ctx.db.patch(existingAssignment._id, {
          confidence: assignment.confidence,
          summary: assignment.summary,
          rank: assignment.rank,
          detectedAt: now,
          sourceMessageMaxCreatedAt: args.sourceMessageMaxCreatedAt,
          customerSentiment: conversation.customerSentiment,
          updatedAt: now,
        });
        await patchTopicCounts(ctx, assignment.topicId, {
          lastSeenAt: now,
          now,
        });
      }
    }

    await markConversationAnalyticsDirty(ctx, {
      conversationId: args.conversationId,
    });

    return { topicIds: resolvedAssignments.map((assignment) => assignment.topicId) };
  },
});
