import { v } from "convex/values";
import { getAuthContext } from "./authUtils";
import { getBillingUser } from "./billingScope";
import {
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { resetCurrentPeriodToFreePlan } from "./creditPlanReset";
import { resolvePlanKeyFromStripePriceId } from "./planStripe";
import { requestTeamDeletion } from "./teamDeletion/request";
import { getPersonalTeamForUser } from "./teamHelpers";

export const getContext = internalQuery({
  args: {},
  returns: v.object({
    userId: v.string(),
    stripeCustomerId: v.optional(v.string()),
    activeOrgId: v.string(),
    isTeam: v.boolean(),
    canManageBilling: v.boolean(),
  }),
  handler: async (ctx) => {
    const auth = await getAuthContext(ctx);
    const user = await getBillingUser(ctx, auth.userId);
    const activeTeam = await ctx.db.get(auth.activeTeamId);
    if (!activeTeam) {
      throw new Error("Active workspace not found");
    }

    const isTeam = activeTeam.type === "organizational";
    return {
      userId: auth.userId,
      stripeCustomerId: user.stripeCustomerId,
      activeOrgId: auth.orgId,
      isTeam,
      canManageBilling: !isTeam || activeTeam.ownerId === user._id,
    };
  },
});

export const finalize = internalMutation({
  args: {
    stripeSubscriptionId: v.string(),
    stripeCustomerId: v.string(),
    status: v.string(),
    priceId: v.string(),
    currentPeriodEnd: v.number(),
    activeOrgId: v.string(),
  },
  returns: v.object({
    redirectToPersonal: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const auth = await getAuthContext(ctx);
    if (auth.orgId !== args.activeOrgId) {
      throw new Error("Active workspace changed during downgrade");
    }
    if (
      args.status !== "active" &&
      args.status !== "trialing"
    ) {
      throw new Error("Free subscription is not active");
    }
    if (resolvePlanKeyFromStripePriceId(args.priceId) !== "free") {
      throw new Error("Stripe price is not a Free plan");
    }

    const user = await getBillingUser(ctx, auth.userId);
    const personalTeam = await getPersonalTeamForUser(ctx, user._id);
    if (!personalTeam) {
      throw new Error("Personal workspace not found");
    }

    const isTeam = Boolean(args.activeOrgId);
    if (isTeam) {
      const activeTeam = await ctx.db.get(auth.activeTeamId);
      if (
        !activeTeam ||
        activeTeam.type !== "organizational" ||
        activeTeam.workosOrgId !== args.activeOrgId ||
        activeTeam.ownerId !== user._id
      ) {
        throw new Error("Only the workspace owner can downgrade this team");
      }
      await ctx.db.patch(activeTeam._id, {
        stripeSubscriptionId: args.stripeSubscriptionId,
        updatedAt: Date.now(),
      });
    }

    const now = Date.now();
    await ctx.db.patch(user._id, {
      activeTeamId: personalTeam._id,
      stripeCustomerId: args.stripeCustomerId,
      stripeSubscriptionId: args.stripeSubscriptionId,
      stripePriceId: args.priceId,
      stripeSubscriptionStatus: args.status,
      stripeSubscriptionCurrentPeriodEnd: args.currentPeriodEnd * 1000,
      updatedAt: now,
    });
    await ctx.db.patch(personalTeam._id, {
      stripeSubscriptionId: args.stripeSubscriptionId,
      updatedAt: now,
    });
    await resetCurrentPeriodToFreePlan(ctx, user._id);

    if (isTeam) {
      await requestTeamDeletion(ctx, {
        workosOrgId: args.activeOrgId,
        stripeSubscriptionId: args.stripeSubscriptionId,
        source: "stripe",
        preserveOwnerSubscription: true,
      });
    }

    return { redirectToPersonal: isTeam };
  },
});
