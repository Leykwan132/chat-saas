import type { Doc, Id } from "../_generated/dataModel";
import { getAuthContext } from "../authUtils";
import { getOwnedAgent } from "../leadRouting/helpers";
import {
  getActiveTeamForUser,
  getTeamByWorkosOrgId,
  getUserByWorkosId,
} from "../teamHelpers";
import {
  ALL_PERMISSION_SLUGS,
  Permission,
  ROLE_PERMISSIONS,
  resolvePermissionsForRole,
  type PermissionSlug,
} from "../../shared/permissions";
import { AppointmentBookingSessionStatus } from "../appointmentBookingSessionStatus";
import { filterServicesByWorkflowBookingSelection } from "../workflowAppointmentServices";
import type { DbCtx } from "./types";

export async function permissionsForCurrentUser(ctx: DbCtx): Promise<PermissionSlug[]> {
  const auth = await getAuthContext(ctx);
  const user = await ctx.db.get(auth.userDbId);
  if (user === null) return [];
  const team = await ctx.db.get(auth.activeTeamId);
  if (team === null) return [];
  if (team.type === "personal") {
    return [...ALL_PERMISSION_SLUGS];
  }
  const membership = await ctx.db
    .query("teamMemberships")
    .withIndex("by_userId_and_teamId", (q) =>
      q.eq("userId", user._id).eq("teamId", team._id),
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

export async function assertAppointmentBookingRead(ctx: DbCtx, agentId: Id<"agents">) {
  const agent = await getOwnedAgent(ctx, agentId);
  if (agent === null) {
    throw new Error("Agent not found");
  }
  const permissions = await permissionsForCurrentUser(ctx);
  if (!permissions.includes(Permission.AUTOMATION_READ) && !permissions.includes(Permission.CALENDAR_READ)) {
    throw new Error("Forbidden");
  }
  return agent;
}

export async function assertAppointmentBookingManage(ctx: DbCtx, agentId: Id<"agents">) {
  const agent = await getOwnedAgent(ctx, agentId);
  if (agent === null) {
    throw new Error("Agent not found");
  }
  const permissions = await permissionsForCurrentUser(ctx);
  if (!permissions.includes(Permission.AUTOMATION_MANAGE) && !permissions.includes(Permission.CALENDAR_MANAGE)) {
    throw new Error("Forbidden");
  }
  return agent;
}

export async function listServices(ctx: DbCtx, agentId: Id<"agents">) {
  const services = await ctx.db
    .query("appointmentServices")
    .withIndex("by_agentId_and_sortOrder", (q) => q.eq("agentId", agentId))
    .take(100);
  return services.filter((service) => service.archivedAt === undefined);
}

export async function countBookingsByService(ctx: DbCtx, agentId: Id<"agents">) {
  const sessions = await ctx.db
    .query("appointmentBookingSessions")
    .withIndex("by_agentId_and_updatedAt", (q) => q.eq("agentId", agentId))
    .take(500);

  const counts = new Map<Id<"appointmentServices">, number>();
  for (const session of sessions) {
    if (session.serviceId === undefined || session.status !== AppointmentBookingSessionStatus.Booked) {
      continue;
    }
    const serviceId = session.serviceId;
    counts.set(serviceId, (counts.get(serviceId) ?? 0) + 1);
  }
  return counts;
}

export async function loadService(ctx: DbCtx, serviceId: Id<"appointmentServices">) {
  const service = await ctx.db.get(serviceId);
  if (service === null || service.archivedAt !== undefined) {
    throw new Error("Service not found");
  }
  return service;
}

export async function resolveTeamForAgent(ctx: DbCtx, agent: Doc<"agents">) {
  if (agent.orgId && agent.orgId !== "personal") {
    const team = await getTeamByWorkosOrgId(ctx, agent.orgId);
    if (team !== null) return team;
  }
  const owner = await getUserByWorkosId(ctx, agent.userId);
  if (owner === null) {
    throw new Error("Agent owner not found");
  }
  return await getActiveTeamForUser(ctx, owner);
}

export async function listActiveBookingServicesForAgent(ctx: DbCtx, agentId: Id<"agents">) {
  const agent = await ctx.db.get(agentId);
  if (agent === null) {
    return [];
  }
  const activeServices = (await listServices(ctx, agentId)).filter(
    (service) => service.isActive && service.archivedAt === undefined,
  );
  return await filterServicesByWorkflowBookingSelection(ctx, agentId, activeServices);
}

export async function resolveBookingService(
  ctx: DbCtx,
  agentId: Id<"agents">,
  serviceId?: Id<"appointmentServices">,
) {
  const services = await listActiveBookingServicesForAgent(ctx, agentId);
  if (services.length === 0) {
    return { services, service: undefined as Doc<"appointmentServices"> | undefined };
  }
  const service = serviceId
    ? services.find((row) => row._id === serviceId)
    : services.length === 1
      ? services[0]
      : undefined;
  return { services, service };
}
