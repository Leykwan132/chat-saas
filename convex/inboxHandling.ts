import { autoResumeConfig, ownsAutoResumeTimer } from "./autoResumeTimerState";
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
  let resumeAt = conversation.manualAiResumeAt ?? null;
  let resumeStartedAt = conversation.manualAiResumeStartedAt ?? null;
  if (resumeAt === null && !conversation.assignToAiAgent) {
    const timer = await ctx.db
      .query("autoDeescalationTimers")
      .withIndex("by_conversationId", (q) =>
        q.eq("conversationId", conversation._id),
      )
      .unique();
    if (timer && ownsAutoResumeTimer(timer, conversation)) {
      const config = autoResumeConfig(
        await ctx.db.get(timer.agentId),
        timer.scope,
      );
      if (
        config?.enabled &&
        config.activationRevision === timer.configRevision
      ) {
        resumeAt = timer.dueAt;
        resumeStartedAt = timer.lastHumanReplyAt;
      }
    }
  }
  return {
    ...summary,
    handling,
    aiControlAvailable,
    lastReplyAuthor,
    aiResumeAt: resumeAt,
    aiResumeStartedAt: resumeAt !== null ? resumeStartedAt : null,
  };
}
