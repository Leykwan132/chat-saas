import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { VerifiedMcpPrincipal } from "../../shared/integrations/contracts";
import {
  Permission,
  ROLE_PERMISSIONS,
  resolvePermissionsForRole,
  type PermissionSlug,
} from "../../shared/permissions";
import { ConvexError } from "convex/values";

export async function resolveMemberAccess(
  ctx: QueryCtx | MutationCtx,
  principal: VerifiedMcpPrincipal,
) {
  if (!principal.orgId || principal.orgId === "personal")
    throw new ConvexError("WORKSPACE_UNAVAILABLE");
  const user = await ctx.db
    .query("users")
    .withIndex("by_workosUserId", (q) =>
      q.eq("workosUserId", principal.subject),
    )
    .unique();
  const team = await ctx.db
    .query("teams")
    .withIndex("by_workosOrgId", (q) => q.eq("workosOrgId", principal.orgId))
    .unique();
  if (
    !user ||
    !team ||
    team.type !== "organizational" ||
    team.deletionStatus === "deleting"
  )
    throw new ConvexError("WORKSPACE_UNAVAILABLE");
  const partner = await ctx.db
    .query("whiteLabelPartnerOrganizations")
    .withIndex("by_teamId", (q) => q.eq("teamId", team._id))
    .first();
  if (partner) throw new ConvexError("PARTNER_WORKSPACE_UNSUPPORTED");
  const membership = await ctx.db
    .query("teamMemberships")
    .withIndex("by_userId_and_teamId", (q) =>
      q.eq("userId", user._id).eq("teamId", team._id),
    )
    .unique();
  if (!membership) throw new ConvexError("WORKSPACE_UNAVAILABLE");
  const role = membership.role;
  const configured =
    role === "owner"
      ? team.ownerPermissions
      : role === "admin"
        ? team.adminPermissions
        : team.memberPermissions;
  const permissions = resolvePermissionsForRole(
    role,
    (configured ?? ROLE_PERMISSIONS[role]) as PermissionSlug[],
  );
  if (!permissions.includes(Permission.CHATS_READ))
    throw new ConvexError("PERMISSION_DENIED");
  return { user, team };
}

export async function resolveIntegrationAccess(
  ctx: QueryCtx,
  principal: VerifiedMcpPrincipal,
) {
  const access = await resolveMemberAccess(ctx, principal);
  const grant = await ctx.db
    .query("integrationConnections")
    .withIndex("by_issuer_and_consentId", (q) =>
      q.eq("issuer", principal.issuer).eq("consentId", principal.consentId),
    )
    .unique();
  if (
    !grant ||
    grant.status !== "active" ||
    grant.subject !== principal.subject ||
    grant.orgId !== principal.orgId ||
    grant.clientId !== principal.clientId
  )
    throw new ConvexError("CONNECTION_APPROVAL_REQUIRED");
  return { ...access, grant };
}
