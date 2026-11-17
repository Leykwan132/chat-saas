import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { replyConversationMatches } from "./inboundReplyState";

async function currentRun(
  ctx: QueryCtx | MutationCtx,
  runId: Id<"inboundReplyRuns">,
) {
  const run = await ctx.db.get(runId);
  if (!run || run.state !== "generating") return null;
  const state = await ctx.db.get(run.coordinatorId);
  const conversation = await ctx.db.get(run.conversationId);
  return state &&
    state.activeRunId === runId &&
    state.revision === run.revision &&
    replyConversationMatches(state, conversation)
    ? run
    : null;
}

export const isCurrent = internalQuery({
  args: { runId: v.id("inboundReplyRuns") },
  returns: v.boolean(),
  handler: async (ctx, { runId }) => (await currentRun(ctx, runId)) !== null,
});

export const begin = internalMutation({
  args: {
    runId: v.id("inboundReplyRuns"),
    toolName: v.string(),
    inputKey: v.string(),
  },
  returns: v.union(
    v.object({ executionId: v.id("inboundReplyToolCalls") }),
    v.object({ cachedResultJson: v.string() }),
  ),
  handler: async (ctx, args) => {
    const run = await currentRun(ctx, args.runId);
    if (!run)
      throw new Error("Reply generation was superseded before its tool action");
    const existing = await ctx.db
      .query("inboundReplyToolCalls")
      .withIndex(
        "by_coordinatorId_and_afterSequence_and_toolName_and_inputKey",
        (q) =>
          q
            .eq("coordinatorId", run.coordinatorId)
            .eq("afterSequence", run.afterSequence)
            .eq("toolName", args.toolName)
            .eq("inputKey", args.inputKey),
      )
      .unique();
    if (existing) {
      if (existing.state !== "completed" || existing.resultJson === undefined)
        throw new Error(
          "Previous tool action has an unknown outcome; automatic replay is blocked",
        );
      return { cachedResultJson: existing.resultJson };
    }
    const executionId = await ctx.db.insert("inboundReplyToolCalls", {
      coordinatorId: run.coordinatorId,
      afterSequence: run.afterSequence,
      toolName: args.toolName,
      inputKey: args.inputKey,
      state: "executing",
    });
    return { executionId };
  },
});

export const complete = internalMutation({
  args: { executionId: v.id("inboundReplyToolCalls"), resultJson: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const execution = await ctx.db.get(args.executionId);
    if (!execution || execution.state !== "executing")
      throw new Error("Tool execution has no active claim");
    JSON.parse(args.resultJson);
    await ctx.db.patch(execution._id, {
      state: "completed",
      resultJson: args.resultJson,
    });
    return null;
  },
});
