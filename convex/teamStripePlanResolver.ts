import { components } from "./_generated/api";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import {
  resolvePlanKeyFromStripePriceId,
  type PlanKey,
} from "./planCatalog";

function safelyResolvePlanKeyFromStripePriceId(priceId: string): PlanKey {
  try {
    return resolvePlanKeyFromStripePriceId(priceId);
  } catch {
    return "free";
  }
}

export function resolveDeletingTeamPlan(team: {
  deletionStatus?: "deleting";
}): { plan: "free"; status: "canceled" } | null {
  if (team.deletionStatus === "deleting") {
    return { plan: "free", status: "canceled" };
  }
  return null;
}

export function resolveCanceledSubscriptionPlan(
  status: string | undefined,
): { plan: "free"; status: "canceled" } | null {
  return status === "canceled" || status === "cancelled"
    ? { plan: "free", status: "canceled" }
    : null;
}

export async function getTeamStripePlanHelper(
  ctx: QueryCtx | MutationCtx,
  args: { workosOrgId: string; userId?: string },
): Promise<{
  plan: PlanKey;
  status?: string;
  currentPeriodEnd?: number;
}> {
  const isPersonal =
    !args.workosOrgId ||
    args.workosOrgId === "personal" ||
    args.workosOrgId.startsWith("user_");

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
      .withIndex("by_workosUserId", (q) => q.eq("workosUserId", workosUserId))
      .unique();

    if (!user || !user.stripeSubscriptionId) {
      return { plan: "free" };
    }

    const subscription = await ctx.runQuery(
      components.stripe.public.getSubscription,
      { stripeSubscriptionId: user.stripeSubscriptionId },
    );

    if (
      subscription &&
      (subscription.status === "active" ||
        subscription.status === "trialing")
    ) {
      const plan = safelyResolvePlanKeyFromStripePriceId(subscription.priceId);
      return {
        plan,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd * 1000,
      };
    }

    return { plan: "free" };
  }

  const team = await ctx.db
    .query("teams")
    .withIndex("by_workosOrgId", (q) =>
      q.eq("workosOrgId", args.workosOrgId),
    )
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
    const canceledPlan = resolveCanceledSubscriptionPlan(
      owner?.stripeSubscriptionStatus,
    );
    if (canceledPlan) {
      return canceledPlan;
    }
    throw new Error(`No Stripe subscription found for team ${team.name}`);
  }

  const subscription = await ctx.runQuery(
    components.stripe.public.getSubscription,
    { stripeSubscriptionId: team.stripeSubscriptionId },
  );

  const canceledPlan = resolveCanceledSubscriptionPlan(subscription?.status);
  if (canceledPlan) {
    return canceledPlan;
  }

  if (
    !subscription ||
    (subscription.status !== "active" && subscription.status !== "trialing")
  ) {
    throw new Error(
      `Stripe subscription ${team.stripeSubscriptionId} is not active or trialing for team ${team.name}`,
    );
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
