import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { PLAN_CATALOG, type PlanKey } from "../planCatalog";
import { getEntitlementScope } from "../entitlementScope";
import { resolvePartnerMaxAgents } from "../../shared/partnerEntitlementLimits";

export async function getAssignedPartnerAgentModel(
  ctx: DbCtx,
  session: { isPartnerManaged: boolean },
) {
  if (!session.isPartnerManaged) return null;
  const scope = await getEntitlementScope(ctx);
  if (scope.kind !== "partner") return null;
  const record = await getWhiteLabelPlanRecord(ctx, scope.organization._id);
  return record?.modelId ?? null;
}

type DbCtx = QueryCtx | MutationCtx;

export async function getWhiteLabelPlanRecord(
  ctx: DbCtx,
  partnerOrganizationId: Id<"whiteLabelPartnerOrganizations">,
) {
  return await ctx.db
    .query("whiteLabelPartnerOrganizationPlans")
    .withIndex("by_partnerOrganizationId", (q) =>
      q.eq("partnerOrganizationId", partnerOrganizationId),
    )
    .unique();
}

export async function getMaxAgentsForSession(
  ctx: DbCtx,
  session: { plan: PlanKey; isPartnerManaged: boolean },
) {
  if (!session.isPartnerManaged) return PLAN_CATALOG[session.plan].maxAgents;
  const scope = await getEntitlementScope(ctx);
  if (scope.kind !== "partner") return PLAN_CATALOG[session.plan].maxAgents;
  const record = await getWhiteLabelPlanRecord(ctx, scope.organization._id);
  return resolvePartnerMaxAgents(session.plan, record?.maxAgents);
}

export async function getWhiteLabelPlanForTeam(
  ctx: DbCtx,
  teamId: Id<"teams">,
): Promise<PlanKey | null> {
  const partnerOrganization = await ctx.db
    .query("whiteLabelPartnerOrganizations")
    .withIndex("by_teamId", (q) => q.eq("teamId", teamId))
    .unique();
  if (partnerOrganization === null) return null;
  return await getWhiteLabelPlanForOrganization(ctx, partnerOrganization._id);
}

export async function getWhiteLabelPlanForOrganization(
  ctx: DbCtx,
  partnerOrganizationId: Id<"whiteLabelPartnerOrganizations">,
): Promise<PlanKey | null> {
  const partnerOrganization = await ctx.db.get(partnerOrganizationId);
  if (partnerOrganization === null || partnerOrganization.status !== "active") return null;
  const plan = await getWhiteLabelPlanRecord(ctx, partnerOrganizationId);
  return plan?.activePlanKey ?? null;
}

export async function isWhiteLabelTeam(
  ctx: DbCtx,
  teamId: Id<"teams">,
) {
  return (await ctx.db.query("whiteLabelPartnerOrganizations").withIndex("by_teamId", (q) => q.eq("teamId", teamId)).unique()) !== null;
}

export async function getWhiteLabelPartnerOrganizationForTeam(
  ctx: DbCtx,
  teamId: Id<"teams">,
) {
  return await ctx.db.query("whiteLabelPartnerOrganizations").withIndex("by_teamId", (q) => q.eq("teamId", teamId)).unique();
}
