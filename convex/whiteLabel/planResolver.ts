import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import type { PlanKey } from "../planCatalog";

type DbCtx = QueryCtx | MutationCtx;

export async function getWhiteLabelPlanForTeam(
  ctx: DbCtx,
  teamId: Id<"teams">,
): Promise<PlanKey | null> {
  const partnerOrganization = await ctx.db
    .query("whiteLabelPartnerOrganizations")
    .withIndex("by_teamId", (q) => q.eq("teamId", teamId))
    .unique();
  if (partnerOrganization === null || partnerOrganization.status !== "active") return null;
  const plan = await ctx.db
    .query("whiteLabelPartnerOrganizationPlans")
    .withIndex("by_partnerOrganizationId", (q) =>
      q.eq("partnerOrganizationId", partnerOrganization._id),
    )
    .unique();
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
