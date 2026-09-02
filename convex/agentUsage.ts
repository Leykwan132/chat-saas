import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { query } from "./_generated/server";
import { internalMutation } from "./triggers";
import { lifetimeAggregator, monthlyAggregator } from "./aggregates";
import { getAuthContext, PERSONAL_ORG_FALLBACK } from "./authUtils";
import { checkAiFeature, getTeamStripePlanHelper } from "./plans";
import {
  buildMonthlyUsageAggregates,
  listLifetimeModelTotalsFromRows,
  type LifetimeModelRow,
} from "./agentUsageAggregatesModel";
import {
  getCalendarMonthsFromEarliestToLatest,
} from "./usageMonthKey";
import { resolveAgentCostUsd } from "./agentCostAggregateModel";
import { getTeamByWorkosOrgId } from "./teamHelpers";
import { getWhiteLabelPartnerOrganizationForTeam } from "./whiteLabel/planResolver";
import { recordPartnerUsage } from "./whiteLabel/partnerUsage";

export async function assertAgentAccess(ctx: QueryCtx, agentId: Id<"agents">) {
  const { userId, orgId } = await getAuthContext(ctx);
  const agent = await ctx.db.get(agentId);
  if (agent === null) {
    throw new Error("Forbidden");
  }

  const normalizedOrgId =
    !orgId || orgId === "personal" ? PERSONAL_ORG_FALLBACK : orgId;
  const agentOrgId =
    !agent.orgId || agent.orgId === "personal" ? PERSONAL_ORG_FALLBACK : agent.orgId;

  if (agentOrgId !== PERSONAL_ORG_FALLBACK) {
    if (agentOrgId !== normalizedOrgId) {
      throw new Error("Forbidden");
    }
    return agent;
  }

  if (agent.userId !== userId) {
    throw new Error("Forbidden");
  }

  return agent;
}

async function assertAgentUsageAccess(
  ctx: QueryCtx,
  agent: Doc<"agents">,
  userId: string,
) {
  const orgId =
    !agent.orgId || agent.orgId === "personal" ? PERSONAL_ORG_FALLBACK : agent.orgId;
  const stripeInfo = await getTeamStripePlanHelper(ctx, {
    workosOrgId: orgId,
    userId,
  });
  if (!checkAiFeature(stripeInfo.plan, "agent_usage")) {
    throw new Error("Forbidden");
  }
}

async function listUsageRowsForAgent(ctx: QueryCtx, agentId: Id<"agents">) {
  return await ctx.db
    .query("rawAgentUsage")
    .withIndex("by_agentId", (q) => q.eq("agentId", agentId))
    .collect();
}

async function listLifetimeModelTotals(
  ctx: QueryCtx,
): Promise<LifetimeModelRow[]> {
  const models: string[] = [];
  for await (const namespace of lifetimeAggregator.iterNamespaces(ctx)) {
    models.push(namespace);
  }

  if (models.length === 0) {
    return [];
  }

  const totals = await lifetimeAggregator.sumBatch(
    ctx,
    models.map((model) => ({ namespace: model })),
  );

  return models
    .map((model, index) => ({
      model,
      totalTokens: totals[index] ?? 0,
    }))
    .filter((row) => row.totalTokens > 0)
    .sort((a, b) => b.totalTokens - a.totalTokens);
}

