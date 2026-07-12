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
  roundUsd,
} from "./agentCostAggregateModel";
import {
  serializeMonthOptions,
  type ModelAccumulator,
} from "./adminUsageCostAggregation";
import { collectAggregateCostAccumulators } from "./adminUsageCostAggregateQuery";

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

async function resolveUserPlan(
  ctx: QueryCtx,
  userId: string,
  cache: Map<string, Promise<{ user: Doc<"users"> | null; plan: { planKey: PlanKey; planName: string } }>>,
) {
  if (!cache.has(userId)) {
    cache.set(userId, (async () => {
      const user =
        userId === "unassigned"
          ? null
          : await ctx.db
              .query("users")
              .withIndex("by_workosUserId", (q) => q.eq("workosUserId", userId))
              .unique();
      return { user, plan: await resolvePlan(ctx, user) };
    })());
  }
  return await cache.get(userId)!;
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
    totalCostUsd: roundUsd(model.totalCostUsd),
    totalTokens: model.totalTokens,
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

    const {
      users,
      monthlyUsers,
      monthOptions,
      costedRequestCount,
    } = await collectAggregateCostAccumulators(ctx);
    const userPlans = new Map<string, Promise<{ user: Doc<"users"> | null; plan: { planKey: PlanKey; planName: string } }>>();

    const userRows = [];
    const modelRows = [];
    const monthlyUserRows = [];
    const monthlyModelRows = [];

    for (const userTotals of users.values()) {
      const { user, plan } = await resolveUserPlan(ctx, userTotals.userId, userPlans);
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
        totalCostUsd: roundUsd(userTotals.totalCostUsd),
        totalTokens: userTotals.totalTokens,
        averageCostUsd: roundUsd(userTotals.totalCostUsd / userTotals.requestCount),
        topModel: models[0]?.model ?? null,
        lastRequestAt: userTotals.lastRequestAt,
        models: serializedModels,
      });
    }

    for (const userTotals of monthlyUsers.values()) {
      const { user, plan } = await resolveUserPlan(ctx, userTotals.userId, userPlans);
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
        totalCostUsd: roundUsd(userTotals.totalCostUsd),
        totalTokens: userTotals.totalTokens,
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

    return {
      rowLimit: null,
      sourceRowCount: costedRequestCount,
      costedRequestCount,
      monthOptions: serializeMonthOptions(monthOptions),
      userRows,
      modelRows,
      monthlyUserRows,
      monthlyModelRows,
    };
  },
});
