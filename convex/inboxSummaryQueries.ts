import type { PaginationOptions } from "convex/server";
import type { QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getAuthContext } from "./authUtils";
import { escalatedInboxQuery } from "./inboxEscalationQuery";
import { withInboxHandling } from "./inboxHandling";

type Args = {
  agentId?: Id<"agents">;
  escalatedOnly?: boolean;
  paginationOpts: PaginationOptions;
};
async function paginateInboxSummaries(ctx: QueryCtx, args: Args) {
  const { orgId, userId } = await getAuthContext(ctx);
  if (args.escalatedOnly) {
    return await escalatedInboxQuery(ctx, orgId, userId, args.agentId)
      .order("desc")
      .paginate(args.paginationOpts);
  }
  const isPersonal = !orgId || orgId === "personal";
  if (isPersonal && args.agentId !== undefined) {
    return await ctx.db
      .query("inboxConversationSummaries")
      .withIndex("by_userId_assignedAgentId_connected_lastMessageAt", (q) =>
        q
          .eq("userId", userId)
          .eq("assignedAgentId", args.agentId)
          .eq("isChannelConnected", true),
      )
      .order("desc")
      .paginate(args.paginationOpts);
  }
  if (isPersonal) {
    return await ctx.db
      .query("inboxConversationSummaries")
      .withIndex("by_userId_and_isChannelConnected_and_lastMessageAt", (q) =>
        q.eq("userId", userId).eq("isChannelConnected", true),
      )
      .order("desc")
      .paginate(args.paginationOpts);
  }
  if (args.agentId !== undefined) {
    return await ctx.db
      .query("inboxConversationSummaries")
      .withIndex("by_orgId_assignedAgentId_connected_lastMessageAt", (q) =>
        q
          .eq("orgId", orgId)
          .eq("assignedAgentId", args.agentId)
          .eq("isChannelConnected", true),
      )
      .order("desc")
      .paginate(args.paginationOpts);
  }
  return await ctx.db
    .query("inboxConversationSummaries")
    .withIndex("by_orgId_and_isChannelConnected_and_lastMessageAt", (q) =>
      q.eq("orgId", orgId).eq("isChannelConnected", true),
    )
    .order("desc")
    .paginate(args.paginationOpts);
}

export async function listInboxSummaries(ctx: QueryCtx, args: Args) {
  const result = await paginateInboxSummaries(ctx, args);
  return {
    ...result,
    page: await Promise.all(
      result.page.map((summary) => withInboxHandling(ctx, summary)),
    ),
  };
}
