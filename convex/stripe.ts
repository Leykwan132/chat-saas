import { action, internalMutation, internalQuery } from "./_generated/server";
import { components, internal } from "./_generated/api";
import { StripeSubscriptions } from "@convex-dev/stripe";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { getBillingWorkosUserId } from "./billingScope";
import {
  buildTopUpLabel,
  insertCreditLog,
} from "./creditLogs";
import {
  createTopUpEntry,
} from "./creditEntries";
import { snapshotUserCredit } from "./creditPeriodPool";
import { teamDeletionRequestResultValidator } from "./teamDeletion/request";
import { getTeamByWorkosOrgId } from "./teamHelpers";
import {
  createCheckoutForBillingUser,
  createPortalForBillingUser,
} from "./stripeBillingSessions";
import {
  handleSubscriptionDeleted,
  handleSubscriptionUpdated,
} from "./stripeSubscriptionEvents";

const stripeClient = new StripeSubscriptions(components.stripe, {});

type BillingUserRecord = {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  stripeCustomerId?: string | null;
  stripePriceId?: string | null;
  stripeSubscriptionId?: string | null;
};

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
  handler: async (ctx, args) =>
    await createCheckoutForBillingUser(ctx, args),
});

export const createPortal = action({
  args: {
    orgId: v.optional(v.union(v.string(), v.null())),
    returnPath: v.optional(v.string()),
  },
  handler: async (ctx, args) =>
    await createPortalForBillingUser(ctx, args),
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
    currentPeriodEnd: v.number(),
    orgId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) =>
    await handleSubscriptionUpdated(ctx, args),
});

export const handleSubscriptionDeletedInternal = internalMutation({
  args: {
    stripeSubscriptionId: v.string(),
    orgId: v.string(),
  },
  returns: teamDeletionRequestResultValidator,
  handler: async (ctx, args) =>
    await handleSubscriptionDeleted(ctx, args),
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
      source: "purchase",
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
