import { action, internalMutation, internalQuery } from "./_generated/server";
import { components, internal } from "./_generated/api";
import { StripeSubscriptions } from "@convex-dev/stripe";
import { v } from "convex/values";
import { getAuthContext } from "./authUtils";
import { getPlan } from "./plans";
import { EXTRA_CREDITS_PRICE_ID, getStripePriceId, resolvePlanKeyFromStripePriceId } from "./planCatalog";

const stripeClient = new StripeSubscriptions(components.stripe, {});

export const createCheckout = action({
  args: {
    plan: v.optional(v.string()),
    interval: v.optional(v.union(v.literal("monthly"), v.literal("annual"))),
    mode: v.union(v.literal("subscription"), v.literal("payment")),
    orgId: v.optional(v.union(v.string(), v.null())),
    cancelPath: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { orgId, userId } = await getAuthContext(ctx, args.orgId);
    const isPersonal = !orgId || orgId === "personal";
    const entityId = isPersonal ? userId : orgId;

    const user = (await ctx.runQuery(internal.stripe.internalGetUser, { userId })) as any;
    if (!user) {
      throw new Error("User not found");
    }

    const email = user.email;
    let name = user.firstName ? `${user.firstName} ${user.lastName ?? ""}`.trim() : user.email;

    if (!isPersonal) {
      const org = (await ctx.runQuery(internal.stripe.internalGetOrg, { orgId })) as any;
      if (!org) {
        throw new Error("Organization not found");
      }
      name = org.name;
    }

    // Create or retrieve Stripe Customer linked to organization's ID or user's ID
    const customer = await stripeClient.getOrCreateCustomer(ctx, {
      userId: entityId,
      email,
      name,
    });

    console.log("customer", customer);
    
    let priceId = "";
    if (args.mode === "payment") {
      priceId = EXTRA_CREDITS_PRICE_ID;
    } else {
      if (!args.plan || !args.interval) {
        throw new Error("Plan and interval are required for subscription checkout");
      }
      priceId = getStripePriceId(args.plan as any, args.interval);
    }

    const frontendUrl = process.env.APP_BASE_URL || "http://localhost:5173";
    const successUrl = `${frontendUrl}/workspace/account?success=true`;
    const cancelUrl = args.cancelPath
      ? `${frontendUrl}${args.cancelPath}`
      : `${frontendUrl}/workspace/account?canceled=true`;

    const sessionParams: any = {
      priceId,
      customerId: customer.customerId,
      mode: args.mode,
      successUrl,
      cancelUrl,
      metadata: { orgId: entityId, type: args.mode === "payment" ? "extra_credits" : "subscription" },
    };

    if (args.mode === "subscription") {
      sessionParams.subscriptionMetadata = { orgId: entityId };
    } else {
      sessionParams.paymentIntentMetadata = { orgId: entityId };
    }

    return await stripeClient.createCheckoutSession(ctx, sessionParams);
  },
});

export const createPortal = action({
  args: {
    orgId: v.optional(v.union(v.string(), v.null())),
    returnPath: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { orgId, userId } = await getAuthContext(ctx, args.orgId);
    const isPersonal = !orgId || orgId === "personal";

    let stripeCustomerId: string | undefined = undefined;
    if (isPersonal) {
      const user = (await ctx.runQuery(internal.stripe.internalGetUser, { userId })) as any;
      if (!user) throw new Error("User not found");
      stripeCustomerId = user.stripeCustomerId;
    } else {
      const org = (await ctx.runQuery(internal.stripe.internalGetOrg, { orgId })) as any;
      if (!org) throw new Error("Organization not found");
      stripeCustomerId = org.stripeCustomerId;
    }

    if (!stripeCustomerId) {
      throw new Error("No Stripe billing customer found.");
    }

    const frontendUrl = process.env.APP_BASE_URL || process.env.FRONTEND_URL || "http://localhost:5173";
    const returnPath = args.returnPath ?? "/workspace/account?section=plan";
    const returnUrl = `${frontendUrl}${returnPath.startsWith("/") ? returnPath : `/${returnPath}`}`;

    const portalSession = await stripeClient.createCustomerPortalSession(ctx, {
      customerId: stripeCustomerId,
      returnUrl,
    });
    return portalSession as { url: string };
  },
});

