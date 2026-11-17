import { listMessages } from "@convex-dev/agent";
import { v, ConvexError } from "convex/values";
import { internalQuery } from "../_generated/server";
import { components } from "../_generated/api";
import {
  operationSchema,
  type IntegrationResult,
  type ConversationSummaryItem,
} from "../../shared/integrations/contracts";
import { principalValidator, operationValidator } from "./schema";
import { getAgentSnapshot } from "./snapshot";
import { resolveIntegrationAccess } from "./access";
import {
  personalWorkspace,
  canReadWorkspaceRecord,
  canReadWorkspaceChannel,
  discoverWorkspaceAgents,
} from "./workspaces";

export const executeRead = internalQuery({
  args: { principal: principalValidator, operation: operationValidator },
  returns: v.string(),
  handler: async (ctx, args) => {
    const operation = operationSchema.parse(args.operation);
    const { team, user } = await resolveIntegrationAccess(ctx, args.principal);
    const personal = await personalWorkspace(ctx, user);
    const subject = args.principal.subject;
    let orgId = args.principal.orgId;
    let workspace = { id: orgId, name: team.name.slice(0, 200) };
    let result: IntegrationResult;
    if (operation.operation === "get_agent_snapshot") {
      result = await getAgentSnapshot(
        ctx,
        operation.agentId,
        subject,
        orgId,
        team,
        personal,
      );
    } else if (operation.operation === "get_connection_context") {
      const page = await discoverWorkspaceAgents(
        ctx,
        team,
        personal,
        subject,
        orgId,
        operation.agentLimit,
        operation.agentCursor,
      );
      result = {
        operation: operation.operation,
        workspace: {
          ...workspace,
          name: personal
            ? `${team.name.slice(0, 180)} + Personal`
            : workspace.name,
        },
        ...page,
      };
    } else if (operation.operation === "search_conversations") {
      const agentId = ctx.db.normalizeId("agents", operation.agentId);
      const agent = agentId ? await ctx.db.get(agentId) : null;
      if (!agent || !canReadWorkspaceRecord(agent, orgId, subject, personal))
        throw new ConvexError("NOT_FOUND");
      orgId = agent.orgId!;
      workspace = {
        id: orgId || personal!._id,
        name: orgId ? team.name.slice(0, 200) : "Personal",
      };
      const page = await ctx.db
        .query("inboxChatSearchDocuments")
        .withSearchIndex("search_text", (q) => {
          const search = q
            .search("searchText", operation.query)
            .eq("orgId", orgId)
            .eq("assignedAgentId", agentId!)
            .eq("isChannelConnected", true);
          return orgId === "" ? search.eq("userId", subject) : search;
        })
        .paginate({
          numItems: operation.limit,
          cursor: operation.cursor ?? null,
        });
      const items: ConversationSummaryItem[] = [];
      for (const document of page.page) {
        const summary = await ctx.db
          .query("inboxConversationSummaries")
          .withIndex("by_conversationId", (q) =>
            q.eq("conversationId", document.conversationId),
          )
          .unique();
        if (
          !summary ||
          summary.orgId !== orgId ||
          (orgId === "" && summary.userId !== subject) ||
          summary.assignedAgentId !== agentId ||
          !summary.isChannelConnected
        )
          continue;
        const conversation = await ctx.db.get(summary.conversationId);
        const channel = conversation?.channelId
          ? await ctx.db.get(conversation.channelId)
          : null;
        if (
          !conversation ||
          conversation.orgId !== orgId ||
          (orgId === "" && conversation.userId !== subject) ||
          conversation.assignedAgentId !== agentId ||
          !channel ||
          !canReadWorkspaceChannel(channel, orgId, subject)
        )
          continue;
        items.push({
          conversationId: summary.conversationId,
          contactName: (summary.contactName ?? "").slice(0, 200),
          preview: (summary.lastMessagePreview ?? "").slice(0, 400),
          status: summary.status,
          lastMessageAt: summary.lastMessageAt,
          escalated: summary.isEscalated,
        });
      }
      result = {
        operation: operation.operation,
        workspace,
        items,
        nextCursor: page.isDone ? null : page.continueCursor,
      };
    } else {
      const id = ctx.db.normalizeId("conversations", operation.conversationId);
      const conversation = id ? await ctx.db.get(id) : null;
      if (
        !conversation ||
        !canReadWorkspaceRecord(conversation, orgId, subject, personal) ||
        !conversation.channelId
      )
        throw new ConvexError("NOT_FOUND");
      orgId = conversation.orgId;
      workspace = {
        id: orgId || personal!._id,
        name: orgId ? team.name.slice(0, 200) : "Personal",
      };
      const channel = await ctx.db.get(conversation.channelId);
      if (!channel || !canReadWorkspaceChannel(channel, orgId, subject))
        throw new ConvexError("NOT_FOUND");
      const page = await listMessages(ctx, components.agent, {
        threadId: conversation.threadId,
        paginationOpts: {
          numItems: operation.limit,
          cursor: operation.cursor ?? null,
        },
        excludeToolMessages: true,
        statuses: ["success"],
      });
      result = {
        operation: operation.operation,
        workspace,
        nextCursor: page.isDone ? null : page.continueCursor,
        items: page.page.flatMap((message) => {
          const role = message.message?.role;
          if (role !== "user" && role !== "assistant") return [];
          const content = message.message?.content;
          const text =
            typeof content === "string"
              ? content
              : Array.isArray(content)
                ? content
                    .flatMap((part) =>
                      part.type === "text" ? [part.text] : [],
                    )
                    .join("\n")
                : "";
          return [
            {
              id: message._id,
              sender: role,
              timestamp: message._creationTime,
              text: text.slice(0, 400),
              truncated: text.length > 400,
              hasNonTextContent:
                Array.isArray(content) &&
                content.some((part) => part.type !== "text"),
            },
          ];
        }),
      };
    }
    return JSON.stringify(result);
  },
});
