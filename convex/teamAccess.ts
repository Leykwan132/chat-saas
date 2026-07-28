import { v } from "convex/values";
import { mutation, query, type QueryCtx, type MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { getAuthContext } from "./authUtils";
import { getUserByWorkosId } from "./teamHelpers";
import {
  type TeamFeatureAccess,
  featureAccessFromLegacySlugs,
} from "../shared/teamAccessCatalog";
import {
  type OrgRoleKey,
  type TeamRoleFeatureAccessSettings,
  getFeatureAccessForOrgRole,
} from "../shared/teamRoleCatalog";
import {
  ALL_PERMISSION_SLUGS,
  ROLE_PERMISSIONS,
  resolvePermissionsForRole,
  type PermissionSlug,
} from "../shared/permissions";

const orgRoleKeyValidator = v.union(
  v.literal("owner"),
  v.literal("admin"),
  v.literal("member"),
);

type DbCtx = QueryCtx | MutationCtx;

async function getTeamMembershipForCurrentUser(
  ctx: DbCtx,
  teamId: Id<"teams">,
) {
  const { userId } = await getAuthContext(ctx);
  const userRow = await getUserByWorkosId(ctx, userId);
  if (userRow === null) {
    return null;
  }

  const membership = await ctx.db
    .query("teamMemberships")
    .withIndex("by_userId_and_teamId", (q) =>
      q.eq("userId", userRow._id).eq("teamId", teamId),
    )
    .unique();

  if (membership === null) {
    return null;
  }

  const team = await ctx.db.get(teamId);
  if (team === null || team.deletionStatus === "deleting") {
    return null;
  }

  return { userRow, team, membership };
}

async function isTeamAdmin(
  ctx: DbCtx,
  teamId: Id<"teams">,
) {
  const access = await getTeamMembershipForCurrentUser(ctx, teamId);
  if (access === null || access.team.type !== "organizational") {
    return false;
  }

  return access.membership.role === "owner" || access.membership.role === "admin";
}

async function isTeamOwner(
  ctx: DbCtx,
  teamId: Id<"teams">,
) {
  const access = await getTeamMembershipForCurrentUser(ctx, teamId);
  return access?.membership.role === "owner";
}

function teamRoleAccessSettings(team: {
  ownerFeatureAccess?: Partial<TeamFeatureAccess>;
  adminFeatureAccess?: Partial<TeamFeatureAccess>;
  memberFeatureAccess?: Partial<TeamFeatureAccess>;
  memberAccessSlugs?: string[];
}): TeamRoleFeatureAccessSettings {
  const memberFeatureAccess =
    team.memberFeatureAccess ??
    (team.memberAccessSlugs && team.memberAccessSlugs.length > 0
      ? featureAccessFromLegacySlugs(team.memberAccessSlugs)
      : undefined);

  return {
    ownerFeatureAccess: team.ownerFeatureAccess,
    adminFeatureAccess: team.adminFeatureAccess,
    memberFeatureAccess,
  };
}

export const getMemberAccessForTeam = query({
  args: {
    teamId: v.id("teams"),
  },
  handler: async (ctx, args) => {
    const access = await getTeamMembershipForCurrentUser(ctx, args.teamId);
    if (access === null || access.team.type !== "organizational") {
      return null;
    }

    const settings = teamRoleAccessSettings(access.team);
    return {
      memberFeatureAccess: getFeatureAccessForOrgRole("member", settings),
    };
  },
});

export const getRoleAccessForTeam = query({
  args: {
    teamId: v.id("teams"),
  },
  handler: async (ctx, args) => {
    const access = await getTeamMembershipForCurrentUser(ctx, args.teamId);
    if (access === null || access.team.type !== "organizational") {
      return null;
    }

    const ownerPermissions = access.team.ownerPermissions ?? [...ROLE_PERMISSIONS.owner];
    const adminPermissions = access.team.adminPermissions ?? [...ROLE_PERMISSIONS.admin];
    const memberPermissions = access.team.memberPermissions ?? [...ROLE_PERMISSIONS.member];

    return {
      ownerPermissions,
      adminPermissions,
      memberPermissions,
      canManageAllRoles: access.membership.role === "owner",
    };
  },
});

export const getCurrentUserAccess = query({
  args: {
    teamId: v.optional(v.id("teams")),
  },
  handler: async (ctx, args) => {
    const { userId } = await getAuthContext(ctx);
    const userRow = await getUserByWorkosId(ctx, userId);
    if (userRow === null) {
      return null;
    }

    let teamId = args.teamId;
    if (teamId === undefined) {
      teamId = userRow.activeTeamId;
    }
    if (teamId === undefined) {
      return null;
    }

    const access = await getTeamMembershipForCurrentUser(ctx, teamId);
    if (access === null) {
      return null;
    }

    if (access.team.type === "personal") {
      return {
        role: "owner" as const,
        featureAccess: getFeatureAccessForOrgRole("owner"),
        permissions: ALL_PERMISSION_SLUGS,
      };
    }

    const membershipRole = access.membership.role;
    const roleKey: OrgRoleKey =
      membershipRole === "owner"
        ? "owner"
        : membershipRole === "admin"
          ? "admin"
          : "member";

    const stored: PermissionSlug[] = (
      roleKey === "owner"
        ? (access.team.ownerPermissions ?? [...ROLE_PERMISSIONS.owner])
        : roleKey === "admin"
          ? (access.team.adminPermissions ?? [...ROLE_PERMISSIONS.admin])
          : (access.team.memberPermissions ?? [...ROLE_PERMISSIONS.member])
    ) as PermissionSlug[];

    const permissions = resolvePermissionsForRole(roleKey, stored);

    const settings = teamRoleAccessSettings(access.team);
    return {
      role: roleKey,
      featureAccess: getFeatureAccessForOrgRole(roleKey, settings),
      permissions,
    };
  },
});

export const updateRoleAccessForTeam = mutation({
  args: {
    teamId: v.id("teams"),
    role: orgRoleKeyValidator,
    permissions: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const access = await getTeamMembershipForCurrentUser(ctx, args.teamId);
    if (access === null) {
      throw new Error("Team not found.");
    }
    if (access.team.type !== "organizational") {
      throw new Error("Access settings are only available for shared teams.");
    }

    const owner = await isTeamOwner(ctx, args.teamId);
    const admin = await isTeamAdmin(ctx, args.teamId);
    if (!admin) {
      throw new Error("Only team admins can update role access.");
    }
    if (args.role !== "member" && !owner) {
      throw new Error("Only team owners can update owner or admin access.");
    }

    const activeTeamId = access.userRow.activeTeamId;
    if (activeTeamId !== args.teamId) {
      throw new Error("Switch to this team to update role access.");
    }

    const patchKey =
      args.role === "owner"
        ? "ownerPermissions"
        : args.role === "admin"
          ? "adminPermissions"
          : "memberPermissions";

    const previousPermissions = access.team[patchKey] ?? [...ROLE_PERMISSIONS[args.role]];

    await ctx.db.patch(args.teamId, {
      [patchKey]: args.permissions,
      updatedAt: Date.now(),
    });

    if (access.team.workosOrgId) {
      await ctx.scheduler.runAfter(0, internal.orgRoles.syncOrganizationRolePermissionsAction, {
        workosOrgId: access.team.workosOrgId,
        roleKey: args.role,
        previousPermissions,
        newPermissions: args.permissions,
      });
    }

    return { role: args.role, permissions: args.permissions };
  },
});
