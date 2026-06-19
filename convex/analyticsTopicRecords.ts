import { v } from "convex/values";
import { internalMutation, internalQuery, type MutationCtx, type QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  CUSTOMER_SENTIMENTS,
  type CustomerSentiment,
} from "../shared/customerSentiment";
import { isAdvancedAnalyticsPlan } from "../shared/planCatalog";
import { getTeamStripePlanHelper } from "./plans";

const customerSentimentValidator = v.union(
  ...CUSTOMER_SENTIMENTS.map((sentiment) => v.literal(sentiment)),
);

const TOPIC_CONTEXT_MESSAGE_LIMIT = 80;
const MAX_TOPICS_PER_CONVERSATION = 5;
const TOPIC_ASSIGNMENT_READ_LIMIT = 20;

function topicSlug(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function orgHasAdvancedAnalytics(
  ctx: QueryCtx,
  orgId: string,
  assignedUserId: string | undefined,
  cache: Map<string, boolean>,
): Promise<boolean> {
  const cached = cache.get(orgId);
  if (cached !== undefined) {
    return cached;
  }

  try {
    const stripeInfo = await getTeamStripePlanHelper(ctx, {
      workosOrgId: orgId,
      userId: assignedUserId,
    });
    const eligible = isAdvancedAnalyticsPlan(stripeInfo.plan);
    cache.set(orgId, eligible);
    return eligible;
  } catch {
    cache.set(orgId, false);
    return false;
  }
}

export const listTopicCandidates = internalQuery({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 30, 1), 50);
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_lastMessageAt")
      .order("desc")
      .take(limit * 3);
    const candidates = [];
    const orgEligibility = new Map<string, boolean>();
    for (const conversation of conversations) {
      if (conversation.service === "playground") continue;
      if (
        !(await orgHasAdvancedAnalytics(
          ctx,
          conversation.orgId,
          conversation.assignedUserId,
          orgEligibility,
        ))
      ) {
        continue;
      }
      const assignments = await ctx.db
        .query("conversationTopicAssignments")
        .withIndex("by_conversationId", (q) =>
          q.eq("conversationId", conversation._id),
        )
        .take(TOPIC_ASSIGNMENT_READ_LIMIT);
      const latestSourceMessageMaxCreatedAt = Math.max(
        0,
        ...assignments.map((assignment) => assignment.sourceMessageMaxCreatedAt ?? 0),
      );
      if (
        assignments.length === 0 ||
        latestSourceMessageMaxCreatedAt < conversation.lastMessageAt
      ) {
        candidates.push({
          conversationId: conversation._id,
          orgId: conversation.orgId,
          assignedUserId: conversation.assignedUserId,
          lastMessageAt: conversation.lastMessageAt,
        });
      }
      if (candidates.length >= limit) break;
    }
    return candidates;
  },
});

export const listSentimentCandidates = internalQuery({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 30, 1), 50);
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_lastMessageAt")
      .order("desc")
      .take(limit * 3);
    const candidates = [];
    const orgEligibility = new Map<string, boolean>();
    for (const conversation of conversations) {
      if (conversation.service === "playground") continue;
      if (
        !(await orgHasAdvancedAnalytics(
          ctx,
          conversation.orgId,
          conversation.assignedUserId,
          orgEligibility,
        ))
      ) {
        continue;
      }
      const lastCustomerMessageAt = conversation.lastCustomerMessageAt ?? 0;
      if (lastCustomerMessageAt === 0) continue;
      const analyzedWatermark = conversation.sentimentSourceMessageMaxCreatedAt ?? 0;
      if (
        conversation.customerSentiment !== undefined &&
        analyzedWatermark >= lastCustomerMessageAt
      ) {
        continue;
      }
      candidates.push({
        conversationId: conversation._id,
        orgId: conversation.orgId,
        assignedUserId: conversation.assignedUserId,
        lastMessageAt: conversation.lastMessageAt,
      });
      if (candidates.length >= limit) break;
    }
    return candidates;
  },
});

async function syncAssignmentSentiments(
  ctx: MutationCtx,
  conversationId: Id<"conversations">,
  sentiment: CustomerSentiment,
  now: number,
) {
  const assignments = await ctx.db
    .query("conversationTopicAssignments")
    .withIndex("by_conversationId", (q) => q.eq("conversationId", conversationId))
    .take(TOPIC_ASSIGNMENT_READ_LIMIT);
  for (const assignment of assignments) {
    await ctx.db.patch(assignment._id, {
      customerSentiment: sentiment,
      updatedAt: now,
    });
  }
}

export const assignConversationSentiment = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    sentiment: customerSentimentValidator,
    sourceMessageMaxCreatedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (conversation === null || conversation.service === "playground") {
      return null;
    }

    const now = Date.now();
    await ctx.db.patch(args.conversationId, {
      customerSentiment: args.sentiment,
      sentimentAnalyzedAt: now,
      sentimentSourceMessageMaxCreatedAt: args.sourceMessageMaxCreatedAt,
      updatedAt: now,
    });
    await syncAssignmentSentiments(ctx, args.conversationId, args.sentiment, now);
    return { sentiment: args.sentiment };
  },
});

export const getTopicDetectionContext = internalQuery({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
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

    await ctx.runMutation(internal.analytics.syncConversationAnalytics, {
      conversationId: args.conversationId,
    });

    return { topicIds: resolvedAssignments.map((assignment) => assignment.topicId) };
  },
});
