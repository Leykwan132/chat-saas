import { v } from "convex/values";
import type { QueryCtx } from "./_generated/server";
import { query } from "./_generated/server";
import { internalMutation } from "./triggers";
import { lifetimeAggregator, monthlyAggregator } from "./aggregates";
import { getLast6CalendarMonths } from "./usageMonthKey";

type LifetimeModelRow = {
  model: string;
  totalTokens: number;
};

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
      return;
    }

    const conversation = await ctx.db
      .query("conversations")
      .withIndex("by_threadId", (q) => q.eq("threadId", args.threadId!))
      .unique();

    if (!conversation) {
      console.debug(
        `Not tracking usage: no conversation found for threadId ${args.threadId}`,
      );
      return;
    }

    if (conversation.service === "playground") {
      console.debug("Not tracking usage: playground (test) thread");
      return;
    }

    const agentId = args.agentId ?? conversation.assignedAgentId;

    await ctx.db.insert("rawAgentUsage", {
      userId: args.userId,
      threadId: args.threadId,
      agentId,
      agentName: args.agentName,
      model: args.model,
      provider: args.provider,
      usage: args.usage,
      providerMetadata: args.providerMetadata,
      createdAt: Date.now(),
    });
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

    const latestLog = await ctx.db.query("rawAgentUsage").order("desc").first();
    if (latestLog === null) {
      return {
        topModels,
        data: [],
      };
    }

    const sortedMonths = getLast6CalendarMonths(latestLog.createdAt);

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
    });

    return {
      topModels,
      data,
    };
  },
});
