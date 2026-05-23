import { query, internalQuery, internalMutation, type MutationCtx, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { getAuthContext } from "./authUtils";
import type { Doc } from "./_generated/dataModel";
import { components } from "./_generated/api";
import {
  EXTRA_CREDITS_PRICE_ID,
  PLAN_CATALOG,
  PLAN_ORDER,
  formatPlanPriceLabel,
  resolvePlanKeyFromStripePriceId,
  type PlanCatalogEntry,
  type PlanFeatureFlags,
  type PlanKey,
} from "./planCatalog";

export type { PlanKey, PlanCatalogEntry, PlanFeatureFlags };

export type PlanConfig = PlanCatalogEntry & {
  price: string;
};

function buildPlanConfig(key: PlanKey): PlanConfig {
  const entry = PLAN_CATALOG[key];
  return {
    ...entry,
    price: formatPlanPriceLabel(entry),
  };
}

export const PLANS: Record<PlanKey, PlanConfig> = Object.fromEntries(
  PLAN_ORDER.map((key) => [key, buildPlanConfig(key)]),
) as Record<PlanKey, PlanConfig>;

export { EXTRA_CREDITS_PRICE_ID };

export function getPlan(planName: string | undefined): PlanConfig {
  const key = (planName ?? "free") as PlanKey;
  return PLANS[key] || PLANS.free;
}

export async function getPlanFromStripe(
  ctx: QueryCtx | MutationCtx,
  entityId: string,
): Promise<{
  plan: PlanKey;
  status?: string;
  currentPeriodEnd?: number;
}> {
  const subscription = await ctx.runQuery(
    components.stripe.public.getSubscriptionByOrgId,
    { orgId: entityId }
  );

  if (subscription && (subscription.status === "active" || subscription.status === "trialing")) {
    let plan: PlanKey = "free";
    try {
      plan = resolvePlanKeyFromStripePriceId(subscription.priceId);
    } catch {
      plan = "free";
    }
    return {
      plan,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd * 1000,
    };
  }

  return {
    plan: "free",
    status: subscription?.status,
    currentPeriodEnd: subscription?.currentPeriodEnd ? subscription.currentPeriodEnd * 1000 : undefined,
  };
}

export function checkModelAccess(planName: string | undefined, modelId: string): boolean {
  const plan = getPlan(planName);
  return plan.models.includes(modelId);
}

export function checkPlatformSupport(planName: string | undefined, service: string): boolean {
  if (service === "playground") return true;
  const plan = getPlan(planName);
  return plan.platforms.includes(service);
}

export function checkAiFeature(
  planName: string | undefined,
  featureKey: keyof PlanFeatureFlags,
): boolean {
  const plan = getPlan(planName);
  return plan.features[featureKey] ?? false;
}

export function checkAgentCreationLimit(
  planName: string | undefined,
  currentAgentCount: number,
): boolean {
  const plan = getPlan(planName);
  if (plan.maxAgents === "unlimited") return true;
  return currentAgentCount < plan.maxAgents;
}

type StripePlanInfo = Awaited<ReturnType<typeof getPlanFromStripe>>;

export type CreditBillingSnapshot = {
  effectiveCredits: number;
  monthlyAllowance: number;
  needsPersistedReset: boolean;
  resetReason?: string;
};

function getCalendarMonthKey(date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function hasActiveStripeBilling(status: string | undefined): boolean {
  return status === "active" || status === "trialing";
}

export function resolveCreditBilling(
  entity: Doc<"organizations"> | Doc<"users">,
  stripeInfo: StripePlanInfo,
): CreditBillingSnapshot {
  const planConfig = getPlan(stripeInfo.plan);
  const monthlyAllowance = planConfig.monthlyCredits;
  const balance = entity.credits ?? 0;
  const stripePeriodEnd = hasActiveStripeBilling(stripeInfo.status)
    ? stripeInfo.currentPeriodEnd
    : undefined;

  if (stripePeriodEnd && entity.stripeSubscriptionCurrentPeriodEnd !== stripePeriodEnd) {
    return {
      effectiveCredits: monthlyAllowance,
      monthlyAllowance,
      needsPersistedReset: true,
      resetReason: `Monthly subscription credit reset for ${planConfig.name} plan`,
    };
  }

  const monthKey = getCalendarMonthKey();
  if (!stripePeriodEnd && entity.creditsPeriodMonthKey !== monthKey) {
    return {
      effectiveCredits: monthlyAllowance,
      monthlyAllowance,
      needsPersistedReset: true,
      resetReason: `Monthly credit reset for ${planConfig.name} plan`,
    };
  }

  return {
    effectiveCredits: balance,
    monthlyAllowance,
    needsPersistedReset: false,
  };
}

function isMutationCtx(ctx: QueryCtx | MutationCtx): ctx is MutationCtx {
  return "db" in ctx && typeof (ctx.db as MutationCtx["db"]).patch === "function";
}

async function persistCreditPeriodResetOnEntity(
  ctx: MutationCtx,
  entity: Doc<"organizations"> | Doc<"users">,
  stripeInfo: StripePlanInfo,
): Promise<Doc<"organizations"> | Doc<"users">> {
  const billing = resolveCreditBilling(entity, stripeInfo);
  if (!billing.needsPersistedReset || !billing.resetReason) {
    return entity;
  }

  const isOrg = "workosOrgId" in entity;
  const balanceBefore = entity.credits ?? 0;
  const stripePeriodEnd = hasActiveStripeBilling(stripeInfo.status)
    ? stripeInfo.currentPeriodEnd
    : undefined;
  const monthKey = getCalendarMonthKey();

  const patch: Record<string, unknown> = {
    credits: billing.effectiveCredits,
    updatedAt: Date.now(),
  };
  if (stripePeriodEnd) {
    patch.stripeSubscriptionCurrentPeriodEnd = stripePeriodEnd;
  } else {
    patch.creditsPeriodMonthKey = monthKey;
  }

  await ctx.db.patch(entity._id as any, patch);
  await ctx.db.insert("creditLogs", {
    orgId: isOrg ? entity.workosOrgId : "",
    userId: isOrg ? undefined : entity._id,
    amount: billing.effectiveCredits - balanceBefore,
    type: "grant",
    balanceBefore,
    balanceAfter: billing.effectiveCredits,
    reason: billing.resetReason,
    createdAt: Date.now(),
  });

  const updated = await ctx.db.get(entity._id as any);
  return updated as Doc<"organizations"> | Doc<"users">;
}

export async function syncCreditBilling(
  ctx: QueryCtx | MutationCtx,
  entity: Doc<"organizations"> | Doc<"users">,
  stripeInfo?: StripePlanInfo,
): Promise<{ entity: Doc<"organizations"> | Doc<"users">; billing: CreditBillingSnapshot }> {
  const entityId = "workosOrgId" in entity ? entity.workosOrgId : entity.workosUserId;
  const resolvedStripeInfo = stripeInfo ?? (await getPlanFromStripe(ctx, entityId));
  const billing = resolveCreditBilling(entity, resolvedStripeInfo);

  if (!billing.needsPersistedReset) {
    return { entity, billing };
  }

  if (isMutationCtx(ctx)) {
    const updated = await persistCreditPeriodResetOnEntity(ctx, entity, resolvedStripeInfo);
    return {
      entity: updated,
      billing: resolveCreditBilling(updated, resolvedStripeInfo),
    };
  }

  return {
    entity: {
      ...entity,
      credits: billing.effectiveCredits,
    } as Doc<"organizations"> | Doc<"users">,
    billing,
  };
}

export async function lazyResetCreditsIfNeeded(
  ctx: MutationCtx | QueryCtx,
  entity: Doc<"organizations"> | Doc<"users">,
  stripeInfo?: StripePlanInfo,
): Promise<Doc<"organizations"> | Doc<"users">> {
  const { entity: syncedEntity } = await syncCreditBilling(ctx, entity, stripeInfo);
  return syncedEntity;
}

export const persistCreditPeriodReset = internalMutation({
  args: {
    workosUserId: v.optional(v.string()),
    workosOrgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.workosOrgId) {
      const org = await ctx.db
        .query("organizations")
        .withIndex("by_workosOrgId", (q) => q.eq("workosOrgId", args.workosOrgId!))
        .unique();
      if (!org) {
        return;
      }
      const stripeInfo = await getPlanFromStripe(ctx, args.workosOrgId);
      await persistCreditPeriodResetOnEntity(ctx, org, stripeInfo);
      return;
    }

    if (args.workosUserId) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_workosUserId", (q) => q.eq("workosUserId", args.workosUserId!))
        .unique();
      if (!user) {
        return;
      }
      const stripeInfo = await getPlanFromStripe(ctx, args.workosUserId);
      await persistCreditPeriodResetOnEntity(ctx, user, stripeInfo);
    }
  },
});

