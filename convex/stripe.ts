import { action, internalMutation, internalQuery } from "./_generated/server";
import { components, internal } from "./_generated/api";
import { StripeSubscriptions } from "@convex-dev/stripe";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { getBillingWorkosUserId } from "./billingScope";
import { getPlan } from "./plans";
import {
  getExtraCreditsPack,
  getExtraCreditsPriceId,
  getStripePriceId,
  resolvePlanKeyFromStripePriceId,
  type ExtraCreditsPackId,
  type PlanKey,
} from "./planCatalog";
import {
  STRIPE_CREDITS_AMOUNT_METADATA_KEY,
  STRIPE_EXTRA_CREDITS_METADATA_TYPE,
} from "../shared/planCatalog";
import {
  buildTopUpLabel,
  insertCreditLog,
} from "./creditLogs";
import {
  createTopUpEntry,
} from "./creditEntries";
import {
  createCheckoutSessionWithPromotionCodes,
  type CheckoutMetadata,
  type CheckoutSessionParams,
} from "./stripeCheckout";
import {
  ensureFirstCreditPeriod,
  applyPlanUpgradeToCurrentPeriod,
  snapshotUserCredit,
} from "./creditPeriodPool";
import { getPersonalTeamForUser, getTeamByWorkosOrgId } from "./teamHelpers";

const stripeClient = new StripeSubscriptions(components.stripe, {});

type BillingUserRecord = {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  stripeCustomerId?: string | null;
  stripePriceId?: string | null;
  stripeSubscriptionId?: string | null;
};

function isPaidPlanKey(plan: string): plan is Exclude<PlanKey, "free"> {
  return plan === "starter" || plan === "growth" || plan === "business";
}

export const createCheckout = action({
  args: {
    plan: v.optional(v.string()),
    interval: v.optional(v.union(v.literal("monthly"), v.literal("annual"))),
    mode: v.union(v.literal("subscription"), v.literal("payment")),
    extraCreditsPackId: v.optional(
      v.union(
        v.literal("credits_2000"),
        v.literal("credits_5000"),
        v.literal("credits_15000"),
      ),
    ),
    orgId: v.optional(v.union(v.string(), v.null())),
    cancelPath: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getBillingWorkosUserId(ctx);

    const user = (await ctx.runQuery(internal.stripe.internalGetUser, {
      userId,
    })) as BillingUserRecord | null;
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
    
    let priceId: string;
    let extraCreditsPack: ReturnType<typeof getExtraCreditsPack> | null = null;
    if (args.mode === "payment") {
      if (!args.extraCreditsPackId) {
        throw new Error("Extra credits pack is required for payment checkout");
      }
      const extraCreditsPackId = args.extraCreditsPackId as ExtraCreditsPackId;
      extraCreditsPack = getExtraCreditsPack(extraCreditsPackId);
      priceId = getExtraCreditsPriceId(extraCreditsPackId);
    } else {
      if (!args.plan || !args.interval || !isPaidPlanKey(args.plan)) {
        throw new Error("Plan and interval are required for subscription checkout");
      }
      priceId = getStripePriceId(args.plan, args.interval);
    }

    const frontendUrl = (process.env.APP_BASE_URL || "http://localhost:5173").replace(
      /\/+$/,
      "",
    );
    const successUrl = `${frontendUrl}/workspace?success=true`;
    const cancelUrl = args.cancelPath
      ? `${frontendUrl}${args.cancelPath.startsWith("/") ? args.cancelPath : `/${args.cancelPath}`}`
      : `${frontendUrl}/onboarding`;

    const creditMetadata: CheckoutMetadata | null = extraCreditsPack
      ? {
          orgId: userId,
          type: STRIPE_EXTRA_CREDITS_METADATA_TYPE,
          extraCreditsPackId: extraCreditsPack.id,
          [STRIPE_CREDITS_AMOUNT_METADATA_KEY]: String(extraCreditsPack.credits),
        }
      : null;

    const sessionParams: CheckoutSessionParams = {
      priceId,
      customerId: customer.customerId,
      mode: args.mode,
      successUrl,
      cancelUrl,
      metadata: creditMetadata ?? { orgId: userId, type: "subscription" },
    };

    if (args.mode === "subscription") {
      sessionParams.subscriptionMetadata = { orgId: userId };
    } else if (creditMetadata) {
      sessionParams.paymentIntentMetadata = creditMetadata;
    }

    return await createCheckoutSessionWithPromotionCodes(sessionParams);
  },
});

