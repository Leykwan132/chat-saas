import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { ensureOrganizationalTeam, ensureTeamMembership, getUserByWorkosId } from "../teamHelpers";
import { parsePartnerLimit } from "../../shared/partnerEntitlementLimits";
import { parsePartnerAgentModel } from "./partnerAgentModel";
import { createPartnerCreditPeriod } from "./creditLedger";

const planKeyValidator = v.union(v.literal("free"), v.literal("starter"), v.literal("growth"), v.literal("business"));

export const persistCreatedOrganization = internalMutation({
  args: {
    partnerId: v.id("whiteLabelPartners"),
    workosUserId: v.string(),
    workosOrgId: v.string(),
    name: v.string(),
    planKey: planKeyValidator,
    maxAgents: v.number(),
    monthlyCredits: v.number(),
    modelId: v.string(),
  },
  returns: v.object({ partnerOrganizationId: v.id("whiteLabelPartnerOrganizations"), teamId: v.id("teams") }),
  handler: async (ctx, args) => {
    const [partner, user] = await Promise.all([ctx.db.get(args.partnerId), getUserByWorkosId(ctx, args.workosUserId)]);
    if (partner === null || user === null) throw new Error("Partner owner not found.");
    const maxAgents = parsePartnerLimit(args.maxAgents, "Agents");
    const monthlyCredits = parsePartnerLimit(args.monthlyCredits, "Monthly credits");
    const modelId = parsePartnerAgentModel(args.modelId);
    const teamId = await ensureOrganizationalTeam(ctx, { workosOrgId: args.workosOrgId, name: args.name, ownerUserId: user._id });
    await ensureTeamMembership(ctx, { teamId, userId: user._id, role: "owner" });
    const now = Date.now();
    const partnerOrganizationId = await ctx.db.insert("whiteLabelPartnerOrganizations", { partnerId: partner._id, teamId, status: "active", createdByUserId: user._id, createdAt: now, updatedAt: now });
    await ctx.db.insert("whiteLabelPartnerOrganizationPlans", {
      partnerOrganizationId,
      activePlanKey: args.planKey,
      creditPlanKey: args.planKey,
      maxAgents,
      monthlyCredits,
      modelId,
      updatedByUserId: user._id,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("whiteLabelPartnerOrganizationPlanAssignments", { partnerOrganizationId, planKey: args.planKey, appliesAt: now, assignedByUserId: user._id, createdAt: now });
    await createPartnerCreditPeriod(ctx, { partnerOrganizationId, planKey: args.planKey, periodStart: now, periodEnd: now + 30 * 24 * 60 * 60 * 1000, actorUserId: user._id });
    return { partnerOrganizationId, teamId };
  },
});
