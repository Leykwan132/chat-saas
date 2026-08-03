import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { assertManageableAgent } from "./agentAccess";
import { normalizeAllowedAppointmentServiceIds } from "./workflowAppointmentServices";
import { getWorkflowForAgent, getWorkflowGraph } from "./workflowCore";
import { refreshWorkflowNodeReadinessForAgent } from "./workflowNodeReadiness";

export const apply = mutation({
  args: {
    agentId: v.id("agents"),
    nodeId: v.id("workflowNodes"),
    conditionEdgeId: v.optional(v.id("workflowEdges")),
    title: v.string(),
    description: v.optional(v.string()),
    conditionLabel: v.optional(v.string()),
    conditionDetail: v.optional(v.string()),
    allowedAppointmentServiceIds: v.optional(
      v.array(v.id("appointmentServices")),
    ),
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

    const title = args.title.trim();
    if (!title) {
      throw new Error("Node title is required");
    }

    const edge = args.conditionEdgeId
      ? await ctx.db.get(args.conditionEdgeId)
      : null;
    if (
      args.conditionEdgeId &&
      (edge === null ||
        edge.workflowId !== workflow._id ||
        edge.targetNodeId !== node._id)
    ) {
      throw new Error("Workflow edge not found");
    }
    if (edge && !args.conditionDetail?.trim()) {
      throw new Error("Condition detail is required");
    }

    const serviceIds =
      args.allowedAppointmentServiceIds === undefined
        ? undefined
        : await normalizeAllowedAppointmentServiceIds(
            ctx,
            agent._id,
            args.allowedAppointmentServiceIds,
          );
    if (serviceIds !== undefined && node.kind !== "bookAppointment") {
      throw new Error(
        "Services can only be configured on Book appointment actions",
      );
    }

    const now = Math.max(Date.now(), workflow.updatedAt + 1);
    await ctx.db.patch(node._id, {
      title,
      description: args.description?.trim() || undefined,
      allowedAppointmentServiceIds: serviceIds,
      updatedAt: now,
    });
    if (edge) {
      await ctx.db.patch(edge._id, {
        label: args.conditionLabel?.trim() || undefined,
        detail: args.conditionDetail?.trim() || undefined,
        updatedAt: now,
      });
    }
    await ctx.db.patch(workflow._id, { updatedAt: now });
    await refreshWorkflowNodeReadinessForAgent(ctx, agent._id);

    const savedWorkflow = await ctx.db.get(workflow._id);
    if (savedWorkflow === null) {
      throw new Error("Workflow not found");
    }
    return await getWorkflowGraph(ctx, savedWorkflow);
  },
});
