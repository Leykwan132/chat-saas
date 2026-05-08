import type { QueryCtx, MutationCtx, ActionCtx } from "./_generated/server";

const PERSONAL_ORG_ID = "personal";

export async function getAuthContext(
  ctx: QueryCtx | MutationCtx | ActionCtx,
  activeOrgId?: string | null,
) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    throw new Error("Not authenticated");
  }
  const identityOrgId =
    // @ts-ignore
    (identity as Record<string, unknown>).o?.id as string | undefined ?? null;
  return {
    userId: identity.subject,
    orgId: activeOrgId ?? identityOrgId ?? PERSONAL_ORG_ID,
    identity,
  };
}
