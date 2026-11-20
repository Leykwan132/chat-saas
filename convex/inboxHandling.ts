import { getInboxLastReplyAuthor } from "./inboxLastReply";
import type { QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import type { InboxHandling } from "../shared/inboxHandling";
import { isConversationInAiReplyAudience } from "./leadRouting/audience";

export async function withInboxHandling<
  T extends Doc<"inboxConversationSummaries">,
>(ctx: QueryCtx, summary: T) {
  const conversation = await ctx.db.get(summary.conversationId);
  if (
    !conversation ||
    conversation.orgId !== summary.orgId ||
    conversation.userId !== summary.userId
  )
    throw new Error("Inbox summary does not match its conversation");
  const aiControlAvailable =
    conversation.status !== "closed" &&
    Boolean(conversation.assignedAgentId) &&
    (await isConversationInAiReplyAudience(ctx, conversation));
  let handling: InboxHandling = "human";
  if (conversation.escalation) handling = "attention";
  else if (conversation.assignToAiAgent && aiControlAvailable) handling = "ai";
  const lastReplyAuthor = await getInboxLastReplyAuthor(
    ctx,
    summary.conversationId,
  );
  return {
    ...summary,
    handling,
    aiControlAvailable,
    lastReplyAuthor,
    aiResumeAt: conversation.manualAiResumeAt ?? null,
  };
}
