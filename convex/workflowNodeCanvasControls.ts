import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { assertManageableAgent } from "./agentAccess";
import { getWorkflowForAgent } from "./workflowCore";
import { refreshWorkflowNodeReadinessForAgent } from "./workflowNodeReadiness";

export const updateMessage = mutation({
  args: {
    agentId: v.id("agents"),
    nodeId: v.id("workflowNodes"),
    description: v.string(),
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
    if (node.kind !== "sendText") {
      throw new Error("Message controls are only available on Send message actions");
    }

    const now = Math.max(Date.now(), workflow.updatedAt + 1);
    await ctx.db.patch(node._id, {
      description: args.description.trim() || undefined,
      updatedAt: now,
    });
    await ctx.db.patch(workflow._id, { updatedAt: now });
    await refreshWorkflowNodeReadinessForAgent(ctx, agent._id);
    return null;
  },
});

export const updateIncomingCondition = mutation({
  args: {
    agentId: v.id("agents"),
    nodeId: v.id("workflowNodes"),
    conditionDetail: v.string(),
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
    if (node.kind !== "humanEscalation") {
      throw new Error("Human escalation controls are only available on Human escalation actions");
    }

    const edge = await ctx.db
      .query("workflowEdges")
      .withIndex("by_workflowId_and_targetNodeId", (q) =>
        q.eq("workflowId", workflow._id).eq("targetNodeId", node._id),
      )
      .unique();
    if (edge === null) {
      throw new Error("Incoming workflow condition not found");
    }

    const now = Math.max(Date.now(), workflow.updatedAt + 1);
    await ctx.db.patch(edge._id, {
      detail: args.conditionDetail.trim() || undefined,
      updatedAt: now,
    });
    await ctx.db.patch(workflow._id, { updatedAt: now });
    await refreshWorkflowNodeReadinessForAgent(ctx, agent._id);
    return null;
  },
});
