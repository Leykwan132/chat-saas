import type { Doc } from "./_generated/dataModel";

export function inboxCountScope(orgId: string, userId?: string) {
  return !orgId || orgId === "personal" ? ["user", userId, orgId] : ["org", orgId];
}

export function sidebarCountPrefix(scope: (string | undefined)[]) {
  return `${JSON.stringify(scope)}:sidebar:`;
}

export function sidebarCountKeys(summary: Doc<"inboxConversationSummaries"> | null) {
  if (!summary?.isChannelConnected) return [];
  const scope = inboxCountScope(summary.orgId, summary.userId);
  const metrics: [string, string][] = [["all", ""], ["byPlatform", summary.service]];
  if (summary.unreadCount > 0) metrics.push(["unread", ""]);
  if (summary.assignedUserId) metrics.push(["assigned", summary.assignedUserId]);
  else metrics.push(["unassigned", ""]);
  if (summary.hasBooking) metrics.push(["booking", ""]);
  if (summary.status === "requires_user_input") metrics.push(["escalated", ""]);
  if (summary.leadTemperature) metrics.push(["byLead", summary.leadTemperature]);
  for (const tag of new Set(summary.tags)) metrics.push(["byTag", tag]);
  return [scope, [...scope, summary.assignedAgentId]].flatMap((value) =>
    metrics.map((metric) => `${sidebarCountPrefix(value)}${JSON.stringify(metric)}`),
  );
}
