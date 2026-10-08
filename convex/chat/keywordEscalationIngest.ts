import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { getIncomingKeywordMatch } from "./keywordEscalation";

export async function scheduleIncomingKeywordEscalation(ctx: MutationCtx, args: {
  conversationId: Id<"conversations">;
  promptMessageId: string;
}) {
  const match = await getIncomingKeywordMatch(ctx, args);
  if (!match) return false;
  await ctx.scheduler.runAfter(0, internal.chat.keywordEscalationPreflight.execute, {
    conversationId: args.conversationId,
    ...match,
  });
  return true;
}
