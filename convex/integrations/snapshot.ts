import { ConvexError } from "convex/values";
import type { QueryCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import type { IntegrationResult } from "../../shared/integrations/contracts";
import { inboxCountScope, sidebarCountPrefix } from "../inboxSidebarCountKeys";
import { canReadWorkspaceChannel, canReadWorkspaceRecord } from "./workspaces";

export async function getAgentSnapshot(
  ctx: QueryCtx,
  agentId: string,
  subject: string,
  organizationId: string,
  team: Doc<"teams">,
  personal: Doc<"teams"> | null,
): Promise<Extract<IntegrationResult, { operation: "get_agent_snapshot" }>> {
  const id = ctx.db.normalizeId("agents", agentId);
  const agent = id ? await ctx.db.get(id) : null;
  if (
    !agent ||
    !canReadWorkspaceRecord(agent, organizationId, subject, personal)
  )
    throw new ConvexError("NOT_FOUND");
  const ready = await ctx.db
    .query("inboxEscalationCounts")
    .withIndex("by_scopeKey", (q) =>
      q.eq("scopeKey", "snapshot-backfill-complete"),
    )
    .unique();
  if (!ready) throw new ConvexError("SNAPSHOT_NOT_READY");
  const orgId = agent.orgId!;
  const prefix = sidebarCountPrefix([
    ...inboxCountScope(orgId, subject),
    agent._id,
  ]);
  const readCount = async (metric: string, value = "") => {
    const counter = await ctx.db
      .query("inboxEscalationCounts")
      .withIndex("by_scopeKey", (q) =>
        q.eq("scopeKey", `${prefix}${JSON.stringify([metric, value])}`),
      )
      .unique();
    return counter?.count ?? 0;
  };
  const [
    totalChats,
    unreadChats,
    escalatedChats,
    unassignedChats,
    chatsWithBookings,
    whatsapp,
    instagram,
    messenger,
    web,
    avatar,
    open,
    snoozed,
    closed,
    booked,
    requiresUserInput,
  ] = await Promise.all([
    readCount("all"),
    readCount("unread"),
    readCount("escalated"),
    readCount("unassigned"),
    readCount("booking"),
    ...["whatsapp", "instagram", "messenger", "web", "avatar"].map((service) =>
      readCount("byPlatform", service),
    ),
    ...["open", "snoozed", "closed", "booked", "requires_user_input"].map(
      (status) => readCount("byStatus", status),
    ),
  ]);
  let unreadMessages = 0;
  const unreadPrefix = `${prefix}["unreadMessages",`;
  for await (const counter of ctx.db
    .query("inboxEscalationCounts")
    .withIndex("by_scopeKey", (q) =>
      q.gte("scopeKey", unreadPrefix).lt("scopeKey", `${unreadPrefix}\uffff`),
    )) {
    const [, messages] = JSON.parse(counter.scopeKey.slice(prefix.length)) as [
      string,
      string,
    ];
    unreadMessages += counter.count * Number(messages);
  }
  const recent = await (
    orgId === ""
      ? ctx.db
          .query("inboxConversationSummaries")
          .withIndex("by_userId_assignedAgentId_connected_lastMessageAt", (q) =>
            q
              .eq("userId", subject)
              .eq("assignedAgentId", agent._id)
              .eq("isChannelConnected", true),
          )
      : ctx.db
          .query("inboxConversationSummaries")
          .withIndex("by_orgId_assignedAgentId_connected_lastMessageAt", (q) =>
            q
              .eq("orgId", orgId)
              .eq("assignedAgentId", agent._id)
              .eq("isChannelConnected", true),
          )
  )
    .order("desc")
    .take(5);
  const items: Extract<
    IntegrationResult,
    { operation: "get_agent_snapshot" }
  >["items"] = [];
  for (const summary of recent) {
    if (summary.orgId !== orgId) continue;
    const conversation = await ctx.db.get(summary.conversationId);
    const channel = conversation?.channelId
      ? await ctx.db.get(conversation.channelId)
      : null;
    if (
      !conversation ||
      conversation.orgId !== orgId ||
      conversation.assignedAgentId !== agent._id ||
      !canReadWorkspaceRecord(
        conversation,
        organizationId,
        subject,
        personal,
      ) ||
      !channel ||
      !canReadWorkspaceChannel(channel, orgId, subject)
    )
      continue;
    items.push({
      conversationId: conversation._id,
      contactName: (summary.contactName ?? "").slice(0, 200),
      preview: (conversation.lastMessagePreview ?? "").slice(0, 400),
      status: conversation.status,
      lastMessageAt: conversation.lastMessageAt,
      escalated: conversation.status === "requires_user_input",
      service: summary.service,
    });
  }
  return {
    operation: "get_agent_snapshot",
    workspace: {
      id: orgId || personal!._id,
      name: orgId ? team.name.slice(0, 200) : "Personal",
    },
    nextCursor: null,
    snapshot: {
      agentId: agent._id,
      name: agent.name.slice(0, 200),
      capturedAt: Date.now(),
      scope: "connected_inbox_channels",
      totalChats,
      unreadChats,
      unreadMessages,
      escalatedChats,
      unassignedChats,
      chatsWithBookings,
      byPlatform: { whatsapp, instagram, messenger, web, avatar },
      byStatus: {
        open,
        snoozed,
        closed,
        booked,
        requires_user_input: requiresUserInput,
      },
      lastActivityAt: items[0]?.lastMessageAt ?? null,
    },
    items,
  };
}