export const syncBillingWithStripe = action({
  args: {
    orgId: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const { orgId, userId } = await getAuthContext(ctx, args.orgId);
    const isPersonal = !orgId || orgId === "personal";
    const entityId = isPersonal ? userId : orgId;

    // Query Stripe subscription from component database table
    const subscription = await ctx.runQuery(
      components.stripe.public.getSubscriptionByOrgId,
      { orgId: entityId }
    );

    if (subscription) {
      await ctx.runMutation(internal.stripe.handleSubscriptionUpdatedInternal, {
        stripeSubscriptionId: subscription.stripeSubscriptionId,
        stripeCustomerId: subscription.stripeCustomerId,
        status: subscription.status,
        priceId: subscription.priceId,
        currentPeriodEnd: subscription.currentPeriodEnd,
        orgId: entityId,
      });
      return { success: true, plan: subscription.priceId };
    } else {
      if (isPersonal) {
        const user = (await ctx.runQuery(internal.stripe.internalGetUser, { userId })) as any;
        if (user && user.stripePriceId) {
          await ctx.runMutation(internal.stripe.handleSubscriptionDeletedInternal, {
            stripeSubscriptionId: user.stripeSubscriptionId || "unknown",
            orgId: entityId,
          });
        }
      } else {
        const org = (await ctx.runQuery(internal.stripe.internalGetOrg, { orgId })) as any;
        if (org && org.stripePriceId) {
          await ctx.runMutation(internal.stripe.handleSubscriptionDeletedInternal, {
            stripeSubscriptionId: org.stripeSubscriptionId || "unknown",
            orgId: entityId,
          });
        }
      }
      return { success: true, plan: "free" };
    }
  },
});

export const internalGetOrg = internalQuery({
  args: { orgId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("organizations")
      .withIndex("by_workosOrgId", (q) => q.eq("workosOrgId", args.orgId))
      .unique();
  },
});

export const internalGetUser = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_workosUserId", (q) => q.eq("workosUserId", args.userId))
      .unique();
  },
});

export const handleSubscriptionUpdatedInternal = internalMutation({
  args: {
    stripeSubscriptionId: v.string(),
    stripeCustomerId: v.string(),
    status: v.string(),
    priceId: v.string(),
    currentPeriodEnd: v.number(), // in seconds
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    const isPersonal = args.orgId.startsWith("user_");
    
    const isActive = args.status === "active" || args.status === "trialing";
    const plan = isActive
      ? resolvePlanKeyFromStripePriceId(args.priceId)
      : "free";

    const planConfig = getPlan(plan);
    const monthlyCredits = planConfig.monthlyCredits;
    const newPeriodEndMs = args.currentPeriodEnd * 1000;

    if (isPersonal) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_workosUserId", (q) => q.eq("workosUserId", args.orgId))
        .unique();
      if (!user) {
        throw new Error("User not found");
      }

      const isPlanChanged = user.stripePriceId !== args.priceId;
      const isNewPeriod = user.stripeSubscriptionCurrentPeriodEnd !== newPeriodEndMs;

      const updates: any = {
        stripeCustomerId: args.stripeCustomerId,
        stripeSubscriptionId: args.stripeSubscriptionId,
        stripePriceId: args.priceId,
        stripeSubscriptionStatus: args.status,
        stripeSubscriptionCurrentPeriodEnd: newPeriodEndMs,
        updatedAt: Date.now(),
      };

      if (isPlanChanged || isNewPeriod) {
        updates.credits = monthlyCredits;
      }

      await ctx.db.patch(user._id, updates);

      if (isPlanChanged || isNewPeriod) {
        await ctx.db.insert("creditLogs", {
          orgId: "",
          userId: user._id,
          amount: monthlyCredits - (user.credits ?? 0),
          type: "grant",
          balanceBefore: user.credits ?? 0,
          balanceAfter: monthlyCredits,
          reason: `Subscription ${isPlanChanged ? "change" : "renewal"} to ${planConfig.name} plan`,
          createdAt: Date.now(),
        });
      }
    } else {
      const org = await ctx.db
        .query("organizations")
        .withIndex("by_workosOrgId", (q) => q.eq("workosOrgId", args.orgId))
        .unique();
      if (!org) {
        throw new Error("Organization not found");
      }

      const isPlanChanged = org.stripePriceId !== args.priceId;
      const isNewPeriod = org.stripeSubscriptionCurrentPeriodEnd !== newPeriodEndMs;

      const updates: any = {
        stripeCustomerId: args.stripeCustomerId,
        stripeSubscriptionId: args.stripeSubscriptionId,
        stripePriceId: args.priceId,
        stripeSubscriptionStatus: args.status,
        stripeSubscriptionCurrentPeriodEnd: newPeriodEndMs,
        updatedAt: Date.now(),
      };

      if (isPlanChanged || isNewPeriod) {
        updates.credits = monthlyCredits;
      }

      await ctx.db.patch(org._id, updates);

      if (isPlanChanged || isNewPeriod) {
        await ctx.db.insert("creditLogs", {
          orgId: args.orgId,
          amount: monthlyCredits - (org.credits ?? 0),
          type: "grant",
          balanceBefore: org.credits ?? 0,
          balanceAfter: monthlyCredits,
          reason: `Subscription ${isPlanChanged ? "change" : "renewal"} to ${planConfig.name} plan`,
          createdAt: Date.now(),
        });
      }
    }
  },
});

