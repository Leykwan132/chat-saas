import type { ActionCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { sendEscalationMessageThenEscalate } from "./threads";

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
