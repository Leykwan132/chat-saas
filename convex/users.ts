import { internalQuery, mutation, query } from "./_generated/server";
import { getAuthContext } from "./authUtils";
import type { Doc } from "./_generated/dataModel";
import { v } from "convex/values";
import { getPlan, getPlanFromStripe } from "./plans";
import { insertCreditLog } from "./creditLogs";
import {
  ensureActiveCreditPeriod,
  scopeFromUser,
} from "./creditEntries";
import { ensureUserAccount } from "./teamHelpers";

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
    plan: v.union(
      v.literal("free"),
      v.literal("starter"),
      v.literal("growth"),
      v.literal("business"),
    ),
  },
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

    const planConfig = getPlan(args.plan);
    const initialCredits = planConfig.monthlyCredits;

    await ctx.db.patch(user._id, {
      onboarded: true,
      onboardingAnswers: {
        role: args.role,
        useCase: args.useCase,
        channels: args.channels,
      },
      credits: user.credits !== undefined ? user.credits : initialCredits,
      updatedAt: Date.now(),
    });

    if (user.credits === undefined) {
      const scope = scopeFromUser(user);
      const periodKey = `month:${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, "0")}`;
      const creditPeriod = await ensureActiveCreditPeriod(
        ctx,
        scope,
        periodKey,
        initialCredits,
        initialCredits,
      );

      await insertCreditLog(ctx, {
        orgId: "",
        userId: user._id,
        eventType: "grant",
        label: `Welcome credits (${planConfig.name})`,
        amount: initialCredits,
        balanceBefore: 0,
        balanceAfter: initialCredits,
        monthlyCreditsBefore: 0,
        monthlyCreditsAfter: initialCredits,
        purchasedCreditsBefore: 0,
        purchasedCreditsAfter: 0,
        creditCost: initialCredits,
        creditPeriodId: creditPeriod._id,
        reason: `Initial onboarding credit grant for ${planConfig.name} plan`,
      });
    }

    return { success: true };
  },
});
