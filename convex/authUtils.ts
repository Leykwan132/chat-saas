import {
  internalMutation,
  internalQuery,
  mutation,
  type ActionCtx,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import {
  ensureUserAccount,
  getActiveTeamForUser,
  getUserByWorkosId,
  PERSONAL_ORG_ID,
  teamToOrgId,
} from "./teamHelpers";
import type { EnsureUserAccountArgs } from "./teamHelpers";
import { canProcessWorkspaceActivity } from "./teamDeletion/access";
import { getAssignedPartnerCustomerWorkspace } from "./whiteLabel/customerWorkspace";

export const PERSONAL_ORG_FALLBACK = PERSONAL_ORG_ID;

/**
 * Extracts all available user fields from a WorkOS JWT identity.
 * WorkOS may provide: givenName, familyName, name, email, pictureUrl.
 * Falls back to splitting `name` into first/last if givenName/familyName are absent.
 */
export function extractIdentityFields(
  identity: NonNullable<Awaited<ReturnType<QueryCtx["auth"]["getUserIdentity"]>>>,
): Omit<EnsureUserAccountArgs, "timeZone"> {
  const nameParts = identity.name?.trim().split(/\s+/);
  return {
    workosUserId: identity.subject,
    email: identity.email ?? undefined,
    firstName: identity.givenName ?? nameParts?.[0] ?? undefined,
    lastName: (identity.familyName ?? nameParts?.slice(1).join(" ")) || undefined,
    profilePictureUrl: identity.pictureUrl ?? undefined,
  };
}

type WorkOSClaims = {
  org_id?: string | null;
  role?: string | null;
  roles?: string[] | null;
  permissions?: string[] | null;
};

export type AuthContext = {
  userId: string;
  userDbId: Id<"users">;
  email: string;
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

  let user = await getUserByWorkosId(ctx, identity.subject);
  if (user === null) {
    if ("insert" in ctx.db) {
      const userId = await ensureUserAccount(ctx as MutationCtx, extractIdentityFields(identity));
      user = await ctx.db.get(userId);
      if (user === null) {
        throw new Error("User not found after auto-upsert");
      }
    } else {
      throw new Error("User not found");
    }
  }

  const overrideOrgId = resolveOrgIdOverride(activeOrgIdOverride);
  let orgId: string;
  let activeTeamId: Id<"teams">;

  if (overrideOrgId !== undefined) {
    const assignedWorkspace = await getAssignedPartnerCustomerWorkspace(
      ctx,
      user.workosUserId,
    );
    if (
      assignedWorkspace !== null &&
      overrideOrgId !== teamToOrgId(assignedWorkspace.team)
    ) {
      throw new Error("Partner customers can only access their assigned workspace");
    }
    if (!(await canProcessWorkspaceActivity(ctx, overrideOrgId))) {
      throw new Error("Workspace unavailable");
    }
    const activeTeam = await getActiveTeamForUser(ctx, user);
    orgId = overrideOrgId;
    activeTeamId = activeTeam._id;
  } else {
    const activeTeam = await getActiveTeamForUser(ctx, user);
    orgId = teamToOrgId(activeTeam);
    activeTeamId = activeTeam._id;
    if (!(await canProcessWorkspaceActivity(ctx, orgId))) {
      throw new Error("Workspace unavailable");
    }
  }

  const claims = identity as unknown as WorkOSClaims;
  const role = claims.role ?? null;
  const roles = claims.roles ?? (role ? [role] : []);
  const permissions = claims.permissions ?? [];

  return {
    userId: identity.subject,
    userDbId: user._id,
    email: user.email.trim().toLowerCase(),
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

export const upsertUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      throw new Error("Not authenticated");
    }
    return await ensureUserAccount(ctx, extractIdentityFields(identity));
  },
});

export const autoUpsertUser = internalMutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      throw new Error("Not authenticated");
    }
    return await ensureUserAccount(ctx, extractIdentityFields(identity));
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
  try {
    const result = await ctx.runQuery(internal.authUtils.resolveAuthScope, {
      activeOrgIdOverride,
    });
    return result;
  } catch (error) {
    if (error instanceof Error && error.message.includes("User not found")) {
      try {
        await ctx.runMutation(internal.authUtils.autoUpsertUser);
        const retryResult = await ctx.runQuery(internal.authUtils.resolveAuthScope, {
          activeOrgIdOverride,
        });
        return retryResult;
      } catch {
        throw error;
      }
    }
    throw error;
  }
}

/**
 * Like getAuthContext but returns null instead of throwing when the user
 * doesn't exist in the DB yet (webhook delay) or is not authenticated.
 * Use this in queries that should gracefully return null during the brief
 * window between authentication and user-row creation.
 */
export async function getAuthContextOrNull(
  ctx: DbCtx | ActionCtx,
  activeOrgIdOverride?: string | null,
): Promise<AuthContext | null> {
  try {
    return await getAuthContext(ctx, activeOrgIdOverride);
  } catch (e) {
    if (
      e instanceof Error &&
      (e.message.includes("User not found") ||
        e.message.includes("Not authenticated"))
    ) {
      return null;
    }
    throw e;
  }
}

/**
 * Channel rows are keyed by org id. Organisational workspaces use their
 * WorkOS org id; personal workspaces have no team/org, so we use the empty
 * string consistently — the same value `teamToOrgId` returns for a personal
 * team. This keeps channels, conversations, customers, etc. aligned on ""
 * for "does not belong to a team".
 */
export function resolveChannelOrgId(orgId: string, _userId: string): string {
  return !orgId || orgId === "personal" ? "" : orgId;
}
