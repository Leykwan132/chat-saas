import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import type { ConversationAnalyticsProjectionState } from "./analyticsProjectionStateModel";

function projectionStateFields(
  state: ConversationAnalyticsProjectionState,
) {
  return {
    conversationId: state.conversationId,
    firstCustomerMessageAt: state.firstCustomerMessageAt,
    firstOutgoingAt: state.firstOutgoingAt,
    firstHumanOutgoingAt: state.firstHumanOutgoingAt,
    firstHumanMessageId: state.firstHumanMessageId,
    firstHumanMemberUserId: state.firstHumanMemberUserId,
    convertedAt: state.convertedAt,
    droppedAt: state.droppedAt,
    createdAt: state.createdAt,
    updatedAt: state.updatedAt,
  };
}

export async function loadOrCreateProjectionState(
  ctx: MutationCtx,
  conversation: Doc<"conversations">,
): Promise<Doc<"conversationAnalyticsProjectionStates">> {
  const existing = await ctx.db
    .query("conversationAnalyticsProjectionStates")
    .withIndex("by_conversationId", (query) =>
      query.eq("conversationId", conversation._id),
    )
    .unique();
  if (existing !== null) return existing;

  const now = Date.now();
  const stateId = await ctx.db.insert(
    "conversationAnalyticsProjectionStates",
    {
      conversationId: conversation._id,
      createdAt: now,
      updatedAt: now,
    },
  );
  const state = await ctx.db.get(stateId);
  if (state === null) {
    throw new Error(
      `Projection state ${stateId} was not persisted`,
    );
  }
  return state;
}

export async function replaceProjectionState(
  ctx: MutationCtx,
  stateId: Id<"conversationAnalyticsProjectionStates">,
  state: ConversationAnalyticsProjectionState,
): Promise<void> {
  await ctx.db.replace(stateId, projectionStateFields(state));
}
