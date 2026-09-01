import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type DatabaseCtx = QueryCtx | MutationCtx;

export async function getPartnerOrganizationForManagedTeam(
  ctx: DatabaseCtx,
  teamId: Id<"teams">,
) {
  const rootOrganization = await ctx.db
    .query("whiteLabelPartnerOrganizations")
    .withIndex("by_teamId", (q) => q.eq("teamId", teamId))
    .unique();
  if (rootOrganization !== null) return rootOrganization;

  const managedTeam = await ctx.db
    .query("whiteLabelPartnerManagedTeams")
    .withIndex("by_teamId", (q) => q.eq("teamId", teamId))
    .unique();
  if (managedTeam === null) return null;

  return await ctx.db.get(managedTeam.partnerOrganizationId);
}

export async function assertManagedTeamBelongsToPartner(
  ctx: DatabaseCtx,
  teamId: Id<"teams">,
  partnerOrganizationId: Id<"whiteLabelPartnerOrganizations">,
) {
  const organization = await getPartnerOrganizationForManagedTeam(ctx, teamId);
  if (organization === null || organization._id !== partnerOrganizationId) {
    throw new Error("Partner-managed team is unavailable");
  }
  return organization;
}
