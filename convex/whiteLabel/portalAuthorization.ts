import { v } from "convex/values";
import { internalQuery } from "../_generated/server";

export const assertPartnerOwner = internalQuery({
  args: { workosUserId: v.string(), controlTeamId: v.id("teams") },
  returns: v.object({ partnerId: v.id("whiteLabelPartners") }),
  handler: async (ctx, args) => {
    const access = await ctx.db
      .query("whiteLabelPartnerAccess")
      .withIndex("by_workosUserId_and_status", (q) =>
        q.eq("workosUserId", args.workosUserId).eq("status", "active"),
      )
      .first();
    if (access === null) throw new Error("Partner access is unavailable for this workspace.");
    const partner = await ctx.db.get(access.partnerId);
    if (partner === null || partner.status !== "active" || partner.controlTeamId !== args.controlTeamId) throw new Error("Partner access is unavailable for this workspace.");
    return { partnerId: partner._id };
  },
});

export const getInvitableOrganization = internalQuery({
  args: { workosUserId: v.string(), controlTeamId: v.id("teams"), partnerOrganizationId: v.id("whiteLabelPartnerOrganizations") },
  returns: v.object({ workosOrgId: v.string() }),
  handler: async (ctx, args) => {
    const access = await ctx.db
      .query("whiteLabelPartnerAccess")
      .withIndex("by_workosUserId_and_status", (q) =>
        q.eq("workosUserId", args.workosUserId).eq("status", "active"),
      )
      .first();
    const partner = access ? await ctx.db.get(access.partnerId) : null;
    const organization = await ctx.db.get(args.partnerOrganizationId);
    const team = organization ? await ctx.db.get(organization.teamId) : null;
    if (partner === null || partner.controlTeamId !== args.controlTeamId || organization === null || organization.partnerId !== partner._id || team?.workosOrgId === undefined) throw new Error("Customer organization not found.");
    return { workosOrgId: team.workosOrgId };
  },
});
