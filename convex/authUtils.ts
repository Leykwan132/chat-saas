import {
  internalQuery,
  type ActionCtx,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import {
  getActiveTeamForUser,
  getUserByWorkosId,
  PERSONAL_ORG_ID,
  teamToOrgId,
} from "./teamHelpers";

export const PERSONAL_ORG_FALLBACK = PERSONAL_ORG_ID;

type WorkOSClaims = {
  org_id?: string | null;
  role?: string | null;
  roles?: string[] | null;
  permissions?: string[] | null;
};

export type AuthContext = {
  userId: string;
  userDbId: Id<"users">;
  activeTeamId: Id<"teams">;
  orgId: string;
  role: string | null;
  roles: string[];
  permissions: string[];
  identity: NonNullable<Awaited<ReturnType<QueryCtx["auth"]["getUserIdentity"]>>>;
};

type DbCtx = QueryCtx | MutationCtx;

function resolveOrgIdOverride(activeOrgId?: string | null): string | undefined {
  if (activeOrgId === undefined) {
    return undefined;
  }
  if (!activeOrgId || activeOrgId === "personal") {
    return PERSONAL_ORG_ID;
  }
  return activeOrgId;
}

async function buildAuthContextFromDb(
  ctx: DbCtx,
  activeOrgIdOverride?: string | null,
): Promise<AuthContext> {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    throw new Error("Not authenticated");
  }

  const user = await getUserByWorkosId(ctx, identity.subject);
  if (user === null) {
    throw new Error("User not found");
  }

  const overrideOrgId = resolveOrgIdOverride(activeOrgIdOverride);
  let orgId: string;
  let activeTeamId: Id<"teams">;

  if (overrideOrgId !== undefined) {
    const activeTeam = await getActiveTeamForUser(ctx, user);
    orgId = overrideOrgId;
    activeTeamId = activeTeam._id;
  } else {
    const activeTeam = await getActiveTeamForUser(ctx, user);
    orgId = teamToOrgId(activeTeam);
    activeTeamId = activeTeam._id;
  }

  const claims = identity as unknown as WorkOSClaims;
  const role = claims.role ?? null;
  const roles = claims.roles ?? (role ? [role] : []);
  const permissions = claims.permissions ?? [];

  return {
    userId: identity.subject,
    userDbId: user._id,
    activeTeamId,
    orgId,
    role,
    roles,
    permissions,
    identity,
  };
}

export const resolveAuthScope = internalQuery({
  args: {
    activeOrgIdOverride: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    return await buildAuthContextFromDb(ctx, args.activeOrgIdOverride);
  },
});

export async function getAuthContext(
  ctx: DbCtx | ActionCtx,
  activeOrgIdOverride?: string | null,
): Promise<AuthContext> {
  if ("db" in ctx) {
    return await buildAuthContextFromDb(ctx, activeOrgIdOverride);
  }

  const { internal } = await import("./_generated/api");
  return await ctx.runQuery(internal.authUtils.resolveAuthScope, {
    activeOrgIdOverride,
  });
}

/** Channel rows are keyed by org id; personal workspaces use the user id. */
export function resolveChannelOrgId(orgId: string, userId: string): string {
  return !orgId || orgId === "personal" ? userId : orgId;
}
