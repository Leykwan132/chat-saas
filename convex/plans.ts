import { query, internalQuery, internalMutation, type MutationCtx, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { getAuthContext } from "./authUtils";
import type { Doc } from "./_generated/dataModel";
import { components } from "./_generated/api";
import {
  getActiveTeamForUser,
  teamToOrgId,
} from "./teamHelpers";
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
import {
  getPurchasedCredits,
  getMonthlyCredits,
  getPurchasedCreditsGranted,
} from "./creditBalance";
import {
  insertCreditLog,
  snapshotCreditBalances,
  sumTopUpGrants,
} from "./creditLogs";
import {
  createCreditPeriodReset,
  ensureCreditEntryState,
  getCreditPeriodKey,
  getCreditPeriodSummary,
  getTopUpSummary,
  scopeFromOrg,
  scopeFromUser,
} from "./creditEntries";

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

async function resolvePurchasedCreditsGranted(
  ctx: QueryCtx,
  entity: Doc<"organizations"> | Doc<"users">,
  scope: { orgId: string; userId?: Doc<"users">["_id"] },
): Promise<number> {
  const topUpSummary = await getTopUpSummary(ctx, scope);
  if (topUpSummary.purchasedCreditsGranted > 0) {
    return topUpSummary.purchasedCreditsGranted;
  }
  const remaining = getPurchasedCredits(entity);
  const stored = getPurchasedCreditsGranted(entity);
  const fromLogs = await sumTopUpGrants(ctx, scope);
  return Math.max(remaining, stored, fromLogs);
}

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
  const monthlyBalance = entity.credits ?? 0;
  const purchasedBalance = getPurchasedCredits(entity);
  const stripePeriodEnd = hasActiveStripeBilling(stripeInfo.status)
    ? stripeInfo.currentPeriodEnd
    : undefined;

  if (stripePeriodEnd && entity.stripeSubscriptionCurrentPeriodEnd !== stripePeriodEnd) {
    return {
      effectiveCredits: monthlyAllowance + purchasedBalance,
      monthlyAllowance,
      needsPersistedReset: true,
      resetReason: `Monthly subscription credit reset for ${planConfig.name} plan`,
    };
  }

  const monthKey = getCalendarMonthKey();
  if (!stripePeriodEnd && entity.creditsPeriodMonthKey !== monthKey) {
    return {
      effectiveCredits: monthlyAllowance + purchasedBalance,
      monthlyAllowance,
      needsPersistedReset: true,
      resetReason: `Monthly credit reset for ${planConfig.name} plan`,
    };
  }

  return {
    effectiveCredits: monthlyBalance + purchasedBalance,
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
  const scope = isOrg ? scopeFromOrg(entity) : scopeFromUser(entity);
  const periodKey = getCreditPeriodKey(stripeInfo);
  const before = snapshotCreditBalances(entity);
  const topUpSummary = await getTopUpSummary(ctx, scope);

  const creditPeriod = await createCreditPeriodReset(
    ctx,
    scope,
    periodKey,
    billing.monthlyAllowance,
  );
  const monthlyCreditsAfter = creditPeriod.balance;
  const purchasedBalance = topUpSummary.purchasedCredits;
  const balanceAfter = monthlyCreditsAfter + purchasedBalance;

  const stripePeriodEnd = hasActiveStripeBilling(stripeInfo.status)
    ? stripeInfo.currentPeriodEnd
    : undefined;
  const monthKey = getCalendarMonthKey();

  const patch: Record<string, unknown> = {
    credits: monthlyCreditsAfter,
    purchasedCredits: purchasedBalance,
    updatedAt: Date.now(),
  };
  if (stripePeriodEnd) {
    patch.stripeSubscriptionCurrentPeriodEnd = stripePeriodEnd;
  } else {
    patch.creditsPeriodMonthKey = monthKey;
  }

  await ctx.db.patch(entity._id as any, patch);
  await insertCreditLog(ctx, {
    orgId: isOrg ? entity.workosOrgId : "",
    userId: isOrg ? undefined : entity._id,
    eventType: "monthly_reset",
    label: "Monthly reset",
    amount: balanceAfter - before.balanceBefore,
    balanceBefore: before.balanceBefore,
    balanceAfter,
    monthlyCreditsBefore: before.monthlyCreditsBefore,
    monthlyCreditsAfter,
    purchasedCreditsBefore: before.purchasedCreditsBefore,
    purchasedCreditsAfter: purchasedBalance,
    creditPeriodId: creditPeriod._id,
    reason: billing.resetReason,
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

  if (isMutationCtx(ctx)) {
    const scope =
      "workosOrgId" in entity ? scopeFromOrg(entity) : scopeFromUser(entity);
    const periodKey = getCreditPeriodKey(resolvedStripeInfo);

    if (billing.needsPersistedReset) {
      const updated = await persistCreditPeriodResetOnEntity(
        ctx,
        entity,
        resolvedStripeInfo,
      );
      return {
        entity: updated,
        billing: resolveCreditBilling(updated, resolvedStripeInfo),
      };
    }

    await ensureCreditEntryState(
      ctx,
      entity,
      scope,
      periodKey,
      billing.monthlyAllowance,
    );
    const updated = await ctx.db.get(entity._id as any);
    const syncedEntity = (updated ?? entity) as Doc<"organizations"> | Doc<"users">;
    return {
      entity: syncedEntity,
      billing: resolveCreditBilling(syncedEntity, resolvedStripeInfo),
    };
  }

  if (billing.needsPersistedReset) {
    return {
      entity: {
        ...entity,
        credits: billing.effectiveCredits - getPurchasedCredits(entity),
      } as Doc<"organizations"> | Doc<"users">,
      billing,
    };
  }

  return { entity, billing };
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

export async function getBillingEntityForUser(
  ctx: QueryCtx | MutationCtx,
  user: Doc<"users">
): Promise<{ billingUser: Doc<"users">; isTeam: boolean; teamName?: string }> {
  // This is referring to the user current team. 
  if (user.activeTeamId) {
    const team = await ctx.db.get(user.activeTeamId);
    if (team && team.type === "organizational") {
      const owner = await ctx.db.get(team.ownerId);
      if (owner) {
        return { billingUser: owner, isTeam: true, teamName: team.name };
      }
    }
  }
  return { billingUser: user, isTeam: false };
}

export async function getChannelLimitForOrg(
  ctx: QueryCtx | MutationCtx,
  orgId: string,
  userId?: string,
): Promise<number> {
  const stripeInfo = await getTeamStripePlanHelper(ctx, { workosOrgId: orgId, userId });
  const planConfig = PLAN_CATALOG[stripeInfo.plan] || PLAN_CATALOG.free;
  return planConfig.maxChannels === "unlimited" ? 999999 : planConfig.maxChannels;
}

export const getPlanAndUsage = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await getAuthContext(ctx);
    const user = await ctx.db
      .query("users")
      .withIndex("by_workosUserId", (q) => q.eq("workosUserId", userId))
      .unique();
    if (!user) {
      return null;
    }

    const { billingUser, isTeam, teamName } = await getBillingEntityForUser(ctx, user);

    const stripeInfo = await getPlanFromStripe(ctx, billingUser.workosUserId);
    const { billing } = await syncCreditBilling(ctx, billingUser, stripeInfo);
    const planConfig = getPlan(stripeInfo.plan);
    const scope = scopeFromUser(billingUser);
    const periodKey = getCreditPeriodKey(stripeInfo);
    const periodSummary = await getCreditPeriodSummary(ctx, scope, periodKey);
    const topUpSummary = await getTopUpSummary(ctx, scope);
    const purchasedCredits =
      topUpSummary.purchasedCredits || getPurchasedCredits(billingUser);
    const purchasedCreditsGranted = await resolvePurchasedCreditsGranted(
      ctx,
      billingUser,
      { orgId: "", userId: billingUser._id },
    );
    const monthlyCredits =
      periodSummary.monthlyCredits || getMonthlyCredits(billingUser);
    const monthlyAllowance =
      periodSummary.monthlyAllowance || billing.monthlyAllowance;

    const activeTeam = await getActiveTeamForUser(ctx, user);
    const orgId = teamToOrgId(activeTeam);
    const channelLimit = await getChannelLimitForOrg(ctx, orgId, user.workosUserId);

    return {
      orgName: isTeam && teamName ? teamName : "Your account",
      isTeam,
      canManageBilling: user._id === billingUser._id,
      plan: stripeInfo.plan,
      planConfig,
      credits: monthlyCredits + purchasedCredits,
      monthlyCredits,
      purchasedCredits,
      purchasedCreditsGranted,
      monthlyAllowance,
      stripeSubscriptionStatus: stripeInfo.status,
      stripeSubscriptionCurrentPeriodEnd: stripeInfo.currentPeriodEnd,
      memberCount: 1,
      allPlans: PLANS,
      extraCreditsPriceId: EXTRA_CREDITS_PRICE_ID,
      channelLimit,
    };
  },
});

export async function getTeamStripePlanHelper(
  ctx: QueryCtx | MutationCtx,
  args: { workosOrgId: string; userId?: string }
): Promise<{
  plan: PlanKey;
  status?: string;
  currentPeriodEnd?: number;
}> {
  const isPersonal = !args.workosOrgId || args.workosOrgId === "personal" || args.workosOrgId.startsWith("user_");

  if (isPersonal) {
    let workosUserId = args.userId;
    if (!workosUserId && args.workosOrgId.startsWith("user_")) {
      workosUserId = args.workosOrgId;
    }
    if (!workosUserId) {
      const identity = await ctx.auth.getUserIdentity();
      if (identity) {
        workosUserId = identity.subject;
      }
    }

    if (!workosUserId) {
      return { plan: "free" };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_workosUserId", (q) => q.eq("workosUserId", workosUserId!))
      .unique();

    if (!user || !user.stripeSubscriptionId) {
      return { plan: "free" };
    }

    const subscription = await ctx.runQuery(
      components.stripe.public.getSubscription,
      { stripeSubscriptionId: user.stripeSubscriptionId }
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

    return { plan: "free" };
  } else {
    const team = await ctx.db
      .query("teams")
      .withIndex("by_workosOrgId", (q) => q.eq("workosOrgId", args.workosOrgId))
      .unique();

    if (!team) {
      throw new Error(`Team not found for organization ${args.workosOrgId}`);
    }

    if (!team.stripeSubscriptionId) {
      throw new Error(`No Stripe subscription found for team ${team.name}`);
    }

    const subscription = await ctx.runQuery(
      components.stripe.public.getSubscription,
      { stripeSubscriptionId: team.stripeSubscriptionId }
    );

    if (!subscription || (subscription.status !== "active" && subscription.status !== "trialing")) {
      throw new Error(`Stripe subscription ${team.stripeSubscriptionId} is not active or trialing for team ${team.name}`);
    }

    let plan: PlanKey;
    try {
      plan = resolvePlanKeyFromStripePriceId(subscription.priceId);
    } catch {
      throw new Error(`Unsupported Stripe price ID: ${subscription.priceId}`);
    }

    return {
      plan,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd * 1000,
    };
  }
}

export const getTeamStripePlan = internalQuery({
  args: {
    workosOrgId: v.string(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await getTeamStripePlanHelper(ctx, args);
  },
});

export const internalGetPlanFromStripe = internalQuery({
  args: { entityId: v.string() },
  handler: async (ctx, args) => {
    return await getTeamStripePlanHelper(ctx, { workosOrgId: args.entityId });
  },
});
