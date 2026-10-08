import { v } from "convex/values";
import { internalQuery } from "../_generated/server";
import { getWorkflowForAgent, listWorkflowNodes } from "../workflowCore";
import { findEscalationKeyword } from "../../shared/escalationKeywords";

export const match = internalQuery({
  args: {
    conversationId: v.id("conversations"),
    promptMessageId: v.optional(v.string()),
  },
  returns: v.union(v.null(), v.object({
    keyword: v.string(),
    question: v.string(),
    sourceAgentMessageId: v.string(),
    message: v.optional(v.string()),
  })),
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation?.assignedAgentId || !conversation.assignToAiAgent || conversation.status === "closed" || conversation.escalation !== undefined) return null;
    if (!args.promptMessageId) return null;
    const source = await ctx.db.query("messages")
      .withIndex("by_agentMessageId", (q) => q.eq("agentMessageId", args.promptMessageId))
      .order("desc").first();
    if (!source || source.conversationId !== conversation._id || source.direction !== "incoming") return null;
    const workflow = await getWorkflowForAgent(ctx, conversation.assignedAgentId);
    if (!workflow) return null;
    const nodes = await listWorkflowNodes(ctx, workflow._id);
    for (const node of nodes) {
      if (node.kind !== "humanEscalation" || node.escalationKeywordsEnabled !== true || node.isReady !== true) continue;
      const keyword = findEscalationKeyword(source.content, node.escalationKeywords ?? []);
      if (keyword !== undefined) {
        return {
          keyword,
          question: source.content,
          sourceAgentMessageId: args.promptMessageId,
          message: node.escalationMessageEnabled === true ? node.escalationMessage?.trim() : undefined,
        };
      }
    }
    return null;
  },
});
