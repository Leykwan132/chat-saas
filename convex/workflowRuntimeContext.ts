import { v } from "convex/values";
import { internalQuery } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { getWorkflowForAgent, listWorkflowEdges, listWorkflowNodes } from "./workflowCore";
import { workflowNodeDescription, workflowNodeDisplayTitle } from "../shared/workflows";
import { requireReadyMediaPublicUrl } from "./media/publicUrls";

const MAX_RUNTIME_SERVICES = 100;
const MAX_RUNTIME_MEDIA = 500;

type RuntimeService = {
  serviceId: Id<"appointmentServices">;
  name: string;
  description?: string;
  durationMinutes: number;
  fields: Doc<"appointmentServices">["fields"];
};

function serviceForPrompt(service: Doc<"appointmentServices">): RuntimeService {
  return {
    serviceId: service._id,
    name: service.name,
    description: service.description,
    durationMinutes: service.durationMinutes,
    fields: service.fields,
  };
}

async function listActiveServices(ctx: Parameters<typeof getWorkflowForAgent>[0], agentId: Id<"agents">) {
  const rows = await ctx.db
    .query("appointmentServices")
    .withIndex("by_agentId_and_isActive", (q) => q.eq("agentId", agentId).eq("isActive", true))
    .take(MAX_RUNTIME_SERVICES);
  return rows
    .filter((service) => service.archivedAt === undefined)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function servicesForNode(
  node: Doc<"workflowNodes">,
  activeServices: Doc<"appointmentServices">[],
  serviceById: Map<Id<"appointmentServices">, Doc<"appointmentServices">>,
) {
  if (node.kind !== "bookAppointment") return [];
  if (node.allowedAppointmentServiceIds === undefined) {
    return activeServices.map(serviceForPrompt);
  }
  return node.allowedAppointmentServiceIds
    .map((serviceId) => serviceById.get(serviceId))
    .filter((service): service is Doc<"appointmentServices"> => service !== undefined)
    .map(serviceForPrompt);
}

function mediaForNode(
  node: Doc<"workflowNodes">,
  mediaRows: Doc<"mediaUploads">[],
) {
  if (node.kind !== "sendImage" && node.kind !== "sendFile") return [];
  return mediaRows
    .filter((row) =>
      row.workflowNodeId === node._id &&
      row.purpose === "workflowSendMedia" &&
      row.status === "ready",
    )
    .map((row) => ({
      clientId: row.clientId,
      filename: row.filename,
      mediaType: row.mediaType,
      url: requireReadyMediaPublicUrl(row),
    }));
}

function goalForNode(node: Doc<"workflowNodes">) {
  if (node.kind === "sendImage" || node.kind === "sendFile" || node.kind === "bookAppointment") return undefined;
  return node.description?.trim() || workflowNodeDescription(node.kind);
}

export const loadForAgent = internalQuery({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const workflow = await getWorkflowForAgent(ctx, args.agentId);
    if (workflow === null) {
      return null;
    }

    const nodes = await listWorkflowNodes(ctx, workflow._id);
    const edges = await listWorkflowEdges(ctx, workflow._id);
    const activeServices = await listActiveServices(ctx, args.agentId);
    const serviceById = new Map(activeServices.map((service) => [service._id, service]));
    const mediaRows = await ctx.db
      .query("mediaUploads")
      .withIndex("by_agentId", (q) => q.eq("agentId", args.agentId))
      .take(MAX_RUNTIME_MEDIA);

    return {
      workflowId: workflow._id,
      nodes: nodes.map((node) => ({
        nodeId: node._id,
        kind: node.kind,
        title: workflowNodeDisplayTitle(node.kind, node.title),
        goal: goalForNode(node),
        notes: node.notes,
        incomingConditions: edges
          .filter((edge) => edge.targetNodeId === node._id)
          .map((edge) => ({
            sourceNodeId: edge.sourceNodeId,
            name: edge.label,
            detail: edge.detail,
          })),
        allowedServices: servicesForNode(node, activeServices, serviceById),
        mediaAssets: mediaForNode(node, mediaRows),
      })),
      edges: edges.map((edge) => ({
        sourceNodeId: edge.sourceNodeId,
        targetNodeId: edge.targetNodeId,
        name: edge.label,
        detail: edge.detail,
      })),
    };
  },
});
