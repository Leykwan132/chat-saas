import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { ensureOrganizationalTeam, ensureTeamMembership, getUserByWorkosId } from "../teamHelpers";

const planKeyValidator = v.union(v.literal("free"), v.literal("starter"), v.literal("growth"), v.literal("business"));

export const persistCreatedOrganization = internalMutation({
  args: { partnerId: v.id("whiteLabelPartners"), workosUserId: v.string(), workosOrgId: v.string(), name: v.string(), planKey: planKeyValidator },
  returns: v.object({ partnerOrganizationId: v.id("whiteLabelPartnerOrganizations"), teamId: v.id("teams"), ownerId: v.id("users") }),
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
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const monthlyCredits = { free: 300, starter: 2000, growth: 6000, business: 18000 }[args.planKey];
    await ctx.db.insert("whiteLabelPartnerOrganizationCreditPeriods", { partnerOrganizationId: args.partnerOrganizationId, planKey: args.planKey, periodStart: args.periodStart, periodEnd: args.periodEnd, grantedCredits: monthlyCredits, usedCredits: 0, createdAt: now, updatedAt: now });
    await ctx.db.insert("whiteLabelPartnerOrganizationCreditLedger", { partnerOrganizationId: args.partnerOrganizationId, event: "monthly_allowance", credits: monthlyCredits, actorUserId: args.actorUserId, createdAt: now });
    return null;
  },
});
