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

async function legacyFirstHumanIdentity(
  ctx: MutationCtx,
  conversationId: Id<"conversations">,
  firstHumanOutgoingAt: number | undefined,
) {
  if (firstHumanOutgoingAt === undefined) {
    return {
      firstHumanMessageId: undefined,
      firstHumanMemberUserId: undefined,
    };
  }
  const messages = await ctx.db
    .query("messages")
    .withIndex("by_conversationId_and_createdAt", (query) =>
      query
        .eq("conversationId", conversationId)
        .eq("createdAt", firstHumanOutgoingAt),
    )
    .take(10);
  const firstHumanMessage = messages
    .filter(
      (message) =>
        message.direction === "outgoing" &&
        message.authorUserId !== undefined,
    )
    .sort((left, right) => left._id.localeCompare(right._id))[0];
  if (firstHumanMessage?.authorUserId === undefined) {
    throw new Error(
      `Missing first human message for conversation ${conversationId}`,
    );
  }
  return {
    firstHumanMessageId: firstHumanMessage._id,
    firstHumanMemberUserId: firstHumanMessage.authorUserId,
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

  const legacyFact = await ctx.db
    .query("conversationAnalyticsFacts")
    .withIndex("by_conversationId", (query) =>
      query.eq("conversationId", conversation._id),
    )
    .unique();
  const firstHumanIdentity = await legacyFirstHumanIdentity(
    ctx,
    conversation._id,
    legacyFact?.firstHumanOutgoingAt,
  );
  const now = Date.now();
  const stateId = await ctx.db.insert(
    "conversationAnalyticsProjectionStates",
    {
      conversationId: conversation._id,
      firstCustomerMessageAt: legacyFact?.firstCustomerMessageAt,
      firstOutgoingAt: legacyFact?.firstOutgoingAt,
      firstHumanOutgoingAt: legacyFact?.firstHumanOutgoingAt,
      ...firstHumanIdentity,
      convertedAt: legacyFact?.convertedAt,
      droppedAt: legacyFact?.droppedAt,
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
