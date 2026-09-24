import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { query, type QueryCtx } from "./_generated/server";
import { getAuthContext } from "./authUtils";

async function assertScopedAgent(
  ctx: QueryCtx,
  agentId: Id<"agents">,
  orgId: string,
  userId: string,
) {
  const agent = await ctx.db.get(agentId);
  const isPersonal = !orgId || orgId === "personal";
  if (
    agent === null ||
    agent.orgId !== orgId ||
    (isPersonal && agent.userId !== userId)
  ) {
    throw new Error("Agent not found");
  }
}

function matchesCurrentScope(
  summary: Doc<"inboxConversationSummaries">,
  orgId: string,
  userId: string,
  agentId: Id<"agents">,
) {
  const isPersonal = !orgId || orgId === "personal";
  return (
    summary.isChannelConnected &&
    summary.assignedAgentId === agentId &&
    (isPersonal ? summary.userId === userId : summary.orgId === orgId)
  );
}

async function getScopedSummary(
  ctx: QueryCtx,
  conversationId: Id<"conversations">,
  orgId: string,
  userId: string,
  agentId: Id<"agents">,
) {
  const summary = await ctx.db
    .query("inboxConversationSummaries")
    .withIndex("by_conversationId", (q) => q.eq("conversationId", conversationId))
    .unique();
  return summary !== null && matchesCurrentScope(summary, orgId, userId, agentId)
    ? summary
    : null;
}

export const searchChatsForCurrentOrg = query({
  args: { agentId: v.id("agents"), searchQuery: v.string() },
  handler: async (ctx, args) => {
    const searchQuery = args.searchQuery.trim();
    if (searchQuery === "") return [];
    const { orgId, userId } = await getAuthContext(ctx);
    await assertScopedAgent(ctx, args.agentId, orgId, userId);
    const isPersonal = !orgId || orgId === "personal";
    const documents = await ctx.db
      .query("inboxChatSearchDocuments")
      .withSearchIndex("search_text", (q) => {
        const scoped = q.search("searchText", searchQuery);
        return isPersonal
          ? scoped
              .eq("userId", userId)
              .eq("assignedAgentId", args.agentId)
              .eq("isChannelConnected", true)
          : scoped
              .eq("orgId", orgId)
              .eq("assignedAgentId", args.agentId)
              .eq("isChannelConnected", true);
      })
      .take(5);
    const summaries = await Promise.all(
      documents.map((document) =>
        getScopedSummary(ctx, document.conversationId, orgId, userId, args.agentId),
      ),
    );
    return summaries.filter((summary): summary is Doc<"inboxConversationSummaries"> => summary !== null);
  },
});

export const searchMessagesForCurrentOrg = query({
  args: {
    agentId: v.id("agents"),
    searchQuery: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const searchQuery = args.searchQuery.trim();
    if (searchQuery === "") {
      return { page: [], isDone: true, continueCursor: "" };
    }
    const { orgId, userId } = await getAuthContext(ctx);
    await assertScopedAgent(ctx, args.agentId, orgId, userId);
    const isPersonal = !orgId || orgId === "personal";
    const result = await ctx.db
      .query("inboxMessageSearchDocuments")
      .withSearchIndex("search_content", (q) => {
        const scoped = q.search("content", searchQuery);
        return isPersonal
          ? scoped
              .eq("userId", userId)
              .eq("assignedAgentId", args.agentId)
              .eq("isChannelConnected", true)
          : scoped
              .eq("orgId", orgId)
              .eq("assignedAgentId", args.agentId)
              .eq("isChannelConnected", true);
      })
      .paginate(args.paginationOpts);
    const rows = await Promise.all(
      result.page.map(async (document) => {
        const summary = await getScopedSummary(
          ctx,
          document.conversationId,
          orgId,
          userId,
          args.agentId,
        );
        return summary === null
          ? null
          : {
              ...summary,
              matchedMessageId: document.messageId,
              matchedMessage: document.content,
              matchedMessageAt: document.createdAt,
            };
      }),
    );
    return { ...result, page: rows.filter((row) => row !== null) };
  },
});
