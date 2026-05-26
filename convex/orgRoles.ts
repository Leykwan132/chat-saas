"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { WorkOS } from "@workos-inc/node";
import {
  ORG_ROLE_DEFINITIONS,
  workosOrgRoleSlug,
  ROLE_FEATURE_ACCESS_DEFAULTS,
} from "../shared/teamRoleCatalog";
import {
  ALL_PERMISSION_SLUGS,
  PERMISSION_NAMES,
  mapFeatureAccessToPermissions,
} from "../shared/permissions";
import { type WorkOSRole, type WorkOSRoleList, type WorkOSPermission, type WorkOSPermissionList, workosRequest, getWorkOSApiKey } from "./workosClient";

async function listEnvironmentPermissions() {
  const result = await workosRequest<WorkOSPermissionList>(
    "/authorization/permissions?limit=100",
  );
  return result.data;
}

async function createEnvironmentPermission(args: {
  slug: string;
  name: string;
  description?: string;
}) {
  return await workosRequest<WorkOSPermission>("/authorization/permissions", {
    method: "POST",
    body: JSON.stringify(args),
  });
}

async function listOrganizationRoles(workosOrgId: string) {
  const result = await workosRequest<WorkOSRoleList>(
    `/authorization/organizations/${workosOrgId}/roles`,
  );
  return result.data;
}

async function createOrganizationRole(
  workosOrgId: string,
  args: { slug: string; name: string; description: string },
) {
  return await workosRequest<WorkOSRole>(`/authorization/organizations/${workosOrgId}/roles`, {
    method: "POST",
    body: JSON.stringify({
      slug: args.slug,
      name: args.name,
      description: args.description,
    }),
  });
}

async function setOrganizationRolePermissions(
  workosOrgId: string,
  roleSlug: string,
  permissions: string[],
) {
  await workosRequest<WorkOSRole>(
    `/authorization/organizations/${workosOrgId}/roles/${roleSlug}/permissions`,
    {
      method: "PUT",
      body: JSON.stringify({ permissions }),
    },
  );
}

/** Create Owner, Admin, and Member org roles. Safe to call more than once. */
export async function provisionOrganizationRoles(workosOrgId: string) {
  // 1. Ensure all environment permissions exist
  try {
    const envPermissions = await listEnvironmentPermissions();
    const envPermSlugs = new Set(envPermissions.map((p) => p.slug));

    for (const slug of ALL_PERMISSION_SLUGS) {
      if (!envPermSlugs.has(slug)) {
        try {
          await createEnvironmentPermission({
            slug,
            name: PERMISSION_NAMES[slug] || slug,
            description: `Fine-grained permission for ${slug}`,
          });
        } catch (err) {
          console.error(`Failed to create environment permission ${slug}:`, err);
        }
      }
    }
  } catch (err) {
    console.error("Failed to list environment permissions:", err);
  }

  // 2. Provision org roles and assign their permissions
  const existing = await listOrganizationRoles(workosOrgId);
  const existingBySlug = new Map(existing.map((role) => [role.slug, role]));

  for (const definition of ORG_ROLE_DEFINITIONS) {
    const slug = workosOrgRoleSlug(definition.key);
    let role = existingBySlug.get(slug);

    if (role === undefined) {
      role = await createOrganizationRole(workosOrgId, {
        slug,
        name: definition.name,
        description: definition.description,
      });
      existingBySlug.set(role.slug, role);
    }

    // Assign role-specific permissions mapped from feature defaults
    const defaultAccess = ROLE_FEATURE_ACCESS_DEFAULTS[definition.key];
    const permissions = mapFeatureAccessToPermissions(definition.key, defaultAccess);
    await setOrganizationRolePermissions(workosOrgId, role.slug, [...permissions]);
  }
}

export const provisionOrganizationRolesAction = internalAction({
  args: {
    workosOrgId: v.string(),
  },
  handler: async (_ctx, args) => {
    await provisionOrganizationRoles(args.workosOrgId);
  },
});

export const syncOrganizationRolePermissionsAction = internalAction({
  args: {
    workosOrgId: v.string(),
    roleKey: v.union(v.literal("owner"), v.literal("admin"), v.literal("member")),
    previousPermissions: v.array(v.string()),
    newPermissions: v.array(v.string()),
  },
  handler: async (_ctx, args) => {
    const roleSlug = workosOrgRoleSlug(args.roleKey);
    const workos = new WorkOS(getWorkOSApiKey());

    const toAdd = args.newPermissions.filter((p) => !args.previousPermissions.includes(p));
    const toRemove = args.previousPermissions.filter((p) => !args.newPermissions.includes(p));

    // Remove permissions sequentially
    for (const p of toRemove) {
      try {
        await workos.authorization.removeOrganizationRolePermission(
          args.workosOrgId,
          roleSlug,
          { permissionSlug: p },
        );
      } catch (err) {
        console.error(`Failed to remove permission ${p} from role ${roleSlug} in org ${args.workosOrgId}:`, err);
      }
    }

    // Add permissions sequentially
    for (const p of toAdd) {
      try {
        await workos.authorization.addOrganizationRolePermission(
          args.workosOrgId,
          roleSlug,
          { permissionSlug: p },
        );
      } catch (err) {
        console.error(`Failed to add permission ${p} to role ${roleSlug} in org ${args.workosOrgId}:`, err);
      }
    }
  },
});

