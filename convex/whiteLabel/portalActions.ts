"use node";

import { v } from "convex/values";
import { action, internalMutation, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import { getAuthContext } from "../authUtils";
import { ensureOrganizationalTeam, ensureTeamMembership, getUserByWorkosId } from "../teamHelpers";
import { provisionOrganizationRoles } from "../orgRoles";
import { workosRequest, type WorkOSOrganization } from "../workosClient";
import { WORKOS_OWNER_ROLE_SLUG, WORKOS_ADMIN_ROLE_SLUG, WORKOS_MEMBER_ROLE_SLUG } from "../../shared/teamRoleCatalog";

const planKeyValidator = v.union(v.literal("free"), v.literal("starter"), v.literal("growth"), v.literal("business"));
const roleValidator = v.union(v.literal("owner"), v.literal("admin"), v.literal("member"));

function validateOrganizationName(name: string) {
  const value = name.trim();
  if (!value || value.length > 80) throw new Error("Organization name must be between 1 and 80 characters.");
  return value;
}

export const persistCreatedOrganization = internalMutation({
  args: { partnerId: v.id("whiteLabelPartners"), workosUserId: v.string(), workosOrgId: v.string(), name: v.string(), planKey: planKeyValidator },
  handler: async (ctx, args) => {
    const [partner, user] = await Promise.all([ctx.db.get(args.partnerId), getUserByWorkosId(ctx, args.workosUserId)]);
    if (partner === null || user === null) throw new Error("Partner owner not found.");
    const teamId = await ensureOrganizationalTeam(ctx, { workosOrgId: args.workosOrgId, name: args.name, ownerUserId: user._id });
    await ensureTeamMembership(ctx, { teamId, userId: user._id, role: "owner" });
    const now = Date.now();
    const partnerOrganizationId = await ctx.db.insert("whiteLabelPartnerOrganizations", { partnerId: partner._id, teamId, status: "active", createdByUserId: user._id, createdAt: now, updatedAt: now });
    await ctx.db.insert("whiteLabelPartnerOrganizationPlans", { partnerOrganizationId, activePlanKey: args.planKey, creditPlanKey: args.planKey, updatedByUserId: user._id, createdAt: now, updatedAt: now });
    await ctx.db.insert("whiteLabelPartnerOrganizationPlanAssignments", { partnerOrganizationId, planKey: args.planKey, appliesAt: now, assignedByUserId: user._id, createdAt: now });
    return { partnerOrganizationId, teamId, ownerId: user._id };
  },
});

export const initializeFirstCreditPeriod = internalMutation({
  args: { partnerOrganizationId: v.id("whiteLabelPartnerOrganizations"), actorUserId: v.id("users"), planKey: planKeyValidator, periodStart: v.number(), periodEnd: v.number() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const monthlyCredits = { free: 300, starter: 2000, growth: 6000, business: 18000 }[args.planKey];
    await ctx.db.insert("whiteLabelPartnerOrganizationCreditPeriods", { partnerOrganizationId: args.partnerOrganizationId, planKey: args.planKey, periodStart: args.periodStart, periodEnd: args.periodEnd, grantedCredits: monthlyCredits, usedCredits: 0, createdAt: now, updatedAt: now });
    await ctx.db.insert("whiteLabelPartnerOrganizationCreditLedger", { partnerOrganizationId: args.partnerOrganizationId, event: "monthly_allowance", credits: monthlyCredits, actorUserId: args.actorUserId, createdAt: now });
  },
});

export const createOrganization = action({
  args: { name: v.string(), planKey: planKeyValidator },
  handler: async (ctx, args) => {
    const auth = await getAuthContext(ctx);
    const access = await ctx.runQuery(internal.whiteLabel.portalActions.assertPartnerOwner, { workosUserId: auth.userId, controlTeamId: auth.activeTeamId });
    const name = validateOrganizationName(args.name);
    const organization = await workosRequest<WorkOSOrganization>("/organizations", { method: "POST", body: JSON.stringify({ name }) });
    await provisionOrganizationRoles(organization.id);
    await workosRequest("/user_management/organization_memberships", { method: "POST", body: JSON.stringify({ user_id: auth.userId, organization_id: organization.id, role_slug: WORKOS_OWNER_ROLE_SLUG }) });
    const created = await ctx.runMutation(internal.whiteLabel.portalActions.persistCreatedOrganization, { partnerId: access.partnerId, workosUserId: auth.userId, workosOrgId: organization.id, name: organization.name ?? name, planKey: args.planKey });
    const start = Date.now();
    await ctx.runMutation(internal.whiteLabel.portalActions.initializeFirstCreditPeriod, { partnerOrganizationId: created.partnerOrganizationId, actorUserId: created.ownerId, planKey: args.planKey, periodStart: start, periodEnd: start + 30 * 24 * 60 * 60 * 1000 });
    return { partnerOrganizationId: created.partnerOrganizationId, teamId: created.teamId };
  },
});

export const assertPartnerOwner = internalQuery({
  args: { workosUserId: v.string(), controlTeamId: v.id("teams") },
  handler: async (ctx, args) => {
    const access = await ctx.db.query("whiteLabelPartnerAccess").withIndex("by_workosUserId", (q) => q.eq("workosUserId", args.workosUserId)).filter((q) => q.eq(q.field("status"), "active")).first();
    if (access === null) throw new Error("Partner access is unavailable for this workspace.");
    const partner = await ctx.db.get(access.partnerId);
    if (partner === null || partner.status !== "active" || partner.controlTeamId !== args.controlTeamId) throw new Error("Partner access is unavailable for this workspace.");
    return { partnerId: partner._id };
  },
});

export const inviteOrganizationAccount = action({
  args: { partnerOrganizationId: v.id("whiteLabelPartnerOrganizations"), email: v.string(), role: roleValidator },
  handler: async (ctx, args) => {
    const auth = await getAuthContext(ctx);
    const organization = await ctx.runQuery(internal.whiteLabel.portalActions.getInvitableOrganization, { workosUserId: auth.userId, controlTeamId: auth.activeTeamId, partnerOrganizationId: args.partnerOrganizationId });
    const roleSlug = args.role === "owner" ? WORKOS_OWNER_ROLE_SLUG : args.role === "admin" ? WORKOS_ADMIN_ROLE_SLUG : WORKOS_MEMBER_ROLE_SLUG;
    return await workosRequest("/user_management/invitations", { method: "POST", body: JSON.stringify({ email: args.email.trim().toLowerCase(), organization_id: organization.workosOrgId, role_slug: roleSlug }) });
  },
});

export const getInvitableOrganization = internalQuery({
  args: { workosUserId: v.string(), controlTeamId: v.id("teams"), partnerOrganizationId: v.id("whiteLabelPartnerOrganizations") },
  handler: async (ctx, args) => {
    const access = await ctx.db.query("whiteLabelPartnerAccess").withIndex("by_workosUserId", (q) => q.eq("workosUserId", args.workosUserId)).filter((q) => q.eq(q.field("status"), "active")).first();
    const partner = access ? await ctx.db.get(access.partnerId) : null;
    const organization = await ctx.db.get(args.partnerOrganizationId);
    const team = organization ? await ctx.db.get(organization.teamId) : null;
    if (partner === null || partner.controlTeamId !== args.controlTeamId || organization === null || organization.partnerId !== partner._id || team?.workosOrgId === undefined) throw new Error("Customer organization not found.");
    return { workosOrgId: team.workosOrgId };
  },
});
