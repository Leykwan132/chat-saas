import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import {
  memberAnalyticsNamespace,
  v2MessageSourceKey,
} from "./analyticsMetricModel";
import { ensureMetricContribution } from "./analyticsMetricContributions";
import {
  loadOrCreateProjectionState,
  replaceProjectionState,
} from "./analyticsProjectionState";
import {
  applyMessageToProjectionState,
  type ConversationAnalyticsProjectionState,
} from "./analyticsProjectionStateModel";

export const MESSAGE_PROJECTION_PAGE_SIZE = 50;

export type MessageProjectionPageArgs = {
  conversationId: Id<"conversations">;
  earliestDirtyMessageAt: number;
  cursor: string | null;
};

export type MessageProjectionPageResult = {
  continueCursor: string;
  isDone: boolean;
  projectedMessages: number;
};

function projectionStateMatches(
  first: ConversationAnalyticsProjectionState,
  second: ConversationAnalyticsProjectionState,
) {
  return (
    first.firstCustomerMessageAt === second.firstCustomerMessageAt &&
    first.firstOutgoingAt === second.firstOutgoingAt &&
    first.firstHumanOutgoingAt === second.firstHumanOutgoingAt &&
    first.firstHumanMessageId === second.firstHumanMessageId &&
    first.firstHumanMemberUserId === second.firstHumanMemberUserId
  );
}

export async function projectConversationMessagePage(
  ctx: MutationCtx,
  args: MessageProjectionPageArgs,
): Promise<MessageProjectionPageResult> {
  const conversation = await ctx.db.get(args.conversationId);
  if (conversation === null || conversation.service === "playground") {
    return {
      continueCursor: args.cursor ?? "",
      isDone: true,
      projectedMessages: 0,
    };
  }
  const result = await ctx.db
    .query("messages")
    .withIndex("by_conversationId_and_createdAt", (query) =>
      query
        .eq("conversationId", args.conversationId)
        .gte("createdAt", args.earliestDirtyMessageAt),
    )
    .order("asc")
    .paginate({
      cursor: args.cursor,
      numItems: MESSAGE_PROJECTION_PAGE_SIZE,
    });
  const stateRow = await loadOrCreateProjectionState(ctx, conversation);
  let nextState: ConversationAnalyticsProjectionState = stateRow;
  for (const message of result.page) {
    nextState = applyMessageToProjectionState(nextState, message);
    if (
      message.direction === "outgoing" &&
      message.authorUserId !== undefined
    ) {
      await ensureMetricContribution(ctx, {
        namespace: memberAnalyticsNamespace(
          "v2",
          conversation.orgId,
          message.authorUserId,
          "messageSentCount",
        ),
        sortKey: message.createdAt,
        value: 1,
        metric: "messageSentCount",
        orgId: conversation.orgId,
        memberUserId: message.authorUserId,
        service: conversation.service,
        channelId: conversation.channelId,
        sourceConversationId: conversation._id,
        sourceMessageId: message._id,
        sourceKey: v2MessageSourceKey(
          message._id,
          "member:messageSentCount",
        ),
      });
    }
  }
  if (!projectionStateMatches(stateRow, nextState)) {
    await replaceProjectionState(ctx, stateRow._id, {
      ...nextState,
      updatedAt: Date.now(),
    });
  }
  return {
    continueCursor: result.continueCursor,
    isDone: result.isDone,
    projectedMessages: result.page.length,
  };
}
