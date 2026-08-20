import { query, internalQuery, type MutationCtx, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { getAuthContextOrNull } from "./authUtils";
import type { Doc } from "./_generated/dataModel";
import { components } from "./_generated/api";
import {
  getActiveTeamForUser,
  getTeamByWorkosOrgId,
  teamToOrgId,
} from "./teamHelpers";
import { getPartnerCreditBalance } from "./whiteLabel/creditLedger";
import { getWhiteLabelPartnerOrganizationForTeam, getWhiteLabelPlanForTeam } from "./whiteLabel/planResolver";
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
import { selectLatestStripeSubscription } from "./latestStripeSubscription";
import {
  getTeamStripePlanHelper,
  resolveCanceledSubscriptionPlan,
  resolveDeletingTeamPlan,
} from "./teamStripePlanResolver";

export type { PlanKey, PlanCatalogEntry, PlanFeatureFlags };
export {
  getTeamStripePlanHelper,
  resolveCanceledSubscriptionPlan,
  resolveDeletingTeamPlan,
};

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
  const user = await ctx.db
    .query("users")
    .withIndex("by_workosUserId", (q) => q.eq("workosUserId", entityId))
    .unique();
  if (user?.activeTeamId) {
    const whiteLabelPlan = await getWhiteLabelPlanForTeam(ctx, user.activeTeamId);
    if (whiteLabelPlan !== null) return { plan: whiteLabelPlan };
  }
  const subscriptions = await ctx.runQuery(
    components.stripe.public.listSubscriptionsByOrgId,
    { orgId: entityId }
  );
  const subscription = selectLatestStripeSubscription(subscriptions);

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
  const team = await getTeamByWorkosOrgId(ctx, orgId);
  if (team !== null) {
    const whiteLabelPlan = await getWhiteLabelPlanForTeam(ctx, team._id);
    if (whiteLabelPlan !== null) {
      const limit = PLAN_CATALOG[whiteLabelPlan].maxChannels;
      return limit === "unlimited" ? 999999 : limit;
    }
  }
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

    const activeTeam = await getActiveTeamForUser(ctx, user);
    const partnerOrganization = await getWhiteLabelPartnerOrganizationForTeam(ctx, activeTeam._id);
    if (partnerOrganization !== null) {
      const plan = await getWhiteLabelPlanForTeam(ctx, activeTeam._id);
      if (plan === null) throw new Error("Customer organization plan not found.");
      const balance = await getPartnerCreditBalance(ctx, partnerOrganization._id);
      const planConfig = getPlan(plan);
      const channelLimit = planConfig.maxChannels === "unlimited" ? 999999 : planConfig.maxChannels;
      return {
        orgName: activeTeam.name,
        isTeam: true,
        canManageBilling: false,
        plan,
        planConfig,
        entitlements: getPlanEntitlements(plan),
        credits: balance.remainingCredits,
        monthlyCredits: balance.monthlyCredits,
        monthlyAllowance: balance.period?.grantedCredits ?? planConfig.monthlyCredits,
        monthlyUsed: balance.period?.usedCredits ?? 0,
        purchasedCredits: balance.manualCredits,
        purchasedCreditsGranted: balance.balance?.manualGrantedCredits ?? 0,
        additionalCredits: balance.manualCredits,
        additionalCreditsGranted: balance.balance?.manualGrantedCredits ?? 0,
        referralCredits: 0,
        referralCreditsGranted: 0,
        periodStartMs: balance.period?.periodStart ?? null,
        periodEndMs: balance.period?.periodEnd ?? null,
        stripeSubscriptionStatus: undefined,
        stripeSubscriptionCurrentPeriodEnd: undefined,
        memberCount: 1,
        allPlans: PLANS,
        channelLimit,
      };
    }

    const { billingUser, isTeam, teamName } = await getBillingEntityForUser(ctx, user);

    const stripeInfo = await getPlanFromStripe(ctx, billingUser.workosUserId);
    const planConfig = getPlan(stripeInfo.plan);
    const snapshot = await snapshotUserCredit(ctx, billingUser._id);

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
    return await getPlanFromStripe(ctx, args.entityId);
  },
});
