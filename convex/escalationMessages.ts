import { v } from "convex/values";
import { internalQuery, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getWorkflowForAgent, listWorkflowNodes } from "./workflowCore";

const policyArgs = {
  conversationId: v.id("conversations"),
  sourceAgentMessageId: v.string(),
  workflowNodeId: v.optional(v.id("workflowNodes")),
};

async function loadPolicy(ctx: QueryCtx, args: {
  conversationId: Id<"conversations">;
  sourceAgentMessageId: string;
  workflowNodeId?: Id<"workflowNodes">;
}) {
  const conversation = await ctx.db.get(args.conversationId);
  if (!conversation?.assignedAgentId || conversation.status === "closed" || conversation.escalation !== undefined) return null;
  const workflow = await getWorkflowForAgent(ctx, conversation.assignedAgentId);
  if (!workflow || workflow.humanEscalationEnabled === false) return null;
  const source = await ctx.db.query("messages")
    .withIndex("by_agentMessageId", (q) => q.eq("agentMessageId", args.sourceAgentMessageId)).order("desc").first();
  if (!source || source.conversationId !== conversation._id || source.direction !== "incoming") {
    throw new Error("Escalation source message was not found");
  }
  const nodes = (await listWorkflowNodes(ctx, workflow._id)).filter((node) => node.kind === "humanEscalation");
  if (nodes.length === 0) return null;
  if (args.workflowNodeId === undefined && nodes.length > 1) throw new Error("A matching escalation rule is required");
  const node = args.workflowNodeId === undefined ? nodes[0] : nodes.find((item) => item._id === args.workflowNodeId);
  if (!node) throw new Error("Human escalation rule is not available for this agent");
  return { conversation, node, source };
}

export const getPolicy = internalQuery({
  args: policyArgs,
  returns: v.union(v.null(), v.object({
    nodeId: v.id("workflowNodes"),
    mode: v.union(v.literal("ai"), v.literal("manual")),
    message: v.optional(v.string()),
  })),
  handler: async (ctx, args) => {
    const data = await loadPolicy(ctx, args);
    if (!data) return null;
    const { node } = data;
    if (node.escalationMessageEnabled !== true || node.escalationMessageMode === "ai") return { nodeId: node._id, mode: "ai" as const };
    const message = node.escalationMessage?.trim();
    if (!message) throw new Error("A manual escalation message is required");
    return { nodeId: node._id, mode: "manual" as const, message };
  },
});

export const getGenerationInput = internalQuery({
  args: { ...policyArgs, workflowNodeId: v.id("workflowNodes") },
  returns: v.union(v.null(), v.object({
    agentId: v.id("agents"), agentName: v.string(), model: v.string(), billingUserId: v.string(),
    orgId: v.string(), threadId: v.string(), instructions: v.string(),
    formality: v.optional(v.string()), emojiUse: v.optional(v.string()), customerMessage: v.string(),
    conversation: v.array(v.object({ speaker: v.union(v.literal("customer"), v.literal("business")), text: v.string() })),
  })),
  handler: async (ctx, args) => {
    const data = await loadPolicy(ctx, args);
    if (!data || data.node.escalationMessageEnabled === true && data.node.escalationMessageMode !== "ai") return null;
    const agent = await ctx.db.get(data.conversation.assignedAgentId!);
    if (!agent) throw new Error("Assigned agent was not found");
    const messages = await ctx.db.query("messages")
      .withIndex("by_conversationId_and_createdAt", (q) => q.eq("conversationId", data.conversation._id))
      .order("desc").take(12);
    return {
      agentId: agent._id, agentName: agent.name, model: agent.model, billingUserId: agent.userId,
      orgId: data.conversation.orgId, threadId: data.conversation.threadId,
      instructions: agent.systemPrompt,
      formality: agent.formality, emojiUse: agent.emojiUse,
      customerMessage: data.source.content,
      conversation: messages.reverse().filter((message) => message.contentType === "text")
        .map((message) => ({ speaker: message.direction === "incoming" ? "customer" as const : "business" as const, text: message.content.slice(0, 2000) })),
    };
  },
});
