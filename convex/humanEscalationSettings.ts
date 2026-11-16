import { v } from "convex/values";
import { mutation, internalQuery } from "./_generated/server";
import { api } from "./_generated/api";
import { assertManageableAgent } from "./agentAccess";
import { ensureWorkflowForAgent, listWorkflowNodes, getWorkflowForAgent, workflowHasHumanEscalationNode } from "./workflowCore";

export const setEnabled = mutation({
  args: { agentId: v.id("agents"), enabled: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { agent } = await assertManageableAgent(ctx, args.agentId);
    const workflow = await ensureWorkflowForAgent(ctx, agent);
    const nodes = await listWorkflowNodes(ctx, workflow._id);
    if (args.enabled && !nodes.some((node) => node.kind === "humanEscalation")) {
      const entry = nodes.find((node) => node.kind === "start");
      if (!entry) throw new Error("Workflow entry was not found");
      await ctx.runMutation(api.workflows.addNodeAfter, { agentId: agent._id, sourceNodeId: entry._id, kind: "humanEscalation" });
    }
    const current = await ctx.db.get(workflow._id);
    if (!current) throw new Error("Workflow not found");
    await ctx.db.patch(workflow._id, {
      humanEscalationEnabled: args.enabled,
      updatedAt: Math.max(Date.now(), current.updatedAt + 1),
    });
    return null;
  },
});

export const canEscalateConversation = internalQuery({
  args: { conversationId: v.id("conversations") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation?.assignedAgentId || conversation.status === "closed" || conversation.escalation !== undefined) return false;
    const workflow = await getWorkflowForAgent(ctx, conversation.assignedAgentId);
    return workflow !== null && await workflowHasHumanEscalationNode(ctx, workflow._id);
  },
});
