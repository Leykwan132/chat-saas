import { mutation, query } from "./_generated/server";
import { getAuthContext } from "./authUtils";
import type { Doc } from "./_generated/dataModel";
import { v } from "convex/values";
import { getPlan, getPlanFromStripe } from "./plans";

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
    const { orgId } = await getAuthContext(ctx);
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_workosOrgId", (q) => q.eq("workosOrgId", orgId))
      .unique();
    if (org === null) return [];

    const adminSet = new Set<string>(org.admins.map((id: string) => id));
    const users: Array<Doc<"users"> & { isAdmin: boolean }> = [];
    for (const memberId of org.members) {
      const user = await ctx.db.get(memberId);
      if (user === null) continue;
      users.push({ ...user, isAdmin: adminSet.has(memberId) });
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

export const completeOnboarding = mutation({
  args: {
    role: v.string(),
    useCase: v.array(v.string()),
    channels: v.array(v.string()),
    plan: v.union(
      v.literal("free"),
      v.literal("standard"),
      v.literal("pro"),
      v.literal("ultra"),
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
      await ctx.db.insert("creditLogs", {
        orgId: "",
        userId: user._id,
        amount: initialCredits,
        type: "grant",
        balanceBefore: 0,
        balanceAfter: initialCredits,
        reason: `Initial onboarding credit grant for ${planConfig.name} plan`,
        createdAt: Date.now(),
      });
    }

    return { success: true };
  },
});
