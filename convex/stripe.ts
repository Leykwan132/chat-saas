import { action, internalMutation, internalQuery } from "./_generated/server";
import { components, internal } from "./_generated/api";
import { StripeSubscriptions } from "@convex-dev/stripe";
import { v } from "convex/values";
import { getBillingWorkosUserId } from "./billingScope";
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
import {
  createTopUpEntry,
  getCreditPeriodKey,
  scopeFromOrg,
  scopeFromUser,
  syncDenormalizedCreditFields,
} from "./creditEntries";
import { getPlanFromStripe } from "./plans";
import { getPersonalTeamForUser, getTeamByWorkosOrgId } from "./teamHelpers";

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
    const userId = await getBillingWorkosUserId(ctx);

    const user = (await ctx.runQuery(internal.stripe.internalGetUser, { userId })) as any;
    if (!user) {
      throw new Error("User not found");
    }

    const email = user.email;
    const name = user.firstName
      ? `${user.firstName} ${user.lastName ?? ""}`.trim()
      : user.email;

    const customer = await stripeClient.getOrCreateCustomer(ctx, {
      userId,
      email,
      name,
    });
    
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
    const successUrl = `${frontendUrl}/workspace?success=true`;
    const cancelUrl = args.cancelPath
      ? `${frontendUrl}${args.cancelPath}`
      : `${frontendUrl}/onboarding`;

    const creditMetadata = {
      orgId: userId,
      type: STRIPE_EXTRA_CREDITS_METADATA_TYPE,
      [STRIPE_CREDITS_AMOUNT_METADATA_KEY]: String(EXTRA_CREDITS_PACK_AMOUNT),
    };

    const sessionParams: any = {
      priceId,
      customerId: customer.customerId,
      mode: args.mode,
      successUrl,
      cancelUrl,
      metadata: args.mode === "payment" ? creditMetadata : { orgId: userId, type: "subscription" },
    };

    if (args.mode === "subscription") {
      sessionParams.subscriptionMetadata = { orgId: userId };
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
    const userId = await getBillingWorkosUserId(ctx);

    const user = (await ctx.runQuery(internal.stripe.internalGetUser, { userId })) as any;
    if (!user) throw new Error("User not found");
    const stripeCustomerId = user.stripeCustomerId;

    if (!stripeCustomerId) {
      throw new Error("No Stripe billing customer found.");
    }

    const frontendUrl = process.env.APP_BASE_URL || process.env.FRONTEND_URL || "http://localhost:5173";
    const returnPath = args.returnPath ?? "/workspace/settings?section=plan";
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
  handler: async (ctx, _args) => {
    const userId = await getBillingWorkosUserId(ctx);

    const subscription = await ctx.runQuery(
      components.stripe.public.getSubscriptionByOrgId,
      { orgId: userId },
    );

    if (subscription) {
      await ctx.runMutation(internal.stripe.handleSubscriptionUpdatedInternal, {
        stripeSubscriptionId: subscription.stripeSubscriptionId,
        stripeCustomerId: subscription.stripeCustomerId,
        status: subscription.status,
        priceId: subscription.priceId,
        currentPeriodEnd: subscription.currentPeriodEnd,
        orgId: userId,
      });
      return { success: true, plan: subscription.priceId };
    }

    const user = (await ctx.runQuery(internal.stripe.internalGetUser, { userId })) as any;
    if (user && user.stripePriceId) {
      await ctx.runMutation(internal.stripe.handleSubscriptionDeletedInternal, {
        stripeSubscriptionId: user.stripeSubscriptionId || "unknown",
        orgId: userId,
      });
    }
    return { success: true, plan: "free" };
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

      // Assign the Stripe subscription ID to the personal team in the teams table
      const personalTeam = await getPersonalTeamForUser(ctx, user._id);
      if (personalTeam) {
        await ctx.db.patch(personalTeam._id, {
          stripeSubscriptionId: args.stripeSubscriptionId,
          updatedAt: Date.now(),
        });
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

      // Assign the Stripe subscription ID to the organizational team in the teams table
      const orgTeam = await getTeamByWorkosOrgId(ctx, args.orgId);
      if (orgTeam) {
        await ctx.db.patch(orgTeam._id, {
          stripeSubscriptionId: args.stripeSubscriptionId,
          updatedAt: Date.now(),
        });
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

      const personalTeam = await getPersonalTeamForUser(ctx, user._id);
      if (personalTeam) {
        await ctx.db.patch(personalTeam._id, {
          stripeSubscriptionId: undefined,
          updatedAt: Date.now(),
        });
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

      const orgTeam = await getTeamByWorkosOrgId(ctx, args.orgId);
      if (orgTeam) {
        await ctx.db.patch(orgTeam._id, {
          stripeSubscriptionId: undefined,
          updatedAt: Date.now(),
        });
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

      const scope = scopeFromUser(user);
      const stripeInfo = await getPlanFromStripe(ctx, args.orgId);
      const periodKey = getCreditPeriodKey(stripeInfo);
      const before = snapshotCreditBalances(user);
      const topUpEntryId = await createTopUpEntry(ctx, scope, {
        amount: args.creditsToGrant,
        label: buildTopUpLabel(args.creditsToGrant),
        stripePaymentIntentId: args.stripePaymentIntentId,
      });
      const synced = await syncDenormalizedCreditFields(
        ctx,
        user._id,
        scope,
        periodKey,
        user,
      );
      const balanceAfter = synced.monthlyCredits + synced.purchasedCredits;

      await insertCreditLog(ctx, {
        orgId: "",
        userId: user._id,
        eventType: "top_up",
        label: buildTopUpLabel(args.creditsToGrant),
        amount: args.creditsToGrant,
        balanceBefore: before.balanceBefore,
        balanceAfter,
        monthlyCreditsBefore: before.monthlyCreditsBefore,
        monthlyCreditsAfter: synced.monthlyCredits,
        purchasedCreditsBefore: before.purchasedCreditsBefore,
        purchasedCreditsAfter: synced.purchasedCredits,
        creditCost: args.creditsToGrant,
        stripePaymentIntentId: args.stripePaymentIntentId,
        topUpEntryId,
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

      const scope = scopeFromOrg(org);
      const stripeInfo = await getPlanFromStripe(ctx, args.orgId);
      const periodKey = getCreditPeriodKey(stripeInfo);
      const before = snapshotCreditBalances(org);
      const topUpEntryId = await createTopUpEntry(ctx, scope, {
        amount: args.creditsToGrant,
        label: buildTopUpLabel(args.creditsToGrant),
        stripePaymentIntentId: args.stripePaymentIntentId,
      });
      const synced = await syncDenormalizedCreditFields(
        ctx,
        org._id,
        scope,
        periodKey,
        org,
      );
      const balanceAfter = synced.monthlyCredits + synced.purchasedCredits;

      await insertCreditLog(ctx, {
        orgId: args.orgId,
        eventType: "top_up",
        label: buildTopUpLabel(args.creditsToGrant),
        amount: args.creditsToGrant,
        balanceBefore: before.balanceBefore,
        balanceAfter,
        monthlyCreditsBefore: before.monthlyCreditsBefore,
        monthlyCreditsAfter: synced.monthlyCredits,
        purchasedCreditsBefore: before.purchasedCreditsBefore,
        purchasedCreditsAfter: synced.purchasedCredits,
        creditCost: args.creditsToGrant,
        stripePaymentIntentId: args.stripePaymentIntentId,
        topUpEntryId,
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
  handler: async (ctx, _args) => {
    const userId = await getBillingWorkosUserId(ctx);

    const user = (await ctx.runQuery(internal.stripe.internalGetUser, { userId })) as any;
    if (!user) {
      throw new Error("User not found");
    }

    const email = user.email;
    const name = user.firstName
      ? `${user.firstName} ${user.lastName ?? ""}`.trim()
      : user.email;

    await stripeClient.getOrCreateCustomer(ctx, {
      userId,
      email,
      name,
    });

    return { success: true };
  },
});
