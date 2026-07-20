import type { Doc, Id } from "./_generated/dataModel";

export type ConversationAnalyticsProjectionState = {
  conversationId: Id<"conversations">;
  firstCustomerMessageAt?: number;
  firstOutgoingAt?: number;
  firstHumanOutgoingAt?: number;
  firstHumanMessageId?: Id<"messages">;
  firstHumanMemberUserId?: string;
  convertedAt?: number;
  droppedAt?: number;
  createdAt: number;
  updatedAt: number;
};

function minimumTime(
  current: number | undefined,
  candidate: number,
): number {
  return current === undefined ? candidate : Math.min(current, candidate);
}

function shouldReplaceHumanReply(
  state: ConversationAnalyticsProjectionState,
  message: Pick<Doc<"messages">, "_id" | "createdAt">,
): boolean {
  if (state.firstHumanOutgoingAt === undefined) return true;
  if (message.createdAt < state.firstHumanOutgoingAt) return true;
  if (message.createdAt > state.firstHumanOutgoingAt) return false;
  if (state.firstHumanMessageId === undefined) return true;
  return message._id < state.firstHumanMessageId;
}

export function applyMessageToProjectionState(
  state: ConversationAnalyticsProjectionState,
  message: Pick<
    Doc<"messages">,
    "_id" | "direction" | "createdAt" | "authorUserId"
  >,
): ConversationAnalyticsProjectionState {
  if (message.direction === "incoming") {
    return {
      ...state,
      firstCustomerMessageAt: minimumTime(
        state.firstCustomerMessageAt,
        message.createdAt,
      ),
    };
  }
  if (
    state.firstCustomerMessageAt === undefined ||
    message.createdAt < state.firstCustomerMessageAt
  ) {
    return state;
  }

  const nextState = {
    ...state,
    firstOutgoingAt: minimumTime(
      state.firstOutgoingAt,
      message.createdAt,
    ),
  };
  if (
    message.authorUserId === undefined ||
    !shouldReplaceHumanReply(state, message)
  ) {
    return nextState;
  }
  return {
    ...nextState,
    firstHumanOutgoingAt: message.createdAt,
    firstHumanMessageId: message._id,
    firstHumanMemberUserId: message.authorUserId,
  };
}

export function applyConversationTransitions(
  state: ConversationAnalyticsProjectionState,
  input: { converted: boolean; dropped: boolean; now: number },
): ConversationAnalyticsProjectionState {
  return {
    ...state,
    convertedAt: input.converted
      ? state.convertedAt ?? input.now
      : undefined,
    droppedAt: input.dropped
      ? state.droppedAt ?? input.now
      : undefined,
  };
}
