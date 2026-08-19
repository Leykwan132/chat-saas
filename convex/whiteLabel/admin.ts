import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { assertAdminSession } from "../contactAdminAuth";
import { assertValidEmailFormat, normalizeEmailInput } from "../../shared/emailValidation";

export const getOwnerWorkspaces = query({
  args: { sessionToken: v.string(), ownerEmail: v.string() },
  handler: async (ctx, args) => {
    await assertAdminSession(ctx, args.sessionToken);
    const users = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.ownerEmail.trim().toLowerCase()))
      .take(100);
    const membershipGroups = await Promise.all(users.map((user) =>
      ctx.db
        .query("teamMemberships")
        .withIndex("by_userId_and_role", (q) =>
          q.eq("userId", user._id).eq("role", "owner"),
        )
        .take(100),
    ));
    const workspaces = await Promise.all(users.flatMap((user, userIndex) =>
      membershipGroups[userIndex]!.map(async (membership) => {
        const team = await ctx.db.get(membership.teamId);
        return team === null ? null : {
          teamId: team._id,
          name: team.name,
          type: team.type,
          workosUserId: user.workosUserId,
        };
      }),
    ));
    return [...new Map(workspaces.filter((workspace): workspace is NonNullable<typeof workspace> => workspace !== null).map((workspace) => [workspace.teamId, workspace])).values()];
  },
});

export const listPartners = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    await assertAdminSession(ctx, args.sessionToken);
    const partners = await ctx.db.query("whiteLabelPartners").withIndex("by_status", (q) => q.eq("status", "active")).take(100);
    return await Promise.all(partners.map(async (partner) => {
      const [owner, usage, customerOrganizations] = await Promise.all([
        ctx.db.query("whiteLabelPartnerAccess").withIndex("by_partnerId", (q) => q.eq("partnerId", partner._id)).first(),
        ctx.db.query("whiteLabelPartnerUsageTotals").withIndex("by_partnerId", (q) => q.eq("partnerId", partner._id)).unique(),
        ctx.db.query("whiteLabelPartnerOrganizations").withIndex("by_partnerId_and_status", (q) => q.eq("partnerId", partner._id).eq("status", "active")).take(100),
      ]);
      const organizationTeams = await Promise.all(customerOrganizations.map((organization) => ctx.db.get(organization.teamId)));
      const agents = await Promise.all(organizationTeams.filter((organization): organization is NonNullable<typeof organization> => organization !== null).map((organization) => ctx.db.query("agents").withIndex("by_orgId", (q) => q.eq("orgId", organization.workosOrgId ?? "")).take(100)));
      return {
        partnerId: partner._id,
        name: partner.name,
        status: partner.status,
        ownerEmail: owner?.email ?? "Legacy account",
        totalTokens: usage?.totalTokens ?? 0,
        totalCostUsd: usage?.totalCostUsd ?? 0,
        requestCount: usage?.requestCount ?? 0,
        assignedAgentCount: new Set(agents.flat().map((agent) => agent._id)).size,
      };
    }));
  },
});

export const createPartner = mutation({
  args: { sessionToken: v.string(), ownerEmail: v.string() },
  handler: async (ctx, args) => {
    await assertAdminSession(ctx, args.sessionToken);
    const ownerEmail = normalizeEmailInput(assertValidEmailFormat(args.ownerEmail, "Partner owner email"));
    const existing = await ctx.db
      .query("whiteLabelPartnerAccess")
      .withIndex("by_email_and_status", (q) =>
        q.eq("email", ownerEmail).eq("status", "active"),
      )
      .first();
    if (existing !== null) throw new Error("This email already has active partner access.");
    const now = Date.now();
    const partnerId = await ctx.db.insert("whiteLabelPartners", { name: ownerEmail, status: "active", createdAt: now, updatedAt: now });
    await ctx.db.insert("whiteLabelPartnerAccess", { partnerId, email: ownerEmail, role: "owner", status: "active", createdAt: now, updatedAt: now });
    return partnerId;
  },
});
