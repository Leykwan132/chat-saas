import { internalQuery, mutation, query } from "./_generated/server";
import { getAuthContext } from "./authUtils";
import type { Doc } from "./_generated/dataModel";
import { v } from "convex/values";
import { getPlanFromStripe } from "./plans";
import {
  ensureFirstCreditPeriod,
  getOrCreateCurrentPeriod,
} from "./creditPeriodPool";
import { getBillingEntityForUser } from "./plans";
import { ensureUserAccount } from "./teamHelpers";
import { redeemReferralDuringOnboarding } from "./referralRedemption";

/** Debug / introspection: Convex auth identity (WorkOS JWT claims) for the current socket. */
export const getAuthUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    return identity;
  },
});

// Returns the user docs for everyone in the caller's active organization.
// Resolves `organizations.members` to the corresponding `users` rows. Members
// missing a row (e.g. webhook race) are skipped instead of erroring.
export const getUsers = query({
  args: {},
  handler: async (ctx) => {
    const { activeTeamId } = await getAuthContext(ctx);
    if (!activeTeamId) return [];

    const memberships = await ctx.db
      .query("teamMemberships")
      .withIndex("by_teamId", (q) => q.eq("teamId", activeTeamId))
      .collect();

    const users: Array<
      Doc<"users"> & { isAdmin: boolean; role: Doc<"teamMemberships">["role"] }
    > = [];

    for (const membership of memberships) {
      const user = await ctx.db.get(membership.userId);
      if (user === null) continue;

      const role = membership.role;
      const isAdmin = role === "owner" || role === "admin";

      users.push({ ...user, isAdmin, role });
    }
    return users;
  },
});

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_workosUserId", (q) => q.eq("workosUserId", identity.subject))
      .unique();
    if (!user) return null;

    const stripeInfo = await getPlanFromStripe(ctx, identity.subject);
    return {
      ...user,
      plan: stripeInfo.plan,
      stripeSubscriptionStatus: stripeInfo.status,
    };
  },
});

export const internalGetByWorkosUserId = internalQuery({
  args: { workosUserId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_workosUserId", (q) => q.eq("workosUserId", args.workosUserId))
      .unique();
  },
});

/** Creates the app user row on first login if webhooks haven't run yet. */
export const ensureCurrentUser = mutation({
  args: {
    timeZone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      throw new Error("Not authenticated");
    }

    const userId = await ensureUserAccount(ctx, {
      workosUserId: identity.subject,
      email: identity.email ?? undefined,
      timeZone: args.timeZone,
    });
    const user = await ctx.db.get(userId);
    if (user === null) {
      throw new Error("User not found in database");
    }

    const stripeInfo = await getPlanFromStripe(ctx, identity.subject);
    return {
      ...user,
      plan: stripeInfo.plan,
      stripeSubscriptionStatus: stripeInfo.status,
    };
  },
});

export const completeOnboarding = mutation({
  args: {
    role: v.string(),
    useCase: v.array(v.string()),
    channels: v.array(v.string()),
    referralCode: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    referralRewardCredits: v.union(v.number(), v.null()),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_workosUserId", (q) => q.eq("workosUserId", identity.subject))
      .unique();

    if (user === null) {
      throw new Error("User not found in database");
    }

    // Ensure a credit period exists for the user's billing account. The first
    // period grants the plan's monthly credits as the welcome allocation.
    const { billingUser } = await getBillingEntityForUser(ctx, user);
    await ensureFirstCreditPeriod(ctx, billingUser._id);
    await getOrCreateCurrentPeriod(ctx, billingUser._id);

    const referralRewardCredits = await redeemReferralDuringOnboarding(
      ctx,
      user,
      args.referralCode,
    );

    if (!user.onboarded) {
      await ctx.db.patch(user._id, {
        onboarded: true,
        onboardingAnswers: {
          role: args.role,
          useCase: args.useCase,
          channels: args.channels,
        },
        updatedAt: Date.now(),
      });
    }

    return { success: true, referralRewardCredits };
  },
});
