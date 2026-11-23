import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { resolveMessageWaitSeconds } from "../../shared/messageWaitTime";

const replyArgs = {
  threadId: v.string(),
  agentId: v.id("agents"),
  promptMessageId: v.string(),
  firstPromptMessageId: v.string(),
  enableCitations: v.optional(v.boolean()),
  billingUserId: v.string(),
  deductCredits: v.boolean(),
};

type PlaygroundReplyArgs = {
  threadId: string;
  agentId: Doc<"agents">["_id"];
  promptMessageId: string;
  enableCitations?: boolean;
  billingUserId: string;
  deductCredits: boolean;
};

export async function cancelPlaygroundReply(
  ctx: MutationCtx,
  conversation: Doc<"conversations">,
) {
  if (!conversation.playgroundReplyJobId) return;
  const job = await ctx.db.system.get(conversation.playgroundReplyJobId);
  if (job?.state.kind === "pending") {
    await ctx.scheduler.cancel(conversation.playgroundReplyJobId);
  }
}

export async function schedulePlaygroundReply(
  ctx: MutationCtx,
  conversation: Doc<"conversations">,
  args: PlaygroundReplyArgs,
  waitSeconds: number | undefined,
) {
  await cancelPlaygroundReply(ctx, conversation);
  const jobId = await ctx.scheduler.runAfter(
    resolveMessageWaitSeconds(waitSeconds) * 1000,
    internal.chat.playgroundReplyScheduling.wake,
    {
      ...args,
      firstPromptMessageId:
        conversation.playgroundReplyFirstMessageId ?? args.promptMessageId,
      conversationId: conversation._id,
    },
  );
  await ctx.db.patch(conversation._id, {
    playgroundReplyJobId: jobId,
    playgroundReplyMessageId: args.promptMessageId,
    playgroundReplyFirstMessageId:
      conversation.playgroundReplyFirstMessageId ?? args.promptMessageId,
  });
}

export const wake = internalMutation({
  args: { ...replyArgs, conversationId: v.id("conversations") },
  returns: v.null(),
  handler: async (ctx, { conversationId, ...args }) => {
    const conversation = await ctx.db.get(conversationId);
    if (
      !conversation ||
      conversation.service !== "playground" ||
      conversation.threadId !== args.threadId ||
      conversation.assignedAgentId !== args.agentId ||
      conversation.playgroundReplyMessageId !== args.promptMessageId
    )
      return null;
    await ctx.db.patch(conversationId, {
      playgroundReplyJobId: undefined,
      playgroundReplyMessageId: undefined,
      playgroundReplyFirstMessageId: undefined,
    });
    await ctx.scheduler.runAfter(
      0,
      internal.chat.streaming.generatePlaygroundResponseAsync,
      args,
    );
    return null;
  },
});
