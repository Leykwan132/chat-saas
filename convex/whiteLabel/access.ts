import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { getAuthContext } from "../authUtils";

type DbCtx = QueryCtx | MutationCtx;

export type PartnerAccessContext = {
  partner: Doc<"whiteLabelPartners">;
  user: Doc<"users">;
  activeTeamId: Doc<"teams">["_id"];
};

export async function getCurrentPartnerAccess(
  ctx: DbCtx,
): Promise<PartnerAccessContext | null> {
  const auth = await getAuthContext(ctx);
  const access = await ctx.db
    .query("whiteLabelPartnerAccess")
    .withIndex("by_workosUserId_and_status", (q) =>
      q.eq("workosUserId", auth.userId).eq("status", "active"),
    )
    .first();
  if (access === null) return null;

  const partner = await ctx.db.get(access.partnerId);
  if (partner === null || partner.status !== "active") return null;
  if (partner.controlTeamId !== auth.activeTeamId) return null;

  const user = await ctx.db.get(auth.userDbId);
  if (user === null) throw new Error("User not found");
  return { partner, user, activeTeamId: auth.activeTeamId };
}

export async function assertCurrentPartnerAccess(
  ctx: DbCtx,
): Promise<PartnerAccessContext> {
  const access = await getCurrentPartnerAccess(ctx);
  if (access === null) {
    throw new Error("Partner access is unavailable for this workspace.");
  }
  return access;
}

export async function assertPartnerOrganizationAccess(
  ctx: DbCtx,
  partnerId: Doc<"whiteLabelPartners">["_id"],
  partnerOrganizationId: Doc<"whiteLabelPartnerOrganizations">["_id"],
) {
  const organization = await ctx.db.get(partnerOrganizationId);
  if (organization === null || organization.partnerId !== partnerId) {
    throw new Error("Customer organization not found.");
  }
  return organization;
}
