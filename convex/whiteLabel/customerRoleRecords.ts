import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

const roleValidator = v.union(
  v.literal("owner"),
  v.literal("admin"),
  v.literal("member"),
);

export const getCustomerRoleTarget = internalQuery({
  args: {
    partnerOrganizationId: v.id("whiteLabelPartnerOrganizations"),
    workosUserId: v.string(),
  },
  returns: v.object({ workosOrganizationMembershipId: v.string() }),
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("whiteLabelPartnerOrganizationAccounts")
      .withIndex("by_partnerOrganizationId_and_workosUserId", (q) =>
        q
          .eq("partnerOrganizationId", args.partnerOrganizationId)
          .eq("workosUserId", args.workosUserId),
      )
      .unique();
    if (account === null) throw new Error("Customer account not found.");
    return {
      workosOrganizationMembershipId: account.workosOrganizationMembershipId,
    };
  },
});

export const updateCustomerRoleRecord = internalMutation({
  args: {
    partnerOrganizationId: v.id("whiteLabelPartnerOrganizations"),
    workosUserId: v.string(),
    role: roleValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const organization = await ctx.db.get(args.partnerOrganizationId);
    if (organization === null) {
      throw new Error("Customer organization not found.");
    }
    const account = await ctx.db
      .query("whiteLabelPartnerOrganizationAccounts")
      .withIndex("by_partnerOrganizationId_and_workosUserId", (q) =>
        q
          .eq("partnerOrganizationId", args.partnerOrganizationId)
          .eq("workosUserId", args.workosUserId),
      )
      .unique();
    if (account === null) throw new Error("Customer account not found.");
    const user = await ctx.db
      .query("users")
      .withIndex("by_workosUserId", (q) => q.eq("workosUserId", args.workosUserId))
      .unique();
    if (user === null) throw new Error("Customer user not found.");
    const membership = await ctx.db
      .query("teamMemberships")
      .withIndex("by_userId_and_teamId", (q) =>
        q.eq("userId", user._id).eq("teamId", organization.teamId),
      )
      .unique();
    if (membership === null) {
      throw new Error("Customer workspace membership not found.");
    }
    const now = Date.now();
    await ctx.db.patch(account._id, { role: args.role, updatedAt: now });
    await ctx.db.patch(membership._id, { role: args.role });
    return null;
  },
});
