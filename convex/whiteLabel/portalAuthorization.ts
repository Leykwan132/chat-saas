import { v } from "convex/values";
import { internalQuery, type QueryCtx } from "../_generated/server";

type PartnerOwnerArgs = {
  email: string;
  workosUserId: string;
};

async function getPartnerOwner(ctx: QueryCtx, args: PartnerOwnerArgs) {
  const email = args.email.trim().toLowerCase();
  const emailAccess = email
    ? await ctx.db
      .query("whiteLabelPartnerAccess")
      .withIndex("by_email_and_status", (q) =>
        q.eq("email", email).eq("status", "active"),
      )
      .first()
    : null;
  const access = emailAccess ?? await ctx.db
    .query("whiteLabelPartnerAccess")
    .withIndex("by_workosUserId_and_status", (q) =>
      q.eq("workosUserId", args.workosUserId).eq("status", "active"),
    )
    .first();
  if (access === null) throw new Error("Partner access is unavailable for this account.");
  const partner = await ctx.db.get(access.partnerId);
  if (partner === null || partner.status !== "active") {
    throw new Error("Partner access is unavailable for this account.");
  }
  return partner;
}

export const assertPartnerOwner = internalQuery({
  args: { email: v.string(), workosUserId: v.string() },
  returns: v.object({ partnerId: v.id("whiteLabelPartners") }),
  handler: async (ctx, args) => {
    const partner = await getPartnerOwner(ctx, args);
    return { partnerId: partner._id };
  },
});

export const getInvitableOrganization = internalQuery({
  args: { email: v.string(), workosUserId: v.string(), partnerOrganizationId: v.id("whiteLabelPartnerOrganizations") },
  returns: v.object({ workosOrgId: v.string() }),
  handler: async (ctx, args) => {
    const partner = await getPartnerOwner(ctx, args);
    const organization = await ctx.db.get(args.partnerOrganizationId);
    const team = organization ? await ctx.db.get(organization.teamId) : null;
    if (organization === null || organization.partnerId !== partner._id || team?.workosOrgId === undefined) throw new Error("Customer organization not found.");
    return { workosOrgId: team.workosOrgId };
  },
});
