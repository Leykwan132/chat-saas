import type { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

export function escalatedInboxQuery(
  ctx: QueryCtx,
  orgId: string,
  userId: string,
  agentId?: Id<"agents">,
) {
  const summaries = ctx.db.query("inboxConversationSummaries");
  if (!orgId || orgId === "personal") {
    if (agentId !== undefined) {
      return summaries.withIndex("by_userId_orgId_assignedAgentId_connected_status_lastMessageAt", (q) =>
        q.eq("userId", userId).eq("orgId", orgId).eq("assignedAgentId", agentId)
          .eq("isChannelConnected", true).eq("status", "requires_user_input"));
    }
    return summaries.withIndex("by_userId_orgId_connected_status_lastMessageAt", (q) =>
      q.eq("userId", userId).eq("orgId", orgId).eq("isChannelConnected", true).eq("status", "requires_user_input"));
  }
  if (agentId !== undefined) {
    return summaries.withIndex("by_orgId_assignedAgentId_connected_status_lastMessageAt", (q) =>
      q.eq("orgId", orgId).eq("assignedAgentId", agentId)
        .eq("isChannelConnected", true).eq("status", "requires_user_input"));
  }
  return summaries.withIndex("by_orgId_connected_status_lastMessageAt", (q) =>
    q.eq("orgId", orgId).eq("isChannelConnected", true).eq("status", "requires_user_input"));
}
