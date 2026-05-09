import type { QueryCtx, MutationCtx, ActionCtx } from "./_generated/server";

const PERSONAL_ORG_ID = "";

// WorkOS AuthKit access tokens carry org_id, role, roles, and permissions
// claims. The Convex identity object keeps the standard subject/email fields
// and surfaces additional claims under their JWT names. We read defensively to
// stay resilient if a claim is missing (e.g. a user signed in without an
// active organization).
type WorkOSClaims = {
  org_id?: string | null;
  role?: string | null;
  roles?: string[] | null;
  permissions?: string[] | null;
};

export async function getAuthContext(
  ctx: QueryCtx | MutationCtx | ActionCtx,
  activeOrgId?: string | null,
) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    throw new Error("Not authenticated");
  }

  const claims = identity as unknown as WorkOSClaims;
  const tokenOrgId = claims.org_id ?? null;
  const role = claims.role ?? null;
  const roles = claims.roles ?? (role ? [role] : []);
  const permissions = claims.permissions ?? [];

  return {
    userId: identity.subject,
    orgId: activeOrgId ?? tokenOrgId ?? PERSONAL_ORG_ID,
    role,
    roles,
    permissions,
    identity,
  };
}

export const PERSONAL_ORG_FALLBACK = PERSONAL_ORG_ID;
