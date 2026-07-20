import type { Doc } from "./_generated/dataModel";
import {
  channelAnalyticsNamespace,
  serviceAnalyticsNamespace,
  teamAnalyticsNamespace,
  v2ConversationSourceKey,
} from "./analyticsMetricModel";
import type { AnalyticsMetricContribution } from "./analyticsMetricContributions";
import type { ConversationAnalyticsProjectionState } from "./analyticsProjectionStateModel";
import { buildMemberMetricContributions } from "./analyticsConversationMemberContributions";

const CONVERSATION_SOURCE_ROLES = [
  "team:conversationCount",
  "team:activeConversationCount",
  "team:convertedCount",
  "team:conversionDurationMs",
  "team:droppedCount",
  "team:firstReplyCount",
  "team:firstReplyDurationMs",
  "service:conversationCount",
  "service:convertedCount",
  "channel:conversationCount",
  "channel:convertedCount",
  "member:assignedConversationCount",
  "member:avgMessagesPerConversationDenominator",
  "member:activeConversationCount",
  "member:convertedCount",
  "member:conversionDurationMs",
  "member:droppedCount",
  "member:firstHumanReplyCount",
  "member:firstHumanReplyDurationMs",
] as const;

type ConversationSourceRole = (typeof CONVERSATION_SOURCE_ROLES)[number];

type ContributionInput = {
  conversation: Doc<"conversations">;
  role: ConversationSourceRole;
  metric: AnalyticsMetricContribution["metric"];
  namespace: string;
  sortKey: number;
  value: number;
  memberUserId?: string;
  sourceMessageId?: AnalyticsMetricContribution["sourceMessageId"];
};

function contribution(input: ContributionInput): AnalyticsMetricContribution {
  return {
    namespace: input.namespace,
    sortKey: input.sortKey,
    value: input.value,
    metric: input.metric,
    orgId: input.conversation.orgId,
    memberUserId: input.memberUserId,
    service: input.conversation.service,
    channelId: input.conversation.channelId,
    sourceConversationId: input.conversation._id,
    sourceMessageId: input.sourceMessageId,
    sourceKey: v2ConversationSourceKey(
      input.conversation._id,
      input.role,
    ),
  };
}

export function buildConversationMetricContributions(input: {
  conversation: Doc<"conversations">;
  customer: Doc<"customers"> | null;
  state: ConversationAnalyticsProjectionState;
}): {
  desired: AnalyticsMetricContribution[];
  sourceKeys: string[];
} {
  const { conversation, state } = input;
  const desired: AnalyticsMetricContribution[] = [];
  const startedAt =
    state.firstCustomerMessageAt ?? conversation.createdAt;
  const conversionDuration =
    state.convertedAt === undefined
      ? undefined
      : Math.max(0, state.convertedAt - startedAt);
  const firstReplyDuration =
    state.firstCustomerMessageAt === undefined ||
    state.firstOutgoingAt === undefined
      ? undefined
      : Math.max(
          0,
          state.firstOutgoingAt - state.firstCustomerMessageAt,
        );
  const firstHumanReplyDuration =
    state.firstCustomerMessageAt === undefined ||
    state.firstHumanOutgoingAt === undefined
      ? undefined
      : Math.max(
          0,
          state.firstHumanOutgoingAt - state.firstCustomerMessageAt,
        );
  const add = (
    role: ConversationSourceRole,
    metric: AnalyticsMetricContribution["metric"],
    namespace: string,
    sortKey: number,
    value: number,
    memberUserId?: string,
    sourceMessageId?: AnalyticsMetricContribution["sourceMessageId"],
  ) => {
    desired.push(
      contribution({
        conversation,
        role,
        metric,
        namespace,
        sortKey,
        value,
        memberUserId,
        sourceMessageId,
      }),
    );
  };

  add(
    "team:conversationCount",
    "conversationCount",
    teamAnalyticsNamespace("v2", conversation.orgId, "conversationCount"),
    startedAt,
    1,
  );
  if (conversation.status !== "closed") {
    add(
      "team:activeConversationCount",
      "activeConversationCount",
      teamAnalyticsNamespace(
        "v2",
        conversation.orgId,
        "activeConversationCount",
      ),
      conversation.lastMessageAt,
      1,
    );
  }
  if (state.convertedAt !== undefined && conversionDuration !== undefined) {
    add(
      "team:convertedCount",
      "convertedCount",
      teamAnalyticsNamespace("v2", conversation.orgId, "convertedCount"),
      startedAt,
      1,
    );
    add(
      "team:conversionDurationMs",
      "conversionDurationMs",
      teamAnalyticsNamespace(
        "v2",
        conversation.orgId,
        "conversionDurationMs",
      ),
      startedAt,
      conversionDuration,
    );
  }
  if (state.droppedAt !== undefined) {
    add(
      "team:droppedCount",
      "droppedCount",
      teamAnalyticsNamespace("v2", conversation.orgId, "droppedCount"),
      startedAt,
      1,
    );
  }
  if (
    state.firstOutgoingAt !== undefined &&
    firstReplyDuration !== undefined
  ) {
    add(
      "team:firstReplyCount",
      "firstReplyCount",
      teamAnalyticsNamespace("v2", conversation.orgId, "firstReplyCount"),
      state.firstOutgoingAt,
      1,
    );
    add(
      "team:firstReplyDurationMs",
      "firstReplyDurationMs",
      teamAnalyticsNamespace(
        "v2",
        conversation.orgId,
        "firstReplyDurationMs",
      ),
      state.firstOutgoingAt,
      firstReplyDuration,
    );
  }

  add(
    "service:conversationCount",
    "channelConversationCount",
    serviceAnalyticsNamespace(
      "v2",
      conversation.orgId,
      conversation.service,
      "channelConversationCount",
    ),
    startedAt,
    1,
  );
  if (state.convertedAt !== undefined) {
    add(
      "service:convertedCount",
      "channelConvertedCount",
      serviceAnalyticsNamespace(
        "v2",
        conversation.orgId,
        conversation.service,
        "channelConvertedCount",
      ),
      startedAt,
      1,
    );
  }
  if (conversation.channelId !== undefined) {
    add(
      "channel:conversationCount",
      "channelConversationCount",
      channelAnalyticsNamespace(
        "v2",
        conversation.orgId,
        conversation.channelId,
        "channelConversationCount",
      ),
      startedAt,
      1,
    );
    if (state.convertedAt !== undefined) {
      add(
        "channel:convertedCount",
        "channelConvertedCount",
        channelAnalyticsNamespace(
          "v2",
          conversation.orgId,
          conversation.channelId,
          "channelConvertedCount",
        ),
        startedAt,
        1,
      );
    }
  }

  desired.push(
    ...buildMemberMetricContributions({
      conversation,
      state,
      startedAt,
      conversionDuration,
      firstHumanReplyDuration,
    }),
  );

  return {
    desired,
    sourceKeys: CONVERSATION_SOURCE_ROLES.map((role) =>
      v2ConversationSourceKey(conversation._id, role),
    ),
  };
}
