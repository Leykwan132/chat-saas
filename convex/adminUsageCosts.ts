import { v } from "convex/values";
import { components } from "./_generated/api";
import { query, type QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { assertAdminSession } from "./contactAdminAuth";
import {
  PLAN_CATALOG,
  resolvePlanKeyFromStripePriceId,
  type PlanKey,
} from "./planCatalog";
import {
  addMonthOption,
  addMonthlyUsageRow,
  addUsageRow,
  extractOpenRouterCostUsd,
  roundUsd,
  serializeMonthOptions,
  type ModelAccumulator,
  type MonthAccumulator,
  type MonthlyUserAccumulator,
  type UserAccumulator,
} from "./adminUsageCostAggregation";

const MAX_USAGE_ROWS = 10_000;

async function resolveUsageWorkosUserId(
  ctx: QueryCtx,
  row: Doc<"rawAgentUsage">,
  agentUserIds: Map<string, string | null>,
) {
  if (row.agentId) {
    const key = row.agentId;
    if (!agentUserIds.has(key)) {
      const agent = await ctx.db.get(row.agentId);
      agentUserIds.set(key, agent?.userId ?? null);
    }
    const agentUserId = agentUserIds.get(key);
    if (agentUserId) {
      return agentUserId;
    }
  }

  if (row.userId && !row.userId.startsWith("org:")) {
    return row.userId;
  }

  return null;
}

function withWorkosUserId(
  row: Doc<"rawAgentUsage">,
  workosUserId: string | null,
) {
  if (row.userId === workosUserId) {
    return row;
  }
  return {
    ...row,
    userId: workosUserId ?? undefined,
  };
}

async function resolvePlan(
  ctx: QueryCtx,
  user: Doc<"users"> | null,
): Promise<{
  planKey: PlanKey;
  planName: string;
}> {
  if (!user?.stripeSubscriptionId) {
    return { planKey: "free", planName: PLAN_CATALOG.free.name };
  }

  const subscription = await ctx.runQuery(components.stripe.public.getSubscription, {
    stripeSubscriptionId: user.stripeSubscriptionId,
  });

  if (!subscription || (subscription.status !== "active" && subscription.status !== "trialing")) {
    return { planKey: "free", planName: PLAN_CATALOG.free.name };
  }

  const planKey = resolvePlanKeyFromStripePriceId(subscription.priceId);
  return { planKey, planName: PLAN_CATALOG[planKey].name };
}

function serializeModelRow(
  model: ModelAccumulator,
  user: Doc<"users"> | null,
  plan: { planKey: PlanKey; planName: string },
) {
  return {
    userId: model.userId,
    email: user?.email ?? null,
    planKey: plan.planKey,
    planName: plan.planName,
    model: model.model,
    provider: model.provider,
    requestCount: model.requestCount,
    totalTokens: model.totalTokens,
    totalCostUsd: roundUsd(model.totalCostUsd),
    averageCostUsd: roundUsd(model.totalCostUsd / model.requestCount),
    lastRequestAt: model.lastRequestAt,
  };
}

export const getAdminUsageCostReport = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    await assertAdminSession(ctx, args.sessionToken);

    const rows = await ctx.db
      .query("rawAgentUsage")
      .order("desc")
      .take(MAX_USAGE_ROWS);
    const users = new Map<string, UserAccumulator>();
    const monthlyUsers = new Map<string, MonthlyUserAccumulator>();
    const months = new Map<string, MonthAccumulator>();
    const agentUserIds = new Map<string, string | null>();
    let costedRequestCount = 0;

    for (const row of rows) {
      const costUsd = extractOpenRouterCostUsd(row.providerMetadata);
      if (costUsd === null) {
        continue;
      }
      const workosUserId = await resolveUsageWorkosUserId(ctx, row, agentUserIds);
      const usageRow = withWorkosUserId(row, workosUserId);
      costedRequestCount += 1;
      addUsageRow(users, usageRow, costUsd);
      addMonthlyUsageRow(monthlyUsers, usageRow, costUsd);
      addMonthOption(months, usageRow, costUsd);
    }

    const userRows = [];
    const modelRows = [];
    const monthlyUserRows = [];
    const monthlyModelRows = [];

    for (const userTotals of users.values()) {
      const user =
        userTotals.userId === "unassigned"
          ? null
          : await ctx.db
              .query("users")
              .withIndex("by_workosUserId", (q) =>
                q.eq("workosUserId", userTotals.userId),
              )
              .unique();
      const plan = await resolvePlan(ctx, user);
      const models = [...userTotals.models.values()].sort(
        (a, b) => b.totalCostUsd - a.totalCostUsd,
      );
      const serializedModels = models.map((model) =>
        serializeModelRow(model, user, plan),
      );
      modelRows.push(...serializedModels);
      userRows.push({
        userId: userTotals.userId,
        email: user?.email ?? null,
        planKey: plan.planKey,
        planName: plan.planName,
        requestCount: userTotals.requestCount,
        totalTokens: userTotals.totalTokens,
        totalCostUsd: roundUsd(userTotals.totalCostUsd),
        averageCostUsd: roundUsd(userTotals.totalCostUsd / userTotals.requestCount),
        topModel: models[0]?.model ?? null,
        lastRequestAt: userTotals.lastRequestAt,
        models: serializedModels,
      });
    }

    for (const userTotals of monthlyUsers.values()) {
      const user =
        userTotals.userId === "unassigned"
          ? null
          : await ctx.db
              .query("users")
              .withIndex("by_workosUserId", (q) =>
                q.eq("workosUserId", userTotals.userId),
              )
              .unique();
      const plan = await resolvePlan(ctx, user);
      const models = [...userTotals.models.values()].sort(
        (a, b) => b.totalCostUsd - a.totalCostUsd,
      );
      const serializedModels = models.map((model) => ({
        monthKey: userTotals.monthKey,
        monthLabel: userTotals.monthLabel,
        ...serializeModelRow(model, user, plan),
      }));
      monthlyModelRows.push(...serializedModels);
      monthlyUserRows.push({
        monthKey: userTotals.monthKey,
        monthLabel: userTotals.monthLabel,
        userId: userTotals.userId,
        email: user?.email ?? null,
        planKey: plan.planKey,
        planName: plan.planName,
        requestCount: userTotals.requestCount,
        totalTokens: userTotals.totalTokens,
        totalCostUsd: roundUsd(userTotals.totalCostUsd),
        averageCostUsd: roundUsd(userTotals.totalCostUsd / userTotals.requestCount),
        topModel: models[0]?.model ?? null,
        lastRequestAt: userTotals.lastRequestAt,
        models: serializedModels,
      });
    }

    userRows.sort((a, b) => b.totalCostUsd - a.totalCostUsd);
    modelRows.sort((a, b) => b.totalCostUsd - a.totalCostUsd);
    monthlyUserRows.sort((a, b) => (
      b.monthKey.localeCompare(a.monthKey) || b.totalCostUsd - a.totalCostUsd
    ));
    monthlyModelRows.sort((a, b) => (
      b.monthKey.localeCompare(a.monthKey) || b.totalCostUsd - a.totalCostUsd
    ));
    const monthOptions = serializeMonthOptions(months);

    return {
      rowLimit: MAX_USAGE_ROWS,
      sourceRowCount: rows.length,
      costedRequestCount,
      monthOptions,
      userRows,
      modelRows,
      monthlyUserRows,
      monthlyModelRows,
    };
  },
});
