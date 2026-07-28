"use node";

import Stripe from "stripe";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import { action } from "./_generated/server";
import {
  buildFreePlanSubscriptionUpdate,
  buildStoredSubscriptionUpdate,
  getSoleSubscriptionItem,
  selectLatestActiveSubscriptionForDowngrade,
} from "./freePlanSubscriptionUpdate";
import { getStripePriceId } from "./planStripe";

function getStripeSecretKey(): string {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY environment variable is not set");
  }
  return secretKey;
}

export const execute = action({
  args: {
    interval: v.union(v.literal("monthly"), v.literal("annual")),
  },
  returns: v.object({
    redirectToPersonal: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const downgradeContext = await ctx.runQuery(
      internal.freePlanDowngradeState.getContext,
      {},
    );
    if (!downgradeContext.canManageBilling) {
      throw new Error("Only the workspace owner can change this plan");
    }

    const subscriptions = await ctx.runQuery(
      components.stripe.public.listSubscriptionsByOrgId,
      { orgId: downgradeContext.userId },
    );
    const latest = selectLatestActiveSubscriptionForDowngrade(subscriptions);
    if (
      downgradeContext.stripeCustomerId &&
      latest.stripeCustomerId !== downgradeContext.stripeCustomerId
    ) {
      throw new Error("Stripe customer does not match the billing account");
    }

    const stripe = new Stripe(getStripeSecretKey());
    const subscription = await stripe.subscriptions.retrieve(
      latest.stripeSubscriptionId,
    );
    if (
      typeof subscription.customer !== "string" ||
      subscription.customer !== latest.stripeCustomerId
    ) {
      throw new Error("Stripe subscription does not match the billing account");
    }

    const priceId = getStripePriceId("free", args.interval);
    const updated = await stripe.subscriptions.update(
      subscription.id,
      buildFreePlanSubscriptionUpdate(
        subscription,
        priceId,
        downgradeContext.userId,
      ),
    );
    const updatedItem = getSoleSubscriptionItem(updated);
    if (updatedItem.price.id !== priceId) {
      throw new Error("Stripe did not apply the selected Free price");
    }

    await ctx.runMutation(
      components.stripe.private.handleSubscriptionUpdated,
      buildStoredSubscriptionUpdate(updated),
    );

    return await ctx.runMutation(
      internal.freePlanDowngradeState.finalize,
      {
        stripeSubscriptionId: updated.id,
        stripeCustomerId:
          typeof updated.customer === "string"
            ? updated.customer
            : updated.customer.id,
        status: updated.status,
        priceId,
        currentPeriodEnd: updatedItem.current_period_end,
        activeOrgId: downgradeContext.activeOrgId,
      },
    );
  },
});
