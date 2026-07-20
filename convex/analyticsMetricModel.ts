import type { Doc, Id } from "./_generated/dataModel";

export type AnalyticsMetric = Doc<"analyticsMetricEntries">["metric"];
export type ConversationService = Doc<"conversations">["service"];
export type AnalyticsMetricVersion = "v1" | "v2";

export const V2_SOURCE_PREFIX = "v2:";

function namespacePrefix(version: AnalyticsMetricVersion): string {
  return version === "v2" ? V2_SOURCE_PREFIX : "";
}

export function teamAnalyticsNamespace(
  version: AnalyticsMetricVersion,
  orgId: string,
  metric: AnalyticsMetric,
): string {
  return `${namespacePrefix(version)}team:${orgId}:metric:${metric}`;
}

export function memberAnalyticsNamespace(
  version: AnalyticsMetricVersion,
  orgId: string,
  memberUserId: string,
  metric: AnalyticsMetric,
): string {
  return `${namespacePrefix(version)}member:${orgId}:${memberUserId}:metric:${metric}`;
}

export function serviceAnalyticsNamespace(
  version: AnalyticsMetricVersion,
  orgId: string,
  service: ConversationService,
  metric: AnalyticsMetric,
): string {
  return `${namespacePrefix(version)}channel:${orgId}:service:${service}:metric:${metric}`;
}

export function channelAnalyticsNamespace(
  version: AnalyticsMetricVersion,
  orgId: string,
  channelId: Id<"channels"> | string,
  metric: AnalyticsMetric,
): string {
  return `${namespacePrefix(version)}channel:${orgId}:id:${channelId}:metric:${metric}`;
}

export function topicAnalyticsNamespace(
  version: AnalyticsMetricVersion,
  orgId: string,
  topicId: Id<"conversationTopics"> | string,
): string {
  return `${namespacePrefix(version)}topic:${orgId}:${topicId}:metric:topicMentionCount`;
}

export function v2ConversationSourceKey(
  conversationId: Id<"conversations"> | string,
  role: string,
): string {
  return `${V2_SOURCE_PREFIX}conversation:${conversationId}:${role}`;
}

export function v2MessageSourceKey(
  messageId: Id<"messages"> | string,
  role: string,
): string {
  return `${V2_SOURCE_PREFIX}message:${messageId}:${role}`;
}