export const insertRawUsage = internalMutation({
  args: {
    userId: v.optional(v.string()),
    threadId: v.optional(v.string()),
    agentId: v.optional(v.id("agents")),
    agentName: v.optional(v.string()),
    model: v.string(),
    provider: v.string(),
    usage: v.object({
      promptTokens: v.number(),
      completionTokens: v.number(),
      totalTokens: v.number(),
      reasoningTokens: v.optional(v.number()),
      cachedInputTokens: v.optional(v.number()),
    }),
    providerMetadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    if (!args.threadId) {
      console.debug("Not tracking usage: threadId is missing");
      return null;
    }

    const conversation = await ctx.db
      .query("conversations")
      .withIndex("by_threadId", (q) => q.eq("threadId", args.threadId!))
      .unique();

    if (!conversation) {
      console.debug(
        `Not tracking usage: no conversation found for threadId ${args.threadId}`,
      );
      return null;
    }

    if (conversation.service === "playground") {
      console.debug("Not tracking usage: playground (test) thread");
      return null;
    }

    const agentId = args.agentId ?? conversation.assignedAgentId;
    const agent = agentId ? await ctx.db.get(agentId) : null;
    const fallbackUserId = args.userId?.startsWith("org:") ? undefined : args.userId;
    const workosUserId = agent?.userId ?? fallbackUserId;

    await ctx.db.insert("rawAgentUsage", {
      userId: workosUserId,
      threadId: args.threadId,
      agentId,
      agentName: args.agentName,
      model: args.model,
      provider: args.provider,
      usage: args.usage,
      providerMetadata: args.providerMetadata,
      createdAt: Date.now(),
    });

    if (agent?.orgId) {
      const team = await getTeamByWorkosOrgId(ctx, agent.orgId);
      const partnerOrganization = team === null
        ? null
        : await getWhiteLabelPartnerOrganizationForTeam(ctx, team._id);
      const costUsd = resolveAgentCostUsd({
        model: args.model,
        usage: args.usage,
        providerMetadata: args.providerMetadata,
      });
      if (partnerOrganization !== null) {
        await recordPartnerUsage(ctx, {
          partnerId: partnerOrganization.partnerId,
          totalTokens: args.usage.totalTokens,
          costUsd: costUsd ?? 0,
        });
      }
    }

    return { workosUserId };
  },
});

export const getLifetimeModelUsage = query({
  args: {},
  handler: async (ctx) => listLifetimeModelTotals(ctx),
});

export const getMonthlyUsageAggregates = query({
  args: {},
  handler: async (ctx) => {
    const lifetimeRows = await listLifetimeModelTotals(ctx);

    if (lifetimeRows.length === 0) {
      return {
        topModels: [],
        data: [],
      };
    }

    const topModels = lifetimeRows.slice(0, 8).map((row) => row.model);
    const topModelSet = new Set(topModels);
    const allModels = lifetimeRows.map((row) => row.model);

    const [earliestLog, latestLog] = await Promise.all([
      ctx.db.query("rawAgentUsage").order("asc").first(),
      ctx.db.query("rawAgentUsage").order("desc").first(),
    ]);
    if (latestLog === null || earliestLog === null) {
      return {
        topModels,
        data: [],
      };
    }

    const sortedMonths = getCalendarMonthsFromEarliestToLatest(
      earliestLog.createdAt,
      latestLog.createdAt,
    );

    const batchRequests: Array<{ namespace: string }> = [];
    for (const month of sortedMonths) {
      for (const model of allModels) {
        batchRequests.push({ namespace: `${month.sortKey}:${model}` });
      }
    }

    const results = await monthlyAggregator.sumBatch(ctx, batchRequests);

    const data = sortedMonths.map((month, monthIndex) => {
      const item: Record<string, number | string> = {
        month: month.label,
        prompt: 0,
        completion: 0,
        others: 0,
      };

      let monthlyTotal = 0;
      let others = 0;

      allModels.forEach((model, modelIndex) => {
        const resultIdx = monthIndex * allModels.length + modelIndex;
        const sum = results[resultIdx] ?? 0;
        monthlyTotal += sum;

        if (topModelSet.has(model)) {
          item[model] = sum;
        } else {
          others += sum;
        }
      });

      item.others = others;
      item.prompt = monthlyTotal;

      return item;
    }).filter((item) => (item.prompt as number) > 0);

    return {
      topModels,
      data,
    };
  },
});

export const getAgentModelUsage = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const { userId } = await getAuthContext(ctx);
    const agent = await assertAgentAccess(ctx, args.agentId);
    await assertAgentUsageAccess(ctx, agent, userId);
    const rows = await listUsageRowsForAgent(ctx, args.agentId);
    const lifetime = listLifetimeModelTotalsFromRows(rows);
    return {
      lifetime,
      monthly: buildMonthlyUsageAggregates(lifetime, rows),
    };
  },
});
