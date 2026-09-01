import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import type { PlanKey } from "../planCatalog";
import { getPartnerOrganizationForManagedTeam } from "./managedTeams";

type DbCtx = QueryCtx | MutationCtx;

export async function getWhiteLabelPlanForTeam(
  ctx: DbCtx,
  teamId: Id<"teams">,
): Promise<PlanKey | null> {
  const partnerOrganization = await getPartnerOrganizationForManagedTeam(ctx, teamId);
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
  return (await getPartnerOrganizationForManagedTeam(ctx, teamId)) !== null;
}

export async function getWhiteLabelPartnerOrganizationForTeam(
  ctx: DbCtx,
  teamId: Id<"teams">,
) {
  return await getPartnerOrganizationForManagedTeam(ctx, teamId);
}
