import { v } from "convex/values";
import { action, type ActionCtx } from "./_generated/server";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { isAppOrgRoleSlug } from "../shared/teamRoleCatalog";
import {
  type WorkOSPermission,
  type WorkOSPermissionList,
  type WorkOSRole,
  type WorkOSRoleList,
  workosRequest,
} from "./workosClient";

export type TeamRoleItem = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  permissions: string[];
  type: WorkOSRole["type"];
  isCustom: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TeamPermissionItem = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  system: boolean;
  createdAt: string;
  updatedAt: string;
};

function mapRole(role: WorkOSRole): TeamRoleItem {
  return {
    id: role.id,
    slug: role.slug,
    name: role.name,
    description: role.description,
    permissions: role.permissions,
    type: role.type,
    isCustom: role.type === "OrganizationRole",
    createdAt: role.created_at,
    updatedAt: role.updated_at,
  };
}

function mapPermission(permission: WorkOSPermission): TeamPermissionItem {
  return {
    id: permission.id,
    slug: permission.slug,
    name: permission.name,
    description: permission.description,
    system: permission.system,
    createdAt: permission.created_at,
    updatedAt: permission.updated_at,
  };
}

async function resolveTeamOrgIdForRead(ctx: ActionCtx, teamId: Id<"teams">) {
  const team = await ctx.runQuery(api.teams.getTeamDetail, { teamId });
  if (team === null) {
    throw new Error("Team not found.");
  }
  if (team.type !== "organizational" || !team.workosOrgId) {
    throw new Error("Roles and permissions are only available for shared teams.");
  }
  return team.workosOrgId;
}

async function resolveManagedTeamOrgId(ctx: ActionCtx, teamId: Id<"teams">) {
  const access = await assertCanManageTeamAccess(ctx, teamId);
  return access.workosOrgId;
}

async function assertCanManageTeamAccess(ctx: ActionCtx, teamId: Id<"teams">) {
  const team = await ctx.runQuery(api.teams.getTeamDetail, { teamId });
  if (team === null) {
    throw new Error("Team not found.");
  }
  if (team.type !== "organizational") {
    throw new Error("Roles and permissions are only available for shared teams.");
  }
  if (!team.isAdmin) {
    throw new Error("Only team admins can manage roles and permissions.");
  }
  if (!team.workosOrgId) {
    throw new Error("This team is not linked to a WorkOS organization.");
  }

  return { team, workosOrgId: team.workosOrgId };
}

async function listAllPermissions(): Promise<WorkOSPermission[]> {
  const permissions: WorkOSPermission[] = [];
  let after: string | undefined;

  do {
    const params = new URLSearchParams({ limit: "100" });
    if (after) {
      params.set("after", after);
    }

    const page = await workosRequest<WorkOSPermissionList>(
      `/authorization/permissions?${params.toString()}`,
    );
    permissions.push(...page.data);
    after = page.list_metadata?.after ?? undefined;
  } while (after);

  return permissions;
}

function normalizeCustomRoleSlug(rawSlug: string) {
  const slug = rawSlug
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "");

  if (!slug) {
    throw new Error("Enter a role slug.");
  }

  return slug.startsWith("org-") ? slug : `org-${slug}`;
}

export const listRolesForTeam = action({
  args: {
    teamId: v.id("teams"),
  },
  handler: async (ctx, args): Promise<TeamRoleItem[]> => {
    const workosOrgId = await resolveTeamOrgIdForRead(ctx, args.teamId);
    const result = await workosRequest<WorkOSRoleList>(
      `/authorization/organizations/${workosOrgId}/roles`,
    );

    return result.data
      .map(mapRole)
      .filter((role) => isAppOrgRoleSlug(role.slug));
  },
});

export const createRoleForTeam = action({
  args: {
    teamId: v.id("teams"),
    slug: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<TeamRoleItem> => {
    const workosOrgId = await resolveManagedTeamOrgId(ctx, args.teamId);
    const name = args.name.trim();
    if (!name) {
      throw new Error("Enter a role name.");
    }

    const slug = normalizeCustomRoleSlug(args.slug);
    const role = await workosRequest<WorkOSRole>(
      `/authorization/organizations/${workosOrgId}/roles`,
      {
        method: "POST",
        body: JSON.stringify({
          slug,
          name,
          description: args.description?.trim() || undefined,
        }),
      },
    );

    return mapRole(role);
  },
});

export const updateRoleForTeam = action({
  args: {
    teamId: v.id("teams"),
    slug: v.string(),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<TeamRoleItem> => {
    const workosOrgId = await resolveManagedTeamOrgId(ctx, args.teamId);
    const body: Record<string, string> = {};
    if (args.name !== undefined) {
      const name = args.name.trim();
      if (!name) {
        throw new Error("Enter a role name.");
      }
      body.name = name;
    }
    if (args.description !== undefined) {
      body.description = args.description.trim();
    }
    if (Object.keys(body).length === 0) {
      throw new Error("Nothing to update.");
    }

    const role = await workosRequest<WorkOSRole>(
      `/authorization/organizations/${workosOrgId}/roles/${args.slug}`,
      {
        method: "PATCH",
        body: JSON.stringify(body),
      },
    );

    return mapRole(role);
  },
});

export const deleteRoleForTeam = action({
  args: {
    teamId: v.id("teams"),
    slug: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: true }> => {
    const workosOrgId = await resolveManagedTeamOrgId(ctx, args.teamId);
    await workosRequest<void>(
      `/authorization/organizations/${workosOrgId}/roles/${args.slug}`,
      { method: "DELETE" },
    );
    return { success: true };
  },
});

export const listPermissions = action({
  args: {
    teamId: v.id("teams"),
  },
  handler: async (ctx, args): Promise<TeamPermissionItem[]> => {
    await resolveTeamOrgIdForRead(ctx, args.teamId);
    const permissions = await listAllPermissions();
    return permissions
      .map(mapPermission)
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const createPermission = action({
  args: {
    teamId: v.id("teams"),
    slug: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<TeamPermissionItem> => {
    await resolveManagedTeamOrgId(ctx, args.teamId);

    const slug = args.slug.trim().toLowerCase();
    const name = args.name.trim();
    if (!slug) {
      throw new Error("Enter a permission slug.");
    }
    if (!name) {
      throw new Error("Enter a permission name.");
    }

    const permission = await workosRequest<WorkOSPermission>(
      "/authorization/permissions",
      {
        method: "POST",
        body: JSON.stringify({
          slug,
          name,
          description: args.description?.trim() || undefined,
        }),
      },
    );

    return mapPermission(permission);
  },
});

export const setRolePermissions = action({
  args: {
    teamId: v.id("teams"),
    roleSlug: v.string(),
    permissions: v.array(v.string()),
  },
  handler: async (ctx, args): Promise<TeamRoleItem> => {
    const workosOrgId = await resolveManagedTeamOrgId(ctx, args.teamId);
    const role = await workosRequest<WorkOSRole>(
      `/authorization/organizations/${workosOrgId}/roles/${args.roleSlug}/permissions`,
      {
        method: "PUT",
        body: JSON.stringify({
          permissions: args.permissions,
        }),
      },
    );

    return mapRole(role);
  },
});
