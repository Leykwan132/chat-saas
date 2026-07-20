import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { internalMutation } from "./triggers";
import { buildConversationMetricContributions } from "./analyticsConversationContributionModel";
import { reconcileMetricContributions } from "./analyticsMetricContributions";
import {
  loadOrCreateProjectionState,
  replaceProjectionState,
} from "./analyticsProjectionState";
import { applyConversationTransitions } from "./analyticsProjectionStateModel";

function hasConvertedTag(tags: string[] | undefined) {
  return (tags ?? []).some(
    (tag) => tag.trim().toLowerCase() === "converted",
  );
}

export async function reconcileConversationAnalytics(
  ctx: MutationCtx,
  conversationId: Id<"conversations">,
  observedAt = Date.now(),
) {
  const conversation = await ctx.db.get(conversationId);
  if (conversation === null) {
    return { projected: false, reason: "missing" as const };
  }
  if (conversation.service === "playground") {
    return { projected: false, reason: "playground" as const };
  }
  const customer =
    conversation.customerId === undefined
      ? null
      : await ctx.db.get(conversation.customerId);
  const stateRow = await loadOrCreateProjectionState(ctx, conversation);
  const nextState = applyConversationTransitions(stateRow, {
    converted: hasConvertedTag(conversation.tags),
    dropped: customer?.leadTemperature === "Cold",
    now: observedAt,
  });
  const stateChanged =
    stateRow.convertedAt !== nextState.convertedAt ||
    stateRow.droppedAt !== nextState.droppedAt;
  const state = stateChanged
    ? { ...nextState, updatedAt: observedAt }
    : nextState;
  if (stateChanged) {
    await replaceProjectionState(ctx, stateRow._id, state);
  }
  const contributions = buildConversationMetricContributions({
    conversation,
    customer,
    state,
  });
  await reconcileMetricContributions(
    ctx,
    contributions.desired,
    contributions.sourceKeys,
  );
  return {
    projected: true,
    metricEntries: contributions.desired.length,
  };
}

export const run = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    observedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) =>
    await reconcileConversationAnalytics(
      ctx,
      args.conversationId,
      args.observedAt,
    ),
});
