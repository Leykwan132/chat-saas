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
  console.log("[getAuthContext] Starting buildAuthContextFromDb", { activeOrgIdOverride });
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    console.log("[getAuthContext] Identity is null (not authenticated)");
    throw new Error("Not authenticated");
  }
  
  console.log("[getAuthContext] Identity", identity);

  let user = await getUserByWorkosId(ctx, identity.subject);
  if (user === null) {
    console.log("[getAuthContext] User not found in DB for WorkOS ID:", identity.subject);
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

  console.log("[getAuthContext] Found user in DB", {
    userDbId: user._id,
    workosUserId: user.workosUserId,
    email: user.email,
  });

  const overrideOrgId = resolveOrgIdOverride(activeOrgIdOverride);
  let orgId: string;
  let activeTeamId: Id<"teams">;

  if (overrideOrgId !== undefined) {
    const activeTeam = await getActiveTeamForUser(ctx, user);
    orgId = overrideOrgId;
    activeTeamId = activeTeam._id;
    console.log("[getAuthContext] Resolved with overrideOrgId", {
      overrideOrgId,
      activeTeamId,
    });
  } else {
    const activeTeam = await getActiveTeamForUser(ctx, user);
    orgId = teamToOrgId(activeTeam);
    activeTeamId = activeTeam._id;
    console.log("[getAuthContext] Resolved standard active team", {
      orgId,
      activeTeamId,
    });
  }

  const claims = identity as unknown as WorkOSClaims;
  const role = claims.role ?? null;
  const roles = claims.roles ?? (role ? [role] : []);
  const permissions = claims.permissions ?? [];

  console.log("[getAuthContext] WorkOS Claims derived", {
    role,
    roles,
    permissions,
  });

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
  console.log("[getAuthContext] getAuthContext called", {
    isDbCtx: "db" in ctx,
    activeOrgIdOverride,
  });
  if ("db" in ctx) {
    return await buildAuthContextFromDb(ctx, activeOrgIdOverride);
  }

  const { internal } = await import("./_generated/api");
  try {
    const result = await ctx.runQuery(internal.authUtils.resolveAuthScope, {
      activeOrgIdOverride,
    });
    console.log("[getAuthContext] Action resolved auth scope successfully");
    return result;
  } catch (error) {
    if (error instanceof Error && error.message.includes("User not found")) {
      console.log("[getAuthContext] User not found during Action auth resolution. Attempting to auto-upsert user...");
      try {
        await ctx.runMutation(internal.authUtils.autoUpsertUser);
        const retryResult = await ctx.runQuery(internal.authUtils.resolveAuthScope, {
          activeOrgIdOverride,
        });
        console.log("[getAuthContext] Action resolved auth scope successfully after auto-upsert");
        return retryResult;
      } catch (upsertError) {
        console.error("[getAuthContext] Action failed to auto-upsert user:", upsertError);
      }
    }
    console.error("[getAuthContext] Action failed to resolve auth scope via query:", error);
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

/** Channel rows are keyed by org id; personal workspaces use the user id. */
export function resolveChannelOrgId(orgId: string, userId: string): string {
  return !orgId || orgId === "personal" ? userId : orgId;
}
