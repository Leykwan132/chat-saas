import { v } from "convex/values";
import { query, internalQuery } from "../_generated/server";
import { internalMutation } from "../triggers";
import { components } from "../_generated/api";
import { listUIMessages, syncStreams, vStreamArgs } from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import { getAuthContext } from "../authUtils";

export { resetThread, sendMessage } from "./playgroundMessaging";
export { generatePlaygroundResponseAsync } from "./playgroundGeneration";

export const internalGetConversationByThreadId = internalQuery({
  args: { threadId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("conversations")
      .withIndex("by_threadId", (q) => q.eq("threadId", args.threadId))
      .first();
  },
});

export const internalPersistPlaygroundAiUsage = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    agentId: v.id("agents"),
    agentMessageId: v.string(),
    content: v.string(),
    llmModel: v.string(),
    creditsCharged: v.number(),
  },
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.conversationId);
    if (conv === null) return;

    const trimmed = args.content.trim();
    if (!trimmed) return;

    await ctx.db.insert("messages", {
      orgId: conv.orgId,
      conversationId: conv._id,
      service: conv.service,
      orgAddress: conv.orgAddress,
      contactAddress: conv.contactAddress,
      direction: "outgoing",
      agentId: args.agentId,
      contentType: "text",
      content: trimmed,
      agentMessageId: args.agentMessageId,
      llmModel: args.llmModel,
      creditsCharged: args.creditsCharged,
      status: "sent",
      createdAt: Date.now(),
    });
  },
});

export const getConversationByThreadId = query({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const { orgId } = await getAuthContext(ctx);
    const conv = await ctx.db
      .query("conversations")
      .withIndex("by_threadId", (q) => q.eq("threadId", args.threadId))
      .first();
    if (conv === null || conv.orgId !== orgId) return null;
    return conv;
  },
});

export const listThreadMessages = query({
  args: {
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
    streamArgs: vStreamArgs,
  },
  handler: async (ctx, args) => {
    const { orgId } = await getAuthContext(ctx);
    const conv = await ctx.db
      .query("conversations")
      .withIndex("by_threadId", (q) => q.eq("threadId", args.threadId))
      .first();
    if (conv === null || conv.orgId !== orgId) {
      return {
        page: [],
        isDone: true,
        continueCursor: "",
        streams: undefined,
      };
    }

    const paginated = await listUIMessages(ctx, components.agent, args);
    const streams = await syncStreams(ctx, components.agent, args);
    return { ...paginated, streams };
  },
});

export const getLatestPlaygroundThread = query({
  args: {
    agentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    const { userId, orgId } = await getAuthContext(ctx);
    if (!userId) return null;

    const conv = await ctx.db
      .query("conversations")
      .withIndex(
        "by_orgId_and_service_and_assignedAgentId_and_assignedUserId",
        (q) =>
          q
            .eq("orgId", orgId)
            .eq("service", "playground")
            .eq("assignedAgentId", args.agentId)
            .eq("assignedUserId", userId),
      )
      .filter((q) => q.eq(q.field("status"), "open"))
      .first();

    if (conv === null) return null;
    return {
      threadId: conv.threadId,
      conversationId: conv._id,
    };
  },
});
