import { internal } from "./_generated/api";
import type { MutationCtx } from "./_generated/server";
import { inboxAiReplyPool } from "./inboxPools";
import type { ReplyCoordinator } from "./inboundReplyState";

export async function scheduleReplyWake(
  ctx: MutationCtx,
  state: ReplyCoordinator,
) {
  if (
    state.activeRunId ||
    state.wakeWorkId ||
    state.lastError ||
    state.pausedRevision === state.revision ||
    state.latestSequence <= state.answeredSequence
  )
    return;
  const generation = state.wakeGeneration + 1;
  const wakeWorkId = await inboxAiReplyPool.enqueueMutation(
    ctx,
    internal.inboundReplyQueue.wake,
    { coordinatorId: state._id, generation },
    {
      runAt: Math.max(Date.now(), state.dueAt),
      onComplete: internal.inboundReplyQueue.wakeComplete,
      context: { coordinatorId: state._id, generation },
    },
  );
  await ctx.db.patch(state._id, { wakeGeneration: generation, wakeWorkId });
}
