import type { ActionCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { sendEscalationMessageThenEscalate } from "./threads";
import { internalAction } from "../_generated/server";
import { v } from "convex/values";

export const execute = internalAction({
  args: {
    conversationId: v.id("conversations"),
    keyword: v.string(),
    question: v.string(),
    sourceAgentMessageId: v.string(),
    message: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await sendEscalationMessageThenEscalate(ctx, {
      conversationId: args.conversationId,
      question: args.question,
      context: `Customer message contains escalation keyword: ${args.keyword}`,
      sourceAgentMessageId: args.sourceAgentMessageId,
      message: args.message,
    });
    return null;
  },
});

export async function escalateKeywordMatch(
  ctx: Pick<ActionCtx, "runQuery" | "runAction" | "runMutation">,
  args: { conversationId: Id<"conversations">; promptMessageId?: string },
): Promise<boolean> {
  const match = await ctx.runQuery(internal.chat.keywordEscalation.match, args);
  if (!match) return false;
  await sendEscalationMessageThenEscalate(ctx, {
    conversationId: args.conversationId,
    question: match.question,
    context: `Customer message contains escalation keyword: ${match.keyword}`,
    sourceAgentMessageId: match.sourceAgentMessageId,
    message: match.message,
  });
  return true;
}
