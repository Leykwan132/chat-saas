import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

type DbCtx = QueryCtx | MutationCtx;
export type ReplyCoordinator = Doc<"inboundReplyCoordinators">;

export async function getReplyCoordinator(
  ctx: DbCtx,
  conversationId: Id<"conversations">,
) {
  return await ctx.db
    .query("inboundReplyCoordinators")
    .withIndex("by_conversationId", (q) =>
      q.eq("conversationId", conversationId),
    )
    .unique();
}

export function replyConversationMatches(
  state: ReplyCoordinator,
  conversation: Doc<"conversations"> | null,
) {
  return (
    conversation !== null &&
    conversation.assignToAiAgent &&
    conversation.status !== "closed" &&
    conversation.escalation === undefined &&
    conversation.assignedAgentId === state.agentId &&
    conversation.channelId === state.channelId &&
    conversation.assignedUserId === state.assignedUserId
  );
}

export async function pendingReplyInputs(
  ctx: DbCtx,
  state: ReplyCoordinator,
  throughSequence = state.latestSequence,
) {
  const rows = await ctx.db
    .query("inboundReplyInputs")
    .withIndex("by_coordinatorId_and_sequence", (q) =>
      q
        .eq("coordinatorId", state._id)
        .gt("sequence", state.answeredSequence)
        .lte("sequence", throughSequence),
    )
    .take(257);
  if (rows.length > 256) throw new Error("Reply group exceeds 256 messages");
  return rows.filter((row) => !row.excluded);
}

export async function invalidatePendingReply(
  ctx: MutationCtx,
  conversationId: Id<"conversations">,
) {
  const state = await getReplyCoordinator(ctx, conversationId);
  if (!state) return;
  if (state.activeRunId) {
    const run = await ctx.db.get(state.activeRunId);
    if (run && run.state !== "delivered")
      await ctx.db.patch(run._id, { state: "cancelled" });
  }
  await ctx.db.patch(state._id, {
    revision: state.revision + 1,
    answeredSequence: state.latestSequence,
    wakeGeneration: state.wakeGeneration + 1,
    wakeWorkId: undefined,
    lastError: undefined,
    pausedRevision: undefined,
  });
}

export async function excludeRevokedReplyInput(
  ctx: MutationCtx,
  conversationId: Id<"conversations">,
  promptMessageId: string,
) {
  const state = await getReplyCoordinator(ctx, conversationId);
  if (!state) return;
  const input = await ctx.db
    .query("inboundReplyInputs")
    .withIndex("by_coordinatorId_and_promptMessageId", (q) =>
      q.eq("coordinatorId", state._id).eq("promptMessageId", promptMessageId),
    )
    .unique();
  if (!input || input.sequence <= state.answeredSequence || input.excluded)
    return;
  await ctx.db.patch(input._id, { excluded: true });
  await ctx.db.patch(state._id, { revision: state.revision + 1 });
}

export async function observeReplyConversationChange(
  ctx: MutationCtx,
  before: Doc<"conversations"> | null,
  after: Doc<"conversations"> | null,
) {
  if (!before) return;
  const relevant =
    !after ||
    before.assignToAiAgent !== after.assignToAiAgent ||
    before.status !== after.status ||
    before.assignedAgentId !== after.assignedAgentId ||
    before.assignedUserId !== after.assignedUserId ||
    before.channelId !== after.channelId ||
    before.escalation?.escalatedAt !== after.escalation?.escalatedAt;
  if (!relevant) return;
  const state = await getReplyCoordinator(ctx, before._id);
  if (state && !replyConversationMatches(state, after))
    await invalidatePendingReply(ctx, before._id);
}
