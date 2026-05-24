import { action, internalMutation, internalQuery } from "./_generated/server";
import { components, internal } from "./_generated/api";
import { StripeSubscriptions } from "@convex-dev/stripe";
import { v } from "convex/values";
import { getAuthContext } from "./authUtils";
import { getPlan } from "./plans";
import { EXTRA_CREDITS_PRICE_ID, EXTRA_CREDITS_PACK_AMOUNT, getStripePriceId, resolvePlanKeyFromStripePriceId } from "./planCatalog";
import {
  STRIPE_CREDITS_AMOUNT_METADATA_KEY,
  STRIPE_EXTRA_CREDITS_METADATA_TYPE,
} from "../shared/planCatalog";
import {
  buildTopUpLabel,
  insertCreditLog,
  snapshotCreditBalances,
} from "./creditLogs";
import { nextPurchasedCreditGrant } from "./creditBalance";

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

    const creditMetadata = {
      orgId: entityId,
      type: STRIPE_EXTRA_CREDITS_METADATA_TYPE,
      [STRIPE_CREDITS_AMOUNT_METADATA_KEY]: String(EXTRA_CREDITS_PACK_AMOUNT),
    };

    const sessionParams: any = {
      priceId,
      customerId: customer.customerId,
      mode: args.mode,
      successUrl,
      cancelUrl,
      metadata: args.mode === "payment" ? creditMetadata : { orgId: entityId, type: "subscription" },
    };

    if (args.mode === "subscription") {
      sessionParams.subscriptionMetadata = { orgId: entityId };
    } else {
      sessionParams.paymentIntentMetadata = creditMetadata;
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
        const before = snapshotCreditBalances(user);
        const monthlyCreditsAfter = monthlyCredits;
        const purchasedCreditsAfter = before.purchasedCreditsBefore;
        const balanceAfter = monthlyCreditsAfter + purchasedCreditsAfter;
        await insertCreditLog(ctx, {
          orgId: "",
          userId: user._id,
          eventType: isNewPeriod && !isPlanChanged ? "monthly_reset" : "grant",
          label:
            isNewPeriod && !isPlanChanged
              ? "Monthly reset"
              : `Plan ${isPlanChanged ? "change" : "renewal"} (${planConfig.name})`,
          amount: balanceAfter - before.balanceBefore,
          balanceBefore: before.balanceBefore,
          balanceAfter,
          monthlyCreditsBefore: before.monthlyCreditsBefore,
          monthlyCreditsAfter,
          purchasedCreditsBefore: before.purchasedCreditsBefore,
          purchasedCreditsAfter,
          reason: `Subscription ${isPlanChanged ? "change" : "renewal"} to ${planConfig.name} plan`,
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
        const before = snapshotCreditBalances(org);
        const monthlyCreditsAfter = monthlyCredits;
        const purchasedCreditsAfter = before.purchasedCreditsBefore;
        const balanceAfter = monthlyCreditsAfter + purchasedCreditsAfter;
        await insertCreditLog(ctx, {
          orgId: args.orgId,
          eventType: isNewPeriod && !isPlanChanged ? "monthly_reset" : "grant",
          label:
            isNewPeriod && !isPlanChanged
              ? "Monthly reset"
              : `Plan ${isPlanChanged ? "change" : "renewal"} (${planConfig.name})`,
          amount: balanceAfter - before.balanceBefore,
          balanceBefore: before.balanceBefore,
          balanceAfter,
          monthlyCreditsBefore: before.monthlyCreditsBefore,
          monthlyCreditsAfter,
          purchasedCreditsBefore: before.purchasedCreditsBefore,
          purchasedCreditsAfter,
          reason: `Subscription ${isPlanChanged ? "change" : "renewal"} to ${planConfig.name} plan`,
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

      const before = snapshotCreditBalances(user);
      const newMonthlyCredits = Math.min(before.monthlyCreditsBefore, freePlanConfig.monthlyCredits);
      const balanceAfter = newMonthlyCredits + before.purchasedCreditsBefore;

      await ctx.db.patch(user._id, {
        stripeSubscriptionId: undefined,
        stripePriceId: undefined,
        stripeSubscriptionStatus: "canceled",
        stripeSubscriptionCurrentPeriodEnd: undefined,
        credits: newMonthlyCredits,
        updatedAt: Date.now(),
      });

      await insertCreditLog(ctx, {
        orgId: "",
        userId: user._id,
        eventType: "adjustment",
        label: "Plan canceled",
        amount: balanceAfter - before.balanceBefore,
        balanceBefore: before.balanceBefore,
        balanceAfter,
        monthlyCreditsBefore: before.monthlyCreditsBefore,
        monthlyCreditsAfter: newMonthlyCredits,
        purchasedCreditsBefore: before.purchasedCreditsBefore,
        purchasedCreditsAfter: before.purchasedCreditsBefore,
        reason: "Subscription canceled, reverted to Free plan",
      });
    } else {
      const org = await ctx.db
        .query("organizations")
        .withIndex("by_workosOrgId", (q) => q.eq("workosOrgId", args.orgId))
        .unique();
      if (!org) {
        throw new Error("Organization not found");
      }

      const before = snapshotCreditBalances(org);
      const newMonthlyCredits = Math.min(before.monthlyCreditsBefore, freePlanConfig.monthlyCredits);
      const balanceAfter = newMonthlyCredits + before.purchasedCreditsBefore;

      await ctx.db.patch(org._id, {
        stripeSubscriptionId: undefined,
        stripePriceId: undefined,
        stripeSubscriptionStatus: "canceled",
        stripeSubscriptionCurrentPeriodEnd: undefined,
        credits: newMonthlyCredits,
        updatedAt: Date.now(),
      });

      await insertCreditLog(ctx, {
        orgId: args.orgId,
        eventType: "adjustment",
        label: "Plan canceled",
        amount: balanceAfter - before.balanceBefore,
        balanceBefore: before.balanceBefore,
        balanceAfter,
        monthlyCreditsBefore: before.monthlyCreditsBefore,
        monthlyCreditsAfter: newMonthlyCredits,
        purchasedCreditsBefore: before.purchasedCreditsBefore,
        purchasedCreditsAfter: before.purchasedCreditsBefore,
        reason: "Subscription canceled, reverted to Free plan",
      });
    }
  },
});

export const handlePaymentIntentSucceededInternal = internalMutation({
  args: {
    stripePaymentIntentId: v.string(),
    orgId: v.string(),
    creditsToGrant: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.creditsToGrant <= 0) {
      throw new Error("Invalid credits amount");
    }

    const existing = await ctx.db
      .query("processedStripePayments")
      .withIndex("by_stripePaymentIntentId", (q) =>
        q.eq("stripePaymentIntentId", args.stripePaymentIntentId),
      )
      .unique();
    if (existing) {
      return { success: true, alreadyProcessed: true };
    }

    const isPersonal = args.orgId.startsWith("user_");

    if (isPersonal) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_workosUserId", (q) => q.eq("workosUserId", args.orgId))
        .unique();
      if (!user) {
        throw new Error("User not found");
      }

      const before = snapshotCreditBalances(user);
      const purchased = nextPurchasedCreditGrant(user, args.creditsToGrant);
      const balanceAfter = before.monthlyCreditsBefore + purchased.purchasedCredits;

      await ctx.db.patch(user._id, {
        purchasedCredits: purchased.purchasedCredits,
        purchasedCreditsGranted: purchased.purchasedCreditsGranted,
        updatedAt: Date.now(),
      });

      await insertCreditLog(ctx, {
        orgId: "",
        userId: user._id,
        eventType: "top_up",
        label: buildTopUpLabel(args.creditsToGrant),
        amount: args.creditsToGrant,
        balanceBefore: before.balanceBefore,
        balanceAfter,
        monthlyCreditsBefore: before.monthlyCreditsBefore,
        monthlyCreditsAfter: before.monthlyCreditsBefore,
        purchasedCreditsBefore: before.purchasedCreditsBefore,
        purchasedCreditsAfter: purchased.purchasedCredits,
        creditCost: args.creditsToGrant,
        stripePaymentIntentId: args.stripePaymentIntentId,
        reason: `Stripe payment: Purchased ${args.creditsToGrant} extra credits`,
      });
    } else {
      const org = await ctx.db
        .query("organizations")
        .withIndex("by_workosOrgId", (q) => q.eq("workosOrgId", args.orgId))
        .unique();
      if (!org) {
        throw new Error("Organization not found");
      }

      const before = snapshotCreditBalances(org);
      const purchased = nextPurchasedCreditGrant(org, args.creditsToGrant);
      const balanceAfter = before.monthlyCreditsBefore + purchased.purchasedCredits;

      await ctx.db.patch(org._id, {
        purchasedCredits: purchased.purchasedCredits,
        purchasedCreditsGranted: purchased.purchasedCreditsGranted,
        updatedAt: Date.now(),
      });

      await insertCreditLog(ctx, {
        orgId: args.orgId,
        eventType: "top_up",
        label: buildTopUpLabel(args.creditsToGrant),
        amount: args.creditsToGrant,
        balanceBefore: before.balanceBefore,
        balanceAfter,
        monthlyCreditsBefore: before.monthlyCreditsBefore,
        monthlyCreditsAfter: before.monthlyCreditsBefore,
        purchasedCreditsBefore: before.purchasedCreditsBefore,
        purchasedCreditsAfter: purchased.purchasedCredits,
        creditCost: args.creditsToGrant,
        stripePaymentIntentId: args.stripePaymentIntentId,
        reason: `Stripe payment: Purchased ${args.creditsToGrant} extra credits`,
      });
    }

    await ctx.db.insert("processedStripePayments", {
      stripePaymentIntentId: args.stripePaymentIntentId,
      orgId: args.orgId,
      creditsGranted: args.creditsToGrant,
      processedAt: Date.now(),
    });

    return { success: true, alreadyProcessed: false };
  },
});

export const handlePaymentCompletedInternal = internalMutation({
  args: {
    stripeCustomerId: v.optional(v.string()),
    orgId: v.string(),
    amountInCents: v.number(),
  },
  handler: async (_ctx, _args) => {
    // Credit top-ups are granted from payment_intent.succeeded to avoid double grants.
    return { success: true, skipped: true };
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
