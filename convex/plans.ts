import { query, internalQuery, type MutationCtx, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { getAuthContextOrNull } from "./authUtils";
import type { Doc } from "./_generated/dataModel";
import { components } from "./_generated/api";
import {
  getActiveTeamForUser,
  teamToOrgId,
} from "./teamHelpers";
import {
  PLAN_CATALOG,
  PLAN_ORDER,
  formatPlanPriceLabel,
  resolvePlanKeyFromStripePriceId,
  type PlanCatalogEntry,
  type PlanFeatureFlags,
  type PlanKey,
} from "./planCatalog";
import {
  snapshotUserCredit,
} from "./creditPeriodPool";

export type { PlanKey, PlanCatalogEntry, PlanFeatureFlags };

export function resolveDeletingTeamPlan(team: {
  deletionStatus?: "deleting";
}): { plan: "free"; status: "canceled" } | null {
  if (team.deletionStatus === "deleting") {
    return { plan: "free", status: "canceled" };
  }
  return null;
}

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

export function getPlan(planName: string | undefined): PlanConfig {
  const key = (planName ?? "free") as PlanKey;
  return PLANS[key] || PLANS.free;
}

function safelyResolvePlanKeyFromStripePriceId(priceId: string): PlanKey {
  try {
    return resolvePlanKeyFromStripePriceId(priceId);
  } catch {
    return "free";
  }
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
    const plan = safelyResolvePlanKeyFromStripePriceId(subscription.priceId);
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

export function getRequiredPlanForFeature(
  featureKey: keyof PlanFeatureFlags,
): PlanKey | null {
  for (const planKey of PLAN_ORDER) {
    if (PLAN_CATALOG[planKey].features[featureKey]) {
      return planKey;
    }
  }
  return null;
}

export function getPlanEntitlements(planName: string | undefined) {
  const plan = getPlan(planName);
  return {
    features: plan.features,
    limits: {
      monthlyCredits: plan.monthlyCredits,
      maxAgents: plan.maxAgents,
      maxChannels: plan.maxChannels,
      maxMembers: plan.maxMembers,
      knowledgeBaseBytesPerAgent: plan.knowledgeBaseBytesPerAgent,
    },
  };
}

export function checkAgentCreationLimit(
  planName: string | undefined,
  currentAgentCount: number,
): boolean {
  const plan = getPlan(planName);
  if (plan.maxAgents === "unlimited") return true;
  return currentAgentCount < plan.maxAgents;
}

export async function getBillingEntityForUser(
  ctx: QueryCtx | MutationCtx,
  user: Doc<"users">
): Promise<{ billingUser: Doc<"users">; isTeam: boolean; teamName?: string }> {
  // This is referring to the user current team. 
  if (user.activeTeamId) {
    const team = await ctx.db.get(user.activeTeamId);
    if (team && team.type === "organizational" && team.ownerId) {
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
    const auth = await getAuthContextOrNull(ctx);
    if (!auth) return null;
    const { userId } = auth;
    const user = await ctx.db
      .query("users")
      .withIndex("by_workosUserId", (q) => q.eq("workosUserId", userId))
      .unique();
    if (!user) {
      return null;
    }

    const { billingUser, isTeam, teamName } = await getBillingEntityForUser(ctx, user);

    const stripeInfo = await getPlanFromStripe(ctx, billingUser.workosUserId);
    const planConfig = getPlan(stripeInfo.plan);
    const snapshot = await snapshotUserCredit(ctx, billingUser._id);

    const activeTeam = await getActiveTeamForUser(ctx, user);
    const orgId = teamToOrgId(activeTeam);
    const channelLimit = await getChannelLimitForOrg(ctx, orgId, user.workosUserId);

    return {
      orgName: isTeam && teamName ? teamName : "Your account",
      isTeam,
      canManageBilling: user._id === billingUser._id,
      plan: stripeInfo.plan,
      planConfig,
      entitlements: getPlanEntitlements(stripeInfo.plan),
      credits: snapshot.totalRemaining,
      monthlyCredits: snapshot.monthlyRemaining,
      monthlyAllowance: snapshot.monthlyGranted,
      monthlyUsed: snapshot.monthlyUsed,
      purchasedCredits: snapshot.purchasedRemaining,
      purchasedCreditsGranted: snapshot.purchasedGranted,
      additionalCredits: snapshot.additionalRemaining,
      additionalCreditsGranted: snapshot.additionalGranted,
      referralCredits: snapshot.referralRemaining,
      referralCreditsGranted: snapshot.referralGranted,
      periodStartMs: snapshot.period?.periodStart ?? null,
      periodEndMs: snapshot.period?.periodEnd ?? null,
      stripeSubscriptionStatus: stripeInfo.status,
      stripeSubscriptionCurrentPeriodEnd: stripeInfo.currentPeriodEnd,
      memberCount: 1,
      allPlans: PLANS,
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
      const plan = safelyResolvePlanKeyFromStripePriceId(subscription.priceId);
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

    const deletingPlan = resolveDeletingTeamPlan(team);
    if (deletingPlan) {
      return deletingPlan;
    }

    if (!team.stripeSubscriptionId) {
      const owner = team.ownerId ? await ctx.db.get(team.ownerId) : null;
      if (owner?.stripeSubscriptionStatus === "canceled") {
        return { plan: "free", status: "canceled" };
      }
      throw new Error(`No Stripe subscription found for team ${team.name}`);
    }

    const subscription = await ctx.runQuery(
      components.stripe.public.getSubscription,
      { stripeSubscriptionId: team.stripeSubscriptionId }
    );

    if (subscription?.status === "canceled") {
      return { plan: "free", status: "canceled" };
    }

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
