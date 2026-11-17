import { v } from "convex/values";
import { vOnCompleteArgs } from "@convex-dev/workpool";
import type { MutationCtx } from "./_generated/server";
import { internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { inboxAiReplyPool } from "./inboxPools";
import {
  getReplyCoordinator,
  invalidatePendingReply,
  pendingReplyInputs,
  replyConversationMatches,
} from "./inboundReplyState";
import { scheduleReplyWake } from "./inboundReplyScheduling";
import { resolveMessageWaitSeconds } from "../shared/messageWaitTime";

export type InboundReplyArgs = {
  conversationId: Id<"conversations">;
  promptMessageId?: string;
  promptContent?: string;
  inboundExternalId?: string;
  sourceMessageUpdatedAt?: number;
  waitingForMedia?: boolean;
};

export async function queueInboundReply(
  ctx: MutationCtx,
  args: InboundReplyArgs,
) {
  const conversation = await ctx.db.get(args.conversationId);
  if (
    !conversation?.assignedAgentId ||
    !conversation.assignToAiAgent ||
    conversation.status === "closed" ||
    conversation.escalation
  )
    return;
  if (!args.promptMessageId)
    throw new Error("Grouped replies require a saved customer message");
  const agent = await ctx.db.get(conversation.assignedAgentId);
  if (!agent) throw new Error("Reply agent not found");
  let state = await getReplyCoordinator(ctx, args.conversationId);
  if (state && !replyConversationMatches(state, conversation)) {
    await invalidatePendingReply(ctx, args.conversationId);
    await ctx.db.patch(state._id, {
      agentId: conversation.assignedAgentId,
      channelId: conversation.channelId,
      assignedUserId: conversation.assignedUserId,
    });
    state = await ctx.db.get(state._id);
  }
  if (!state) {
    const id = await ctx.db.insert("inboundReplyCoordinators", {
      conversationId: args.conversationId,
      agentId: conversation.assignedAgentId,
      channelId: conversation.channelId,
      assignedUserId: conversation.assignedUserId,
      revision: 0,
      latestSequence: 0,
      answeredSequence: 0,
      dueAt: Date.now(),
      wakeGeneration: 0,
    });
    state = (await ctx.db.get(id))!;
  }
  const previous = await ctx.db
    .query("inboundReplyInputs")
    .withIndex("by_coordinatorId_and_promptMessageId", (q) =>
      q
        .eq("coordinatorId", state!._id)
        .eq("promptMessageId", args.promptMessageId!),
    )
    .unique();
  if (
    previous &&
    (args.sourceMessageUpdatedAt === undefined ||
      previous.sourceMessageUpdatedAt === args.sourceMessageUpdatedAt)
  )
    return;
  const dueAt =
    Date.now() + resolveMessageWaitSeconds(agent.messageWaitSeconds) * 1000;
  const activeRun = state.activeRunId
    ? await ctx.db.get(state.activeRunId)
    : null;
  const coveredByDelivery =
    previous &&
    activeRun?.deliveryStartedAt !== undefined &&
    previous.sequence <= activeRun.throughSequence;
  const sequence =
    previous && previous.sequence > state.answeredSequence && !coveredByDelivery
      ? previous.sequence
      : state.latestSequence + 1;
  const values = {
    coordinatorId: state._id,
    sequence,
    promptMessageId: args.promptMessageId,
    externalId: args.inboundExternalId,
    sourceMessageUpdatedAt: args.sourceMessageUpdatedAt,
    readiness: args.waitingForMedia ? ("waiting" as const) : ("ready" as const),
  };
  if (previous) await ctx.db.patch(previous._id, values);
  else await ctx.db.insert("inboundReplyInputs", values);
  await ctx.db.patch(state._id, {
    latestSequence: Math.max(state.latestSequence, sequence),
    revision: state.revision + 1,
    dueAt,
    ...(state.pausedRevision !== undefined
      ? { lastError: undefined, pausedRevision: undefined }
      : {}),
  });
  await scheduleReplyWake(ctx, (await ctx.db.get(state._id))!);
}

export const wake = internalMutation({
  args: {
    coordinatorId: v.id("inboundReplyCoordinators"),
    generation: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const state = await ctx.db.get(args.coordinatorId);
    if (!state || !state.wakeWorkId || state.wakeGeneration !== args.generation)
      return null;
    await ctx.db.patch(state._id, { wakeWorkId: undefined });
    const conversation = await ctx.db.get(state.conversationId);
    if (!replyConversationMatches(state, conversation)) {
      await invalidatePendingReply(ctx, state.conversationId);
      return null;
    }
    if (
      state.activeRunId ||
      state.lastError ||
      state.latestSequence <= state.answeredSequence
    )
      return null;
    if (Date.now() < state.dueAt) {
      await scheduleReplyWake(ctx, { ...state, wakeWorkId: undefined });
      return null;
    }
    const inputs = await pendingReplyInputs(ctx, state);
    if (inputs.some((input) => input.readiness !== "ready")) return null;
    if (inputs.length === 0) {
      await ctx.db.patch(state._id, { answeredSequence: state.latestSequence });
      return null;
    }
    const runId = await ctx.db.insert("inboundReplyRuns", {
      coordinatorId: state._id,
      conversationId: state.conversationId,
      agentId: state.agentId,
      revision: state.revision,
      afterSequence: state.answeredSequence,
      throughSequence: state.latestSequence,
      state: "queued",
    });
    await ctx.db.patch(state._id, { activeRunId: runId });
    const latest = inputs[inputs.length - 1];
    await inboxAiReplyPool.enqueueAction(
      ctx,
      internal.chat.inbox.generateAiReplyWorker,
      {
        conversationId: state.conversationId,
        promptMessageId: latest.promptMessageId,
        inboundExternalId: latest.externalId,
        sourceMessageUpdatedAt: latest.sourceMessageUpdatedAt,
        replyRunId: runId,
      },
      {
        retry: false,
        onComplete: internal.inboundReplyRuns.complete,
        context: { runId },
      },
    );
    return null;
  },
});

export const wakeComplete = internalMutation({
  args: vOnCompleteArgs(
    v.object({
      coordinatorId: v.id("inboundReplyCoordinators"),
      generation: v.number(),
    }),
  ),
  returns: v.null(),
  handler: async (ctx, args) => {
    if (args.result.kind === "success") return null;
    const state = await ctx.db.get(args.context.coordinatorId);
    if (state?.wakeGeneration === args.context.generation)
      await ctx.db.patch(state._id, {
        wakeWorkId: undefined,
        lastError:
          args.result.kind === "failed"
            ? args.result.error
            : "Reply wake cancelled",
      });
    return null;
  },
});

export async function finishReplyMedia(
  ctx: MutationCtx,
  conversationId: Id<"conversations">,
  promptMessageIds: string[],
  error?: string,
) {
  const state = await getReplyCoordinator(ctx, conversationId);
  if (!state) return;
  let updated = false;
  for (const promptMessageId of new Set(promptMessageIds)) {
    const input = await ctx.db
      .query("inboundReplyInputs")
      .withIndex("by_coordinatorId_and_promptMessageId", (q) =>
        q.eq("coordinatorId", state._id).eq("promptMessageId", promptMessageId),
      )
      .unique();
    if (
      input &&
      input.sequence > state.answeredSequence &&
      input.readiness === "waiting"
    ) {
      await ctx.db.patch(input._id, {
        readiness: error ? "failed" : "ready",
        error,
      });
      updated = true;
    }
  }
  if (!updated) return;
  if (error) await ctx.db.patch(state._id, { lastError: error });
  else await scheduleReplyWake(ctx, state);
}