export const getPlanAndUsage = query({
  args: {
    orgId: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const { userId, orgId } = await getAuthContext(ctx, args.orgId);
    if (!orgId || orgId === "personal") {
      const user = await ctx.db
        .query("users")
        .withIndex("by_workosUserId", (q) => q.eq("workosUserId", userId))
        .unique();
      if (!user) {
        return null;
      }
      const stripeInfo = await getPlanFromStripe(ctx, userId);
      const { billing } = await syncCreditBilling(ctx, user, stripeInfo);
      const planConfig = getPlan(stripeInfo.plan);

      return {
        orgName: "Personal Workspace",
        plan: stripeInfo.plan,
        planConfig,
        credits: billing.effectiveCredits,
        monthlyAllowance: billing.monthlyAllowance,
        stripeSubscriptionStatus: stripeInfo.status,
        stripeSubscriptionCurrentPeriodEnd: stripeInfo.currentPeriodEnd,
        memberCount: 1,
        allPlans: PLANS,
        extraCreditsPriceId: EXTRA_CREDITS_PRICE_ID,
      };
    }

    const org = await ctx.db
      .query("organizations")
      .withIndex("by_workosOrgId", (q) => q.eq("workosOrgId", orgId))
      .unique();

    if (!org) {
      return null;
    }

    const stripeInfo = await getPlanFromStripe(ctx, orgId);
    const { billing } = await syncCreditBilling(ctx, org, stripeInfo);
    const planConfig = getPlan(stripeInfo.plan);

    return {
      orgName: org.name,
      plan: stripeInfo.plan,
      planConfig,
      credits: billing.effectiveCredits,
      monthlyAllowance: billing.monthlyAllowance,
      stripeSubscriptionStatus: stripeInfo.status,
      stripeSubscriptionCurrentPeriodEnd: stripeInfo.currentPeriodEnd,
      memberCount: org.members.length,
      allPlans: PLANS,
      extraCreditsPriceId: EXTRA_CREDITS_PRICE_ID,
    };
  },
});

export const internalGetPlanFromStripe = internalQuery({
  args: { entityId: v.string() },
  handler: async (ctx, args) => {
    return await getPlanFromStripe(ctx, args.entityId);
  },
});
