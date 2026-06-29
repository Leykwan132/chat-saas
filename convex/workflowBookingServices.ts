import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { assertManageableAgent } from "./agentAccess";
import { getWorkflowForAgent, listWorkflowNodes } from "./workflowCore";

const MAX_BOOKING_SERVICES = 100;

type DbCtx = QueryCtx | MutationCtx;

async function getWorkflowBookAppointmentNodes(ctx: DbCtx, agentId: Id<"agents">) {
  const workflow = await getWorkflowForAgent(ctx, agentId);
  if (workflow === null) return [];

  const nodes = await listWorkflowNodes(ctx, workflow._id);
  const bookAppointmentNodes: Doc<"workflowNodes">[] = [];
  for (const node of nodes) {
    if (node.kind === "bookAppointment") {
      bookAppointmentNodes.push(node);
    }
  }
  return bookAppointmentNodes;
}

async function normalizeServiceIds(
  ctx: MutationCtx,
  agentId: Id<"agents">,
  serviceIds: Id<"autoBookingServices">[],
) {
  if (serviceIds.length > MAX_BOOKING_SERVICES) {
    throw new Error("Too many services selected");
  }

  const seen = new Set<Id<"autoBookingServices">>();
  const normalized: Id<"autoBookingServices">[] = [];
  for (const serviceId of serviceIds) {
    if (seen.has(serviceId)) continue;

    const service = await ctx.db.get(serviceId);
    if (service === null || service.agentId !== agentId || service.archivedAt !== undefined) {
      throw new Error("Auto booking service not found");
    }

    seen.add(serviceId);
    normalized.push(serviceId);
  }
  return normalized;
}

export async function getAllowedAutoBookingServiceIdsForAgent(
  ctx: DbCtx,
  agentId: Id<"agents">,
) {
  const nodes = await getWorkflowBookAppointmentNodes(ctx, agentId);
  if (nodes.length === 0) return undefined;

  const allowedIds = new Set<Id<"autoBookingServices">>();
  for (const node of nodes) {
    if (node.allowedAutoBookingServiceIds === undefined) {
      return undefined;
    }
    for (const serviceId of node.allowedAutoBookingServiceIds) {
      allowedIds.add(serviceId);
    }
  }
  return allowedIds;
}

export async function filterServicesByWorkflowBookingSelection<
  Service extends Pick<Doc<"autoBookingServices">, "_id">,
>(
  ctx: DbCtx,
  agentId: Id<"agents">,
  services: Service[],
) {
  const allowedIds = await getAllowedAutoBookingServiceIdsForAgent(ctx, agentId);
  if (allowedIds === undefined) return services;

  const filtered: Service[] = [];
  for (const service of services) {
    if (allowedIds.has(service._id)) {
      filtered.push(service);
    }
  }
  return filtered;
}

export const listForAgent = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const { agent } = await assertManageableAgent(ctx, args.agentId);
    const services = await ctx.db
      .query("autoBookingServices")
      .withIndex("by_agentId_and_sortOrder", (q) => q.eq("agentId", agent._id))
      .take(MAX_BOOKING_SERVICES);

    const rows = [];
    for (const service of services) {
      if (service.archivedAt !== undefined) continue;
      rows.push({
        _id: service._id,
        name: service.name,
        description: service.description,
        isActive: service.isActive,
        durationMinutes: service.durationMinutes,
        sortOrder: service.sortOrder,
      });
    }
    return rows;
  },
});

export const updateAllowedServices = mutation({
  args: {
    agentId: v.id("agents"),
    nodeId: v.id("workflowNodes"),
    serviceIds: v.array(v.id("autoBookingServices")),
  },
  handler: async (ctx, args) => {
    const { agent } = await assertManageableAgent(ctx, args.agentId);
    const workflow = await getWorkflowForAgent(ctx, agent._id);
    if (workflow === null) {
      throw new Error("Workflow not found");
    }

    const node = await ctx.db.get(args.nodeId);
    if (node === null || node.workflowId !== workflow._id) {
      throw new Error("Workflow node not found");
    }
    if (node.kind !== "bookAppointment") {
      throw new Error("Services can only be configured on Book appointment actions");
    }

    const serviceIds = await normalizeServiceIds(ctx, agent._id, args.serviceIds);
    const now = Date.now();
    await ctx.db.patch(node._id, {
      allowedAutoBookingServiceIds: serviceIds,
      updatedAt: now,
    });
    await ctx.db.patch(workflow._id, { updatedAt: now });
  },
});
