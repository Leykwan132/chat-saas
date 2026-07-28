import { StripeSubscriptions } from "@convex-dev/stripe";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import { action } from "./_generated/server";
import { getBillingWorkosUserId } from "./billingScope";
import { getStripePriceId } from "./planStripe";
import { createCheckoutSessionWithPromotionCodes } from "./stripeCheckout";

const stripeClient = new StripeSubscriptions(components.stripe, {});

type BillingUser = {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
};

export const create = action({
  args: {
    cancelPath: v.string(),
    interval: v.union(v.literal("monthly"), v.literal("annual")),
  },
  handler: async (ctx, args) => {
    const userId = await getBillingWorkosUserId(ctx);
    const user = (await ctx.runQuery(internal.stripe.internalGetUser, {
      userId,
    })) as BillingUser | null;
    if (!user) {
      throw new Error("User not found");
    }

    const customer = await stripeClient.getOrCreateCustomer(ctx, {
      userId,
      email: user.email,
      name: user.firstName
        ? `${user.firstName} ${user.lastName ?? ""}`.trim()
        : user.email,
    });
    const frontendUrl = (
      process.env.APP_BASE_URL || "http://localhost:5173"
    ).replace(/\/+$/, "");

    return await createCheckoutSessionWithPromotionCodes({
      priceId: getStripePriceId("free", args.interval),
      customerId: customer.customerId,
      mode: "subscription",
      successUrl: `${frontendUrl}/workspace?success=true`,
      cancelUrl: `${frontendUrl}${args.cancelPath}`,
      metadata: { orgId: userId, type: "subscription" },
      subscriptionMetadata: { orgId: userId },
      paymentMethodCollection: "if_required",
      allowPromotionCodes: false,
    });
  },
});
