import { v } from "convex/values";
import { mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { assertManageableAgent } from "./agentAccess";
import {
  getWorkflowForAgent,
  getWorkflowGraph,
  listWorkflowEdges,
  listWorkflowNodes,
} from "./workflowCore";
import { validateWorkflowDraft } from "./workflowDraftValidation";
import {
  workflowGraphEdgeSaveValidator,
  workflowGraphNodeSaveValidator,
} from "./workflowGraphSaveValidators";
import { deleteOrQueueWorkflowNodeMedia } from "./workflowMediaDeletion";
import { refreshWorkflowNodeReadinessForAgent } from "./workflowNodeReadiness";
import { recordWorkflowTemplateUsage } from "./workflowTemplateUsage";
import {
  workflowTemplateIdValidator,
} from "./workflowTemplateUsageSchema";
import { workflowLayoutOrientationValidator } from "./workflowValidators";

export const replace = mutation({
  args: {
    agentId: v.id("agents"),
    baselineUpdatedAt: v.number(),
    layoutOrientation: workflowLayoutOrientationValidator,
    templateId: v.optional(workflowTemplateIdValidator),
    nodes: v.array(workflowGraphNodeSaveValidator),
    edges: v.array(workflowGraphEdgeSaveValidator),
  },
  handler: async (ctx, args) => {
    const { agent } = await assertManageableAgent(ctx, args.agentId);
    const workflow = await getWorkflowForAgent(ctx, agent._id);
    if (workflow === null) {
      throw new Error("Workflow not found");
    }
    if (workflow.updatedAt !== args.baselineUpdatedAt) {
      throw new Error(
        "This workflow changed elsewhere. Reset to load the latest version before saving.",
      );
    }

    validateWorkflowDraft(args.nodes, args.edges);
    const existingNodes = await listWorkflowNodes(ctx, workflow._id);
    const existingEdges = await listWorkflowEdges(ctx, workflow._id);
    const existingNodeById = new Map(
      existingNodes.map((node) => [node._id, node]),
    );
    const retainedNodeIds = new Set<Id<"workflowNodes">>();
    const serviceIds = new Set(
      args.nodes.flatMap((node) => node.allowedAppointmentServiceIds ?? []),
    );
    for (const serviceId of serviceIds) {
      const service = await ctx.db.get(serviceId);
      if (service === null || service.agentId !== agent._id) {
        throw new Error("Appointment service not found");
      }
    }
    for (const node of args.nodes) {
      if (!node.persistedNodeId) continue;
      const existingNode = existingNodeById.get(node.persistedNodeId);
      if (existingNode === undefined) {
        throw new Error("Workflow node not found");
      }
      if (existingNode.kind !== node.kind) {
        throw new Error("Workflow node kind cannot be changed");
      }
      retainedNodeIds.add(node.persistedNodeId);
    }

    const now = Math.max(Date.now(), workflow.updatedAt + 1);
    const nodeIdByClientId = new Map<string, Id<"workflowNodes">>();
    for (const edge of existingEdges) {
      await ctx.db.delete(edge._id);
    }
    for (const node of args.nodes) {
      const values = {
        title: node.title.trim(),
        description: node.description?.trim() || undefined,
        notes: node.notes?.trim() || undefined,
        allowedAppointmentServiceIds:
          node.kind === "bookAppointment"
            ? node.allowedAppointmentServiceIds
            : undefined,
        positionX: node.positionX,
        positionY: node.positionY,
        updatedAt: now,
      };
      if (node.persistedNodeId) {
        await ctx.db.patch(node.persistedNodeId, values);
        nodeIdByClientId.set(node.clientId, node.persistedNodeId);
      } else {
        const nodeId = await ctx.db.insert("workflowNodes", {
          workflowId: workflow._id,
          kind: node.kind,
          ...values,
          createdAt: now,
        });
        nodeIdByClientId.set(node.clientId, nodeId);
      }
    }
    for (const node of existingNodes) {
      if (retainedNodeIds.has(node._id)) continue;
      await deleteOrQueueWorkflowNodeMedia(ctx, agent, node._id);
      await ctx.db.delete(node._id);
    }
    for (const edge of args.edges) {
      await ctx.db.insert("workflowEdges", {
        workflowId: workflow._id,
        sourceNodeId: nodeIdByClientId.get(edge.sourceClientId)!,
        targetNodeId: nodeIdByClientId.get(edge.targetClientId)!,
        label: edge.label?.trim() || undefined,
        detail: edge.detail?.trim() || undefined,
        createdAt: now,
        updatedAt: now,
      });
    }
    await ctx.db.patch(workflow._id, {
      layoutOrientation: args.layoutOrientation,
      updatedAt: now,
    });
    if (args.templateId) {
      await recordWorkflowTemplateUsage(ctx, agent._id, args.templateId, now);
    }
    await refreshWorkflowNodeReadinessForAgent(ctx, agent._id);

    const savedWorkflow = await ctx.db.get(workflow._id);
    if (savedWorkflow === null) {
      throw new Error("Workflow not found");
    }
    return await getWorkflowGraph(ctx, savedWorkflow);
  },
});
