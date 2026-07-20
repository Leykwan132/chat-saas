import { expect, test } from "vitest";
import {
  channelAnalyticsNamespace,
  memberAnalyticsNamespace,
  serviceAnalyticsNamespace,
  teamAnalyticsNamespace,
  topicAnalyticsNamespace,
  v2ConversationSourceKey,
  v2MessageSourceKey,
} from "./analyticsMetricModel";

test("v1 namespaces preserve the current dashboard keys", () => {
  expect(teamAnalyticsNamespace("v1", "org-1", "conversationCount")).toBe(
    "team:org-1:metric:conversationCount",
  );
  expect(
    memberAnalyticsNamespace("v1", "org-1", "user-1", "messageSentCount"),
  ).toBe("member:org-1:user-1:metric:messageSentCount");
  expect(
    serviceAnalyticsNamespace(
      "v1",
      "org-1",
      "whatsapp",
      "channelConversationCount",
    ),
  ).toBe("channel:org-1:service:whatsapp:metric:channelConversationCount");
  expect(
    channelAnalyticsNamespace(
      "v1",
      "org-1",
      "channel-1",
      "channelConvertedCount",
    ),
  ).toBe("channel:org-1:id:channel-1:metric:channelConvertedCount");
  expect(topicAnalyticsNamespace("v1", "org-1", "topic-1")).toBe(
    "topic:org-1:topic-1:metric:topicMentionCount",
  );
});

test("v2 namespaces are isolated and source keys omit mutable dimensions", () => {
  expect(teamAnalyticsNamespace("v2", "org-1", "conversationCount")).toBe(
    "v2:team:org-1:metric:conversationCount",
  );
  expect(
    v2ConversationSourceKey("conversation-1", "member:convertedCount"),
  ).toBe("v2:conversation:conversation-1:member:convertedCount");
  expect(v2MessageSourceKey("message-1", "member:messageSentCount")).toBe(
    "v2:message:message-1:member:messageSentCount",
  );
});
