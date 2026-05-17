import { v } from "convex/values";
import {
  query,
  internalMutation,
  internalAction,
  internalQuery,
} from "../_generated/server";
import { internal } from "../_generated/api";
import { components } from "../_generated/api";
import { syncStreams, vStreamArgs } from "@convex-dev/agent";
import { messageDocsToInboxUIMessages, listMessages } from "./inboxMessageMapping";
import { paginationOptsValidator } from "convex/server";
import { getAuthContext } from "../authUtils";
import {
  ingestChannelMessage,
  ingestChannelMessageArgs,
  saveHumanReply,
  buildAgent,
  saveAiReply,
} from "./threads";
import { formatChannelSendError } from "./channelSend";
import { inboxAiReplyPool } from "../inboxPools";

export const internalIngestChannelMessage = internalMutation({
  args: ingestChannelMessageArgs,
  handler: async (ctx, args) => {
    const result = await ingestChannelMessage(ctx, args);
    if (result.skipped || !result.shouldEnqueueAi) {
      return result;
    }

    const conv = await ctx.db.get(result.conversationId);
    if (
      conv === null ||
      !conv.assignToAiAgent ||
      !conv.assignedAgentId
    ) {
      return result;
    }

    await inboxAiReplyPool.enqueueAction(
      ctx,
      internal.chat.inbox.generateAiReplyWorker,
      {
        conversationId: result.conversationId,
        promptContent: args.content.trim(),
      },
    );

    return result;
  },
});

export const internalPersistHumanReply = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    authorUserId: v.string(),
    externalId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.conversationId);
    if (conv === null) {
      throw new Error("Conversation not found");
    }
    if (conv.assignedAgentId === undefined) {
      throw new Error("Conversation has no assigned agent");
    }

    const trimmed = args.content.trim();
    const agentMessageId = await saveHumanReply(ctx, conv.threadId, trimmed, {
      assignedAgentId: conv.assignedAgentId,
      authorUserId: args.authorUserId,
    });

    const now = Date.now();
    await ctx.db.patch(conv._id, {
      lastMessageAt: now,
      lastMessagePreview: trimmed.slice(0, 140),
      unreadCount: 0,
      updatedAt: now,
    });

    return agentMessageId;
  },
});

export const internalPersistAiReply = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    threadId: v.string(),
    content: v.string(),
    externalId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.conversationId);
    if (conv === null) return null;

    const trimmed = args.content.trim();
    const agentMessageId = await saveAiReply(
      ctx,
      args.threadId,
      trimmed,
      conv.assignedAgentId,
    );
    const now = Date.now();

    await ctx.db.patch(conv._id, {
      lastMessageAt: now,
      lastMessagePreview: trimmed.slice(0, 140),
      unreadCount: 0,
      updatedAt: now,
    });

    return agentMessageId;
  },
});

export const generateAiReplyWorker = internalAction({
  args: {
    conversationId: v.id("conversations"),
    promptContent: v.string(),
  },
  handler: async (ctx, args) => {
    const conv = await ctx.runQuery(internal.chat.inbox.internalGetConversation, {
      conversationId: args.conversationId,
    });
    if (
      conv === null ||
      !conv.assignToAiAgent ||
      !conv.assignedAgentId
    ) {
      return;
    }

    const agent = await ctx.runQuery(internal.agents.internalGet, {
      agentId: conv.assignedAgentId,
    });
    if (!agent) return;

    const configuredAgent = buildAgent(agent, conv.assignedAgentId, false);
    const result = await configuredAgent.generateText(
      ctx,
      { threadId: conv.threadId },
      { prompt: args.promptContent },
    );

    const replyText = result.text.trim();
    if (!replyText) return;

    const sendResult = await ctx.runAction(
      internal.chat.inboxActions.internalSendText,
      {
        conversationId: conv._id,
        content: replyText,
        allowHumanAgentTag: false,
      },
    );

    if (!sendResult.ok) {
      console.error(
        "AI reply not sent to channel:",
        formatChannelSendError(sendResult),
        { conversationId: conv._id, service: conv.service },
      );
      return;
    }

    await ctx.runMutation(internal.chat.inbox.internalPersistAiReply, {
      conversationId: conv._id,
      threadId: conv.threadId,
      content: replyText,
      externalId: sendResult.externalId,
    });
  },
});

export const internalGetSendContext = internalQuery({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.conversationId);
    if (conv === null || !conv.channelId) return null;
    const channel = await ctx.db.get(conv.channelId);
    if (channel === null) return null;
    return { conversation: conv, channel };
  },
});

export const internalGetConversation = internalQuery({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.conversationId);
  },
});

export const listThreadMessagesForInbox = query({
  args: {
    threadId: v.string(),
    conversationId: v.id("conversations"),
    paginationOpts: paginationOptsValidator,
    streamArgs: vStreamArgs,
  },
  handler: async (ctx, args) => {
    const { orgId } = await getAuthContext(ctx);
    const conv = await ctx.db.get(args.conversationId);
    if (
      conv === null ||
      conv.orgId !== orgId ||
      conv.threadId !== args.threadId
    ) {
      return {
        page: [],
        isDone: true,
        continueCursor: "",
        streams: undefined,
      };
    }

    const paginated = await listMessages(ctx, components.agent, args);
    const streams = await syncStreams(ctx, components.agent, args);
    return {
      ...paginated,
      page: messageDocsToInboxUIMessages(paginated.page),
      streams,
    };
  },
});
