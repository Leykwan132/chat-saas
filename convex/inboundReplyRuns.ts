import { v } from "convex/values";
import { vOnCompleteArgs } from "@convex-dev/workpool";
import { internalMutation, internalQuery } from "./_generated/server";
import {
  pendingReplyInputs,
  replyConversationMatches,
} from "./inboundReplyState";
import { scheduleReplyWake } from "./inboundReplyScheduling";

const args = { runId: v.id("inboundReplyRuns") };

export const claimGeneration = internalMutation({
  args,
  returns: v.boolean(),
  handler: async (ctx, { runId }) => {
    const run = await ctx.db.get(runId);
    if (!run || run.state !== "queued") return false;
    const state = await ctx.db.get(run.coordinatorId);
    const conversation = await ctx.db.get(run.conversationId);
    if (
      !state ||
      state.activeRunId !== runId ||
      state.revision !== run.revision ||
      !replyConversationMatches(state, conversation)
    ) {
      await ctx.db.patch(runId, { state: "superseded" });
      return false;
    }
    const uncertain = await ctx.db
      .query("inboundReplyToolCalls")
      .withIndex("by_coordinatorId_and_afterSequence_and_state", (q) =>
        q
          .eq("coordinatorId", run.coordinatorId)
          .eq("afterSequence", run.afterSequence)
          .eq("state", "executing"),
      )
      .first();
    if (uncertain)
      throw new Error(
        "A previous tool action has an unknown outcome; automatic replay is blocked",
      );
    await ctx.db.patch(runId, { state: "generating" });
    return true;
  },
});

export const getInput = internalQuery({
  args,
  returns: v.union(
    v.null(),
    v.object({
      conversationId: v.id("conversations"),
      promptMessageIds: v.array(v.string()),
    }),
  ),
  handler: async (ctx, { runId }) => {
    const run = await ctx.db.get(runId);
    if (!run || run.state !== "generating") return null;
    const state = await ctx.db.get(run.coordinatorId);
    if (!state || state.activeRunId !== runId) return null;
    const inputs = await pendingReplyInputs(
      ctx,
      { ...state, answeredSequence: run.afterSequence },
      run.throughSequence,
    );
    if (inputs.some((input) => input.readiness !== "ready"))
      throw new Error("Reply media is not ready");
    return {
      conversationId: run.conversationId,
      promptMessageIds: inputs.map((input) => input.promptMessageId),
    };
  },
});

export const beginDelivery = internalMutation({
  args,
  returns: v.boolean(),
  handler: async (ctx, { runId }) => {
    const run = await ctx.db.get(runId);
    if (!run || run.state !== "generating") return false;
    const state = await ctx.db.get(run.coordinatorId);
    const conversation = await ctx.db.get(run.conversationId);
    if (
      !state ||
      state.activeRunId !== runId ||
      state.revision !== run.revision ||
      !replyConversationMatches(state, conversation)
    ) {
      await ctx.db.patch(runId, { state: "superseded" });
      return false;
    }
    await ctx.db.patch(runId, {
      state: "delivering",
      deliveryStartedAt: Date.now(),
    });
    return true;
  },
});

export const delivered = internalMutation({
  args,
  returns: v.null(),
  handler: async (ctx, { runId }) => {
    const run = await ctx.db.get(runId);
    if (
      !run ||
      run.deliveryStartedAt === undefined ||
      (run.state !== "delivering" && run.state !== "cancelled")
    )
      throw new Error("Reply run has no delivery claim");
    const state = await ctx.db.get(run.coordinatorId);
    if (!state || state.activeRunId !== runId)
      throw new Error("Reply run ownership changed");
    await ctx.db.patch(runId, { state: "delivered" });
    await ctx.db.patch(state._id, {
      answeredSequence: Math.max(state.answeredSequence, run.throughSequence),
    });
    return null;
  },
});

export const complete = internalMutation({
  args: vOnCompleteArgs(v.object({ runId: v.id("inboundReplyRuns") })),
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.context.runId);
    if (!run) return null;
    const state = await ctx.db.get(run.coordinatorId);
    if (!state || state.activeRunId !== run._id) return null;
    const successful = run.state === "delivered";
    const superseded =
      !successful &&
      (run.state === "superseded" ||
        run.state === "cancelled" ||
        (run.state !== "delivering" && state.revision !== run.revision));
    const pausedBeforeDelivery =
      !successful && !superseded && run.deliveryStartedAt === undefined;
    const error =
      !successful && !superseded
        ? args.result.kind === "failed"
          ? args.result.error
          : pausedBeforeDelivery
            ? "AI processing stopped before delivery"
            : "AI reply did not complete delivery; automatic retry is blocked"
        : undefined;
    if (error) await ctx.db.patch(run._id, { state: "failed", error });
    else if (superseded && run.state !== "cancelled")
      await ctx.db.patch(run._id, { state: "superseded" });
    await ctx.db.patch(state._id, {
      activeRunId: undefined,
      lastError: error,
      pausedRevision: pausedBeforeDelivery ? state.revision : undefined,
    });
    await scheduleReplyWake(ctx, (await ctx.db.get(state._id))!);
    return null;
  },
});
