import type { QueryCtx } from "./_generated/server";
import { agentCostAggregator, agentTokenAggregator } from "./aggregates";
import {
  agentCostMonthBounds,
  costMonthRange,
  parseAgentCostNamespace,
  type AgentCostNamespace,
} from "./agentCostAggregateModel";
import {
  addCostAggregateRow,
  addMonthOption,
  addMonthlyCostAggregateRow,
  type CostAggregateInput,
  type MonthAccumulator,
  type MonthlyUserAccumulator,
  type UserAccumulator,
} from "./adminUsageCostAggregation";

type CostDimension = AgentCostNamespace & {
  namespace: string;
};

type CostDimensionStats = CostDimension & CostAggregateInput & {
  firstMonthKey: string;
  lastMonthKey: string;
};

async function listCostDimensions(ctx: QueryCtx) {
  const dimensions: CostDimension[] = [];
  for await (const namespace of agentCostAggregator.iterNamespaces(ctx)) {
    const parsed = parseAgentCostNamespace(namespace);
    if (parsed) {
      dimensions.push({ namespace, ...parsed });
    }
  }
  return dimensions;
}

async function getDimensionStats(
  ctx: QueryCtx,
  dimension: CostDimension,
): Promise<CostDimensionStats | null> {
  const [totalCostUsd, totalTokens, requestCount, firstRequest, lastRequest] = await Promise.all([
    agentCostAggregator.sum(ctx, { namespace: dimension.namespace }),
    agentTokenAggregator.sum(ctx, { namespace: dimension.namespace }),
    agentCostAggregator.count(ctx, { namespace: dimension.namespace }),
    agentCostAggregator.min(ctx, { namespace: dimension.namespace }),
    agentCostAggregator.max(ctx, { namespace: dimension.namespace }),
  ]);

  if (requestCount === 0 || firstRequest === null || lastRequest === null) {
    return null;
  }

  return {
    ...dimension,
    requestCount,
    totalCostUsd,
    totalTokens,
    lastRequestAt: lastRequest.key[1],
    firstMonthKey: firstRequest.key[0],
    lastMonthKey: lastRequest.key[0],
  };
}

async function addMonthlyRows(
  ctx: QueryCtx,
  dimensions: CostDimension[],
  months: Array<{ monthKey: string }>,
  monthlyUsers: Map<string, MonthlyUserAccumulator>,
  monthOptions: Map<string, MonthAccumulator>,
) {
  const requests = months.flatMap((month) =>
    dimensions.map((dimension) => ({
      namespace: dimension.namespace,
      bounds: agentCostMonthBounds(month.monthKey),
      monthKey: month.monthKey,
      dimension,
    })),
  );

  const costRequests = requests.map(({ namespace, bounds }) => ({ namespace, bounds }));
  const [costs, tokens, counts] = await Promise.all([
    agentCostAggregator.sumBatch(ctx, costRequests),
    agentTokenAggregator.sumBatch(ctx, costRequests),
    agentCostAggregator.countBatch(ctx, costRequests),
  ]);

  for (let index = 0; index < requests.length; index += 1) {
    const requestCount = counts[index] ?? 0;
    if (requestCount === 0) {
      continue;
    }

    const request = requests[index]!;
    const latest = await agentCostAggregator.max(ctx, {
      namespace: request.namespace,
      bounds: request.bounds,
    });

    if (latest === null) {
      continue;
    }

    const input = {
      userId: request.dimension.userId,
      provider: request.dimension.provider,
      model: request.dimension.model,
      requestCount,
      totalCostUsd: costs[index] ?? 0,
      totalTokens: tokens[index] ?? 0,
      lastRequestAt: latest.key[1],
      monthKey: request.monthKey,
    };
    addMonthlyCostAggregateRow(monthlyUsers, input);
    addMonthOption(monthOptions, input);
  }
}

function monthRangeForStats(stats: CostDimensionStats[]) {
  const firstMonth = stats.reduce((first, stat) =>
    stat.firstMonthKey < first ? stat.firstMonthKey : first,
  stats[0]!.firstMonthKey);
  const lastMonth = stats.reduce((last, stat) =>
    stat.lastMonthKey > last ? stat.lastMonthKey : last,
  stats[0]!.lastMonthKey);
  return costMonthRange(firstMonth, lastMonth);
}

export async function collectAggregateCostAccumulators(ctx: QueryCtx) {
  const dimensions = await listCostDimensions(ctx);
  const users = new Map<string, UserAccumulator>();
  const monthlyUsers = new Map<string, MonthlyUserAccumulator>();
  const monthOptions = new Map<string, MonthAccumulator>();

  const stats = (await Promise.all(
    dimensions.map((dimension) => getDimensionStats(ctx, dimension)),
  )).filter((stat): stat is CostDimensionStats => stat !== null);

  for (const stat of stats) {
    addCostAggregateRow(users, stat);
  }

  if (stats.length > 0) {
    await addMonthlyRows(
      ctx,
      stats.map(({ namespace, userId, provider, model }) => ({
        namespace,
        userId,
        provider,
        model,
      })),
      monthRangeForStats(stats),
      monthlyUsers,
      monthOptions,
    );
  }

  return {
    users,
    monthlyUsers,
    monthOptions,
    costedRequestCount: stats.reduce((sum, stat) => sum + stat.requestCount, 0),
  };
}