export const createPortal = action({
  args: {
    orgId: v.optional(v.union(v.string(), v.null())),
    returnPath: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getBillingWorkosUserId(ctx);

    const user = (await ctx.runQuery(internal.stripe.internalGetUser, {
      userId,
    })) as BillingUserRecord | null;
    if (!user) throw new Error("User not found");
    const stripeCustomerId = user.stripeCustomerId;

    if (!stripeCustomerId) {
      throw new Error("No Stripe billing customer found.");
    }

    const frontendUrl = (
      process.env.APP_BASE_URL ||
      process.env.FRONTEND_URL ||
      "http://localhost:5173"
    ).replace(/\/+$/, "");
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
  handler: async (ctx) => {
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

    const user = (await ctx.runQuery(internal.stripe.internalGetUser, {
      userId,
    })) as BillingUserRecord | null;
    if (user && user.stripePriceId) {
      await ctx.runMutation(internal.stripe.handleSubscriptionDeletedInternal, {
        stripeSubscriptionId: user.stripeSubscriptionId || "unknown",
        orgId: userId,
      });
    }
    return { success: true, plan: "free" };
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
    const newPeriodEndMs = args.currentPeriodEnd * 1000;

    // Resolve the billing user (owner) for this subscription.
    let owner: Doc<"users">;
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
          stripeSubscriptionId: args.stripeSubscriptionId,
          updatedAt: Date.now(),
        });
      }
      owner = user;
    } else {
      const orgTeam = await getTeamByWorkosOrgId(ctx, args.orgId);
      if (!orgTeam) {
        throw new Error("Team not found for organization " + args.orgId);
      }
      await ctx.db.patch(orgTeam._id, {
        stripeSubscriptionId: args.stripeSubscriptionId,
        updatedAt: Date.now(),
      });
      if (!orgTeam.ownerId) {
        throw new Error("Team owner not found");
      }
      const ownerDoc = await ctx.db.get(orgTeam.ownerId);
      if (!ownerDoc) {
        throw new Error("Team owner not found");
      }
      owner = ownerDoc;
    }

    const isPlanChanged = owner.stripePriceId !== args.priceId;

    // Keep Stripe subscription metadata on the owner user in sync (used for
    // plan lookups). The credit cycle itself is independent of the Stripe
    // billing interval, so no credit reset happens on Stripe period change.
    await ctx.db.patch(owner._id, {
      stripeCustomerId: args.stripeCustomerId,
      stripeSubscriptionId: args.stripeSubscriptionId,
      stripePriceId: args.priceId,
      stripeSubscriptionStatus: args.status,
      stripeSubscriptionCurrentPeriodEnd: newPeriodEndMs,
      updatedAt: Date.now(),
    });

    // Ensure a credit period exists for the billing user (first subscription,
    // or re-activation after cancellation).
    await ensureFirstCreditPeriod(ctx, owner._id);

    // On a plan upgrade, grow the current period's allocation immediately so
    // the user benefits right away. Downgrades take effect at the next cycle
    // (the worker re-reads the plan when it creates the next period).
    if (isPlanChanged && isActive) {
      const before = await snapshotUserCredit(ctx, owner._id);
      await applyPlanUpgradeToCurrentPeriod(ctx, owner._id);
      const after = await snapshotUserCredit(ctx, owner._id);
      await insertCreditLog(ctx, {
        orgId: isPersonal ? "" : args.orgId,
        userId: owner._id,
        eventType: "grant",
        label: `Plan change (${planConfig.name})`,
        amount: after.totalRemaining - before.totalRemaining,
        balanceBefore: before.totalRemaining,
        balanceAfter: after.totalRemaining,
        monthlyCreditsBefore: before.monthlyRemaining,
        monthlyCreditsAfter: after.monthlyRemaining,
        purchasedCreditsBefore: before.purchasedRemaining,
        purchasedCreditsAfter: after.purchasedRemaining,
        reason: `Subscription changed to ${planConfig.name} plan`,
      });
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

    let owner: Doc<"users">;
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
      owner = user;
    } else {
      const orgTeam = await getTeamByWorkosOrgId(ctx, args.orgId);
      if (!orgTeam) {
        throw new Error("Team not found for organization " + args.orgId);
      }
      await ctx.db.patch(orgTeam._id, {
        stripeSubscriptionId: undefined,
        updatedAt: Date.now(),
      });
      if (!orgTeam.ownerId) {
        throw new Error("Team owner not found");
      }
      const ownerDoc = await ctx.db.get(orgTeam.ownerId);
      if (!ownerDoc) {
        throw new Error("Team owner not found");
      }
      owner = ownerDoc;
    }

    await ctx.db.patch(owner._id, {
      stripeSubscriptionId: undefined,
      stripePriceId: undefined,
      stripeSubscriptionStatus: "canceled",
      stripeSubscriptionCurrentPeriodEnd: undefined,
      updatedAt: Date.now(),
    });

    // Cancellation reverts the plan to free. The current cycle keeps its
    // allocation; the next cycle (created by the worker) grants free credits.
    const before = await snapshotUserCredit(ctx, owner._id);
    await insertCreditLog(ctx, {
      orgId: isPersonal ? "" : args.orgId,
      userId: owner._id,
      eventType: "adjustment",
      label: "Plan canceled",
      amount: 0,
      balanceBefore: before.totalRemaining,
      balanceAfter: before.totalRemaining,
      monthlyCreditsBefore: before.monthlyRemaining,
      monthlyCreditsAfter: before.monthlyRemaining,
      purchasedCreditsBefore: before.purchasedRemaining,
      purchasedCreditsAfter: before.purchasedRemaining,
      reason: "Subscription canceled, reverts to Free plan next cycle",
    });
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

    let owner: Doc<"users">;
    if (isPersonal) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_workosUserId", (q) => q.eq("workosUserId", args.orgId))
        .unique();
      if (!user) {
        throw new Error("User not found");
      }
      owner = user;
    } else {
      const orgTeam = await getTeamByWorkosOrgId(ctx, args.orgId);
      if (!orgTeam) {
        throw new Error("Team not found for organization " + args.orgId);
      }
      if (!orgTeam.ownerId) {
        throw new Error("Team owner not found");
      }
      const ownerDoc = await ctx.db.get(orgTeam.ownerId);
      if (!ownerDoc) {
        throw new Error("Team owner not found");
      }
      owner = ownerDoc;
    }

    const before = await snapshotUserCredit(ctx, owner._id);
    const topUpEntryId = await createTopUpEntry(ctx, owner._id, {
      grantedCredits: args.creditsToGrant,
      label: buildTopUpLabel(args.creditsToGrant),
      stripePaymentIntentId: args.stripePaymentIntentId,
    });
    const after = await snapshotUserCredit(ctx, owner._id);

    await insertCreditLog(ctx, {
      orgId: isPersonal ? "" : args.orgId,
      userId: owner._id,
      eventType: "top_up",
      label: buildTopUpLabel(args.creditsToGrant),
      amount: args.creditsToGrant,
      balanceBefore: before.totalRemaining,
      balanceAfter: after.totalRemaining,
      monthlyCreditsBefore: before.monthlyRemaining,
      monthlyCreditsAfter: after.monthlyRemaining,
      purchasedCreditsBefore: before.purchasedRemaining,
      purchasedCreditsAfter: after.purchasedRemaining,
      creditCost: args.creditsToGrant,
      stripePaymentIntentId: args.stripePaymentIntentId,
      topUpEntryId,
      reason: `Stripe payment: Purchased ${args.creditsToGrant} extra credits`,
    });

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
  handler: async () => {
    // Credit top-ups are granted from payment_intent.succeeded to avoid double grants.
    return { success: true, skipped: true };
  },
});

export const createStripeCustomer = action({
  args: {
    orgId: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx) => {
    const userId = await getBillingWorkosUserId(ctx);

    const user = (await ctx.runQuery(internal.stripe.internalGetUser, {
      userId,
    })) as BillingUserRecord | null;
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
