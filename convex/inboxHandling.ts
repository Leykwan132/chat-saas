import type { QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import type { InboxHandling } from "../shared/inboxHandling";
import { isConversationInAiReplyAudience } from "./leadRouting/audience";

export async function withInboxHandling<
  T extends Doc<"inboxConversationSummaries">,
>(ctx: QueryCtx, summary: T): Promise<T & { handling: InboxHandling }> {
  const conversation = await ctx.db.get(summary.conversationId);
  if (
    !conversation ||
    conversation.orgId !== summary.orgId ||
    conversation.userId !== summary.userId
  )
    throw new Error("Inbox summary does not match its conversation");
  let handling: InboxHandling = "human";
  if (conversation.escalation) handling = "attention";
  else if (
    conversation.status !== "closed" &&
    conversation.assignToAiAgent &&
    conversation.assignedAgentId &&
    (await isConversationInAiReplyAudience(ctx, conversation))
  )
    handling = "ai";
  return { ...summary, handling };
}
