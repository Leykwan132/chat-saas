"use node";

import { v } from "convex/values";
import { action, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { getAuthContext } from "../authUtils";
import {
  sendTextToChannel,
  formatChannelSendError,
  type ChannelSendResult,
} from "./channelSend";

export const sendReply = action({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
  },
  handler: async (ctx, args): Promise<{ agentMessageId: string }> => {
    const { orgId, userId } = await getAuthContext(ctx);
    const trimmed = args.content.trim();
    if (!trimmed) {
      throw new Error("Cannot send an empty message");
    }

    const ctxData = await ctx.runQuery(internal.chat.inbox.internalGetSendContext, {
      conversationId: args.conversationId,
    });
    if (ctxData === null || ctxData.conversation.orgId !== orgId) {
      throw new Error("Conversation not found");
    }

    const { conversation, channel } = ctxData;
    if (conversation.assignedAgentId === undefined) {
      throw new Error("Conversation has no assigned agent");
    }
    if (
      conversation.service !== "whatsapp" &&
      conversation.service !== "instagram" &&
      conversation.service !== "messenger"
    ) {
      throw new Error("Not a channel conversation");
    }

    const result = await sendTextToChannel(conversation, channel, trimmed, {
      allowHumanAgentTag: true,
    });

    if (!result.ok) {
      throw new Error(formatChannelSendError(result));
    }

    const agentMessageId: string = await ctx.runMutation(
      internal.chat.inbox.internalPersistHumanReply,
      {
        conversationId: args.conversationId,
        content: trimmed,
        authorUserId: userId,
        externalId: result.externalId,
      },
    );

    return { agentMessageId };
  },
});

export const internalSendText = internalAction({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    allowHumanAgentTag: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<ChannelSendResult> => {
    const ctxData = await ctx.runQuery(internal.chat.inbox.internalGetSendContext, {
      conversationId: args.conversationId,
    });
    if (ctxData === null) {
      return { ok: false, error: "Conversation not found", policy: "generic" };
    }

    return await sendTextToChannel(
      ctxData.conversation,
      ctxData.channel,
      args.content,
      { allowHumanAgentTag: args.allowHumanAgentTag ?? false },
    );
  },
});
