import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { getAuthContext, PERSONAL_ORG_FALLBACK } from "../authUtils";
import { getUserByWorkosId } from "../teamHelpers";
import {
  ALL_PERMISSION_SLUGS,
  Permission,
  ROLE_PERMISSIONS,
  resolvePermissionsForRole,
  type PermissionSlug,
} from "../../shared/permissions";

type DbCtx = QueryCtx | MutationCtx;

export async function getOwnedAgent(ctx: DbCtx, agentId: Id<"agents">) {
  const { userId, orgId } = await getAuthContext(ctx);
  const agent = await ctx.db.get(agentId);
  if (agent === null) return null;

  const normalizedOrgId =
    !orgId || orgId === "personal" ? PERSONAL_ORG_FALLBACK : orgId;
  const agentOrgId =
    !agent.orgId || agent.orgId === "personal" ? PERSONAL_ORG_FALLBACK : agent.orgId;

  if (agentOrgId !== PERSONAL_ORG_FALLBACK) {
    return agentOrgId === normalizedOrgId ? agent : null;
  }
  return agent.userId === userId ? agent : null;
}

async function permissionsForCurrentUser(ctx: DbCtx): Promise<PermissionSlug[]> {
  const { userId } = await getAuthContext(ctx);
  const userRow = await getUserByWorkosId(ctx, userId);
  if (userRow === null || userRow.activeTeamId === undefined) {
    return [];
  }

  const team = await ctx.db.get(userRow.activeTeamId);
  if (team === null) return [];

  if (team.type === "personal") {
    return [...ALL_PERMISSION_SLUGS];
  }

  const membership = await ctx.db
    .query("teamMemberships")
    .withIndex("by_userId_and_teamId", (q) =>
      q.eq("userId", userRow._id).eq("teamId", team._id),
    )
    .unique();
  if (membership === null) return [];

  const roleKey =
    membership.role === "owner"
      ? "owner"
      : membership.role === "admin"
        ? "admin"
        : "member";

  const stored: PermissionSlug[] =
    roleKey === "owner"
      ? ((team.ownerPermissions ?? [...ROLE_PERMISSIONS.owner]) as PermissionSlug[])
      : roleKey === "admin"
        ? ((team.adminPermissions ?? [...ROLE_PERMISSIONS.admin]) as PermissionSlug[])
        : ((team.memberPermissions ?? [...ROLE_PERMISSIONS.member]) as PermissionSlug[]);

  return resolvePermissionsForRole(roleKey, stored);
}

export async function assertAvailabilityRead(ctx: DbCtx, agentId: Id<"agents">) {
  const agent = await getOwnedAgent(ctx, agentId);
  if (agent === null) {
    throw new Error("Agent not found");
  }
  const permissions = await permissionsForCurrentUser(ctx);
  if (!permissions.includes(Permission.AVAILABILITY_READ)) {
    throw new Error("Forbidden");
  }
  return agent;
}

export async function assertRoutingRead(ctx: DbCtx, agentId: Id<"agents">) {
  const agent = await getOwnedAgent(ctx, agentId);
  if (agent === null) {
    throw new Error("Agent not found");
  }
  const permissions = await permissionsForCurrentUser(ctx);
  if (!permissions.includes(Permission.ROUTING_READ)) {
    throw new Error("Forbidden");
  }
  return agent;
}

export async function assertRoutingManage(ctx: DbCtx, agentId: Id<"agents">) {
  const agent = await getOwnedAgent(ctx, agentId);
  if (agent === null) {
    throw new Error("Agent not found");
  }
  const permissions = await permissionsForCurrentUser(ctx);
  if (!permissions.includes(Permission.ROUTING_MANAGE)) {
    throw new Error("Forbidden");
  }
  return agent;
}

export async function getOrCreateLeadAssignmentSettings(
  ctx: MutationCtx,
  agentId: Id<"agents">,
) {
  const existing = await ctx.db
    .query("leadAssignmentSettings")
    .withIndex("by_agentId", (q) => q.eq("agentId", agentId))
    .unique();
  if (existing !== null) return existing;

  const now = Date.now();
  const id = await ctx.db.insert("leadAssignmentSettings", {
    agentId,
    method: "round_robin",
    aiEnabledOnInbound: true,
    aiWhenOutsideSchedule: false,
    tagRules: [],
    updatedAt: now,
  });
  const row = await ctx.db.get(id);
  if (row === null) {
    throw new Error("Failed to create lead assignment settings");
  }
  return row;
}
