import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { assertManageableAgent } from "./agentAccess";
import { getWorkflowForAgent } from "./workflowCore";
import { normalizeEscalationKeywords } from "../shared/escalationKeywords";
import { refreshWorkflowNodeReadinessForAgent } from "./workflowNodeReadiness";

export const update = mutation({
  args: {
    agentId: v.id("agents"),
    nodeId: v.id("workflowNodes"),
    enabled: v.boolean(),
    keywords: v.array(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { agent } = await assertManageableAgent(ctx, args.agentId);
    const workflow = await getWorkflowForAgent(ctx, agent._id);
    const node = await ctx.db.get(args.nodeId);
    if (!workflow || !node || node.workflowId !== workflow._id) throw new Error("Workflow node not found");
    if (node.kind !== "humanEscalation") throw new Error("Keywords are only available on Human escalation actions");
    const keywords = normalizeEscalationKeywords(args.keywords);
    const now = Math.max(Date.now(), workflow.updatedAt + 1);
    await ctx.db.patch(node._id, {
      escalationKeywordsEnabled: args.enabled,
      escalationKeywords: keywords,
      updatedAt: now,
    });
    await ctx.db.patch(workflow._id, { updatedAt: now });
    await refreshWorkflowNodeReadinessForAgent(ctx, agent._id);
    return null;
  },
});
