import type { ActionCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";

type EscalationArgs = {
  conversationId: Id<"conversations">;
  question: string;
  context: string;
  sourceAgentMessageId: string;
  workflowNodeId?: Id<"workflowNodes">;
  message?: string;
};

export async function sendEscalationMessageThenEscalate(
  ctx: Pick<ActionCtx, "runAction" | "runMutation" | "runQuery">,
  args: EscalationArgs,
): Promise<boolean> {
  const policyArgs = { conversationId: args.conversationId, sourceAgentMessageId: args.sourceAgentMessageId, workflowNodeId: args.workflowNodeId };
  const policy = await ctx.runQuery(internal.escalationMessages.getPolicy, policyArgs);
  if (!policy) return false;
  let content: string | undefined;
  let usage: { llmModel: string; creditsCharged: number } | undefined;
  if (policy.mode === "manual") {
    if (!policy.message) throw new Error("A manual escalation message is required");
    content = policy.message;
  } else if (policy.mode === "ai") {
    const generated = await ctx.runAction(internal.chat.escalationMessageGeneration.generate, { ...policyArgs, workflowNodeId: policy.nodeId });
    if (!generated) return false;
    const current = await ctx.runQuery(internal.escalationMessages.getPolicy, policyArgs);
    if (!current || current.mode !== "ai" || current.nodeId !== policy.nodeId) return false;
    content = generated.content;
    const charged = await ctx.runMutation(internal.credits.internalDeductCredits, {
      workosUserId: generated.billingUserId, modelId: generated.llmModel,
      conversationId: args.conversationId, agentId: generated.agentId, reason: "AI escalation message",
    });
    usage = { llmModel: charged.llmModel, creditsCharged: charged.creditsCharged };
  }
  if (content !== undefined) {
    const sent = await ctx.runAction(internal.chat.inboxActions.internalSendEscalationMessage, {
      conversationId: args.conversationId, content, ...usage,
    });
    if (!sent.ok) throw new Error(sent.error ?? "Could not send escalation message");
  }
  return await ctx.runMutation(internal.chat.inbox.internalEscalateConversation, {
    conversationId: args.conversationId, question: args.question, context: args.context,
    sourceAgentMessageId: args.sourceAgentMessageId,
  });
}
