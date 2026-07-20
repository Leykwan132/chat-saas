import type { Doc } from "./_generated/dataModel";
import {
  memberAnalyticsNamespace,
  v2ConversationSourceKey,
} from "./analyticsMetricModel";
import type { AnalyticsMetricContribution } from "./analyticsMetricContributions";
import type { ConversationAnalyticsProjectionState } from "./analyticsProjectionStateModel";

function memberContribution(
  conversation: Doc<"conversations">,
  role: string,
  metric: AnalyticsMetricContribution["metric"],
  memberUserId: string,
  sortKey: number,
  value: number,
  sourceMessageId?: AnalyticsMetricContribution["sourceMessageId"],
): AnalyticsMetricContribution {
  return {
    namespace: memberAnalyticsNamespace(
      "v2",
      conversation.orgId,
      memberUserId,
      metric,
    ),
    sortKey,
    value,
    metric,
    orgId: conversation.orgId,
    memberUserId,
    service: conversation.service,
    channelId: conversation.channelId,
    sourceConversationId: conversation._id,
    sourceMessageId,
    sourceKey: v2ConversationSourceKey(conversation._id, role),
  };
}

export function buildMemberMetricContributions(input: {
  conversation: Doc<"conversations">;
  state: ConversationAnalyticsProjectionState;
  startedAt: number;
  conversionDuration?: number;
  firstHumanReplyDuration?: number;
}): AnalyticsMetricContribution[] {
  const {
    conversation,
    state,
    startedAt,
    conversionDuration,
    firstHumanReplyDuration,
  } = input;
  const desired: AnalyticsMetricContribution[] = [];
  const assignedUserId = conversation.assignedUserId;
  if (assignedUserId !== undefined) {
    desired.push(
      memberContribution(
        conversation,
        "member:assignedConversationCount",
        "assignedConversationCount",
        assignedUserId,
        startedAt,
        1,
      ),
      memberContribution(
        conversation,
        "member:avgMessagesPerConversationDenominator",
        "avgMessagesPerConversationDenominator",
        assignedUserId,
        startedAt,
        1,
      ),
    );
    if (conversation.status !== "closed") {
      desired.push(
        memberContribution(
          conversation,
          "member:activeConversationCount",
          "activeConversationCount",
          assignedUserId,
          conversation.lastMessageAt,
          1,
        ),
      );
    }
    if (state.convertedAt !== undefined && conversionDuration !== undefined) {
      desired.push(
        memberContribution(
          conversation,
          "member:convertedCount",
          "convertedCount",
          assignedUserId,
          startedAt,
          1,
        ),
        memberContribution(
          conversation,
          "member:conversionDurationMs",
          "conversionDurationMs",
          assignedUserId,
          startedAt,
          conversionDuration,
        ),
      );
    }
    if (state.droppedAt !== undefined) {
      desired.push(
        memberContribution(
          conversation,
          "member:droppedCount",
          "droppedCount",
          assignedUserId,
          startedAt,
          1,
        ),
      );
    }
  }
  if (
    state.firstHumanOutgoingAt !== undefined &&
    state.firstHumanMessageId !== undefined &&
    state.firstHumanMemberUserId !== undefined &&
    firstHumanReplyDuration !== undefined
  ) {
    desired.push(
      memberContribution(
        conversation,
        "member:firstHumanReplyCount",
        "firstHumanReplyCount",
        state.firstHumanMemberUserId,
        state.firstHumanOutgoingAt,
        1,
        state.firstHumanMessageId,
      ),
      memberContribution(
        conversation,
        "member:firstHumanReplyDurationMs",
        "firstHumanReplyDurationMs",
        state.firstHumanMemberUserId,
        state.firstHumanOutgoingAt,
        firstHumanReplyDuration,
        state.firstHumanMessageId,
      ),
    );
  }
  return desired;
}