export const handleSubscriptionDeletedInternal = internalMutation({
  args: {
    stripeSubscriptionId: v.string(),
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    const isPersonal = args.orgId.startsWith("user_");
    const freePlanConfig = getPlan("free");

    if (isPersonal) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_workosUserId", (q) => q.eq("workosUserId", args.orgId))
        .unique();
      if (!user) {
        throw new Error("User not found");
      }

      const balanceBefore = user.credits ?? 0;

      await ctx.db.patch(user._id, {
        stripeSubscriptionId: undefined,
        stripePriceId: undefined,
        stripeSubscriptionStatus: "canceled",
        stripeSubscriptionCurrentPeriodEnd: undefined,
        credits: Math.min(balanceBefore, freePlanConfig.monthlyCredits),
        updatedAt: Date.now(),
      });

      await ctx.db.insert("creditLogs", {
        orgId: "",
        userId: user._id,
        amount: -Math.max(0, balanceBefore - freePlanConfig.monthlyCredits),
        type: "deduction",
        balanceBefore,
        balanceAfter: Math.min(balanceBefore, freePlanConfig.monthlyCredits),
        reason: "Subscription canceled, reverted to Free plan",
        createdAt: Date.now(),
      });
    } else {
      const org = await ctx.db
        .query("organizations")
        .withIndex("by_workosOrgId", (q) => q.eq("workosOrgId", args.orgId))
        .unique();
      if (!org) {
        throw new Error("Organization not found");
      }

      const balanceBefore = org.credits ?? 0;

      await ctx.db.patch(org._id, {
        stripeSubscriptionId: undefined,
        stripePriceId: undefined,
        stripeSubscriptionStatus: "canceled",
        stripeSubscriptionCurrentPeriodEnd: undefined,
        credits: Math.min(balanceBefore, freePlanConfig.monthlyCredits),
        updatedAt: Date.now(),
      });

      await ctx.db.insert("creditLogs", {
        orgId: args.orgId,
        amount: -Math.max(0, balanceBefore - freePlanConfig.monthlyCredits),
        type: "deduction",
        balanceBefore,
        balanceAfter: Math.min(balanceBefore, freePlanConfig.monthlyCredits),
        reason: "Subscription canceled, reverted to Free plan",
        createdAt: Date.now(),
      });
    }
  },
});

export const handlePaymentCompletedInternal = internalMutation({
  args: {
    stripeCustomerId: v.optional(v.string()),
    orgId: v.string(),
    amountInCents: v.number(),
  },
  handler: async (ctx, args) => {
    const isPersonal = args.orgId.startsWith("user_");
    const creditsToGrant = 1000;

    if (isPersonal) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_workosUserId", (q) => q.eq("workosUserId", args.orgId))
        .unique();
      if (!user) {
        throw new Error("User not found");
      }

      const balanceBefore = user.credits ?? 0;
      const balanceAfter = balanceBefore + creditsToGrant;

      await ctx.db.patch(user._id, {
        credits: balanceAfter,
        updatedAt: Date.now(),
      });

      await ctx.db.insert("creditLogs", {
        orgId: "",
        userId: user._id,
        amount: creditsToGrant,
        type: "top_up",
        balanceBefore,
        balanceAfter,
        reason: `Stripe payment: Purchased ${creditsToGrant} extra credits`,
        createdAt: Date.now(),
      });
    } else {
      const org = await ctx.db
        .query("organizations")
        .withIndex("by_workosOrgId", (q) => q.eq("workosOrgId", args.orgId))
        .unique();
      if (!org) {
        throw new Error("Organization not found");
      }

      const balanceBefore = org.credits ?? 0;
      const balanceAfter = balanceBefore + creditsToGrant;

      await ctx.db.patch(org._id, {
        credits: balanceAfter,
        updatedAt: Date.now(),
      });

      await ctx.db.insert("creditLogs", {
        orgId: args.orgId,
        amount: creditsToGrant,
        type: "top_up",
        balanceBefore,
        balanceAfter,
        reason: `Stripe payment: Purchased ${creditsToGrant} extra credits`,
        createdAt: Date.now(),
      });
    }
  },
});

export const createStripeCustomer = action({
  args: {
    orgId: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const { orgId, userId } = await getAuthContext(ctx, args.orgId);
    const isPersonal = !orgId || orgId === "personal";
    const entityId = isPersonal ? userId : orgId;

    const user = (await ctx.runQuery(internal.stripe.internalGetUser, { userId })) as any;
    if (!user) {
      throw new Error("User not found");
    }

    const email = user.email;
    let name = user.firstName ? `${user.firstName} ${user.lastName ?? ""}`.trim() : user.email;

    if (!isPersonal) {
      const org = (await ctx.runQuery(internal.stripe.internalGetOrg, { orgId })) as any;
      if (!org) {
        throw new Error("Organization not found");
      }
      name = org.name;
    }

    await stripeClient.getOrCreateCustomer(ctx, {
      userId: entityId,
      email,
      name,
    });

    return { success: true };
  },
});
