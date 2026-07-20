import { v } from "convex/values";
import { internalMutation, internalQuery, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { CUSTOMER_SENTIMENTS, type CustomerSentiment } from "../shared/customerSentiment";
import { isAdvancedAnalyticsPlan } from "../shared/planCatalog";
import { getTeamStripePlanHelper } from "./plans";

const customerSentimentValidator = v.union(
  ...CUSTOMER_SENTIMENTS.map((sentiment) => v.literal(sentiment)),
);
const ASSIGNMENT_LIMIT = 20;

async function orgHasAdvancedAnalytics(
  ctx: QueryCtx,
  orgId: string,
  assignedUserId: string | undefined,
  cache: Map<string, boolean>,
) {
  const cached = cache.get(orgId);
  if (cached !== undefined) return cached;
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

export const listCandidates = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 30, 1), 50);
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_lastMessageAt")
      .order("desc")
      .take(limit * 3);
    const candidates = [];
    const eligibility = new Map<string, boolean>();
    for (const conversation of conversations) {
      if (
        conversation.service === "playground" ||
        conversation.customerId === undefined ||
        (conversation.lastCustomerMessageAt ?? 0) === 0 ||
        (conversation.advancedAnalyticsSourceMessageMaxCreatedAt ?? 0) >=
          conversation.lastMessageAt
      ) {
        continue;
      }
      if (
        !(await orgHasAdvancedAnalytics(
          ctx,
          conversation.orgId,
          conversation.assignedUserId,
          eligibility,
        ))
      ) {
        continue;
      }
      candidates.push({
        conversationId: conversation._id,
        orgId: conversation.orgId,
        assignedUserId: conversation.assignedUserId,
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
    .take(ASSIGNMENT_LIMIT);
  for (const assignment of assignments) {
    await ctx.db.patch(assignment._id, {
      customerSentiment: sentiment,
      updatedAt: now,
    });
  }
}

export const assignConversationInsights = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    sentiment: customerSentimentValidator,
    sourceMessageMaxCreatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (
      conversation === null ||
      conversation.service === "playground" ||
      conversation.customerId === undefined
    ) {
      return null;
    }
    const now = Date.now();
    await ctx.db.patch(args.conversationId, {
      customerSentiment: args.sentiment,
      sentimentAnalyzedAt: now,
      sentimentSourceMessageMaxCreatedAt: args.sourceMessageMaxCreatedAt,
      advancedAnalyticsAnalyzedAt: now,
      advancedAnalyticsSourceMessageMaxCreatedAt: args.sourceMessageMaxCreatedAt,
      updatedAt: now,
    });
    await syncAssignmentSentiments(ctx, args.conversationId, args.sentiment, now);
    return { sentiment: args.sentiment };
  },
});
