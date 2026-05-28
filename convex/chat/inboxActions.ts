"use node";

import { v } from "convex/values";
import { action, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { getAuthContext } from "../authUtils";
import {
  sendTextToChannel,
  sendMediaToChannel,
  sendTextAndImage,
  throwIfChannelSendFailed,
  type ChannelSendResult,
  type ChannelSendPolicy,
} from "./channelSend";

export const sendReply = action({
  args: {
    conversationId: v.id("conversations"),
    content: v.optional(v.string()),
    clientIds: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args): Promise<{ agentMessageId: string }> => {
    const { orgId, userId } = await getAuthContext(ctx);
    const trimmed = (args.content ?? "").trim();
    const clientIds = args.clientIds ?? [];

    if (!trimmed && clientIds.length === 0) {
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

    const readyUploads =
      clientIds.length > 0
        ? await ctx.runMutation(internal.media.attachments.internalGetReadyUploads, {
            clientIds,
            orgId,
            userId,
          })
        : [];

    const imageUrls = readyUploads.map((u: { publicUrl: string }) => u.publicUrl);
    const channelSendOptions = { allowHumanAgentTag: true as const };
    const persistImages = readyUploads.map((u: { publicUrl: string; mediaType: string }) => ({
      publicUrl: u.publicUrl,
      mediaType: u.mediaType,
    }));

    const isMetaTextAndImage =
      (conversation.service === "instagram" ||
        conversation.service === "messenger") &&
      trimmed.length > 0 &&
      imageUrls.length > 0;

    if (isMetaTextAndImage) {
      const { imageResult, textResult } = await sendTextAndImage(
        conversation,
        channel,
        {
          text: trimmed,
          imageUrls,
          ...channelSendOptions,
        },
      );

      throwIfChannelSendFailed(imageResult);
      throwIfChannelSendFailed(textResult);

      const agentMessageId: string = await ctx.runMutation(
        internal.chat.inbox.internalPersistHumanReply,
        {
          conversationId: args.conversationId,
          content: trimmed,
          authorUserId: userId,
          externalId: textResult.externalId,
          images: persistImages,
          clientIds,
        },
      );

      return { agentMessageId };
    }

    const result =
      imageUrls.length > 0
        ? await sendMediaToChannel(conversation, channel, {
            text: trimmed,
            imageUrls,
            ...channelSendOptions,
          })
        : await sendTextToChannel(conversation, channel, trimmed, channelSendOptions);

    throwIfChannelSendFailed(result);

    const agentMessageId: string = await ctx.runMutation(
      internal.chat.inbox.internalPersistHumanReply,
      {
        conversationId: args.conversationId,
        content: trimmed,
        authorUserId: userId,
        externalId: result.externalId,
        images: persistImages,
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

export const internalSendAiReply = internalAction({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    mediaUrls: v.array(v.string()),
    allowHumanAgentTag: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<{
    ok: boolean;
    error?: string;
    policy?: ChannelSendPolicy;
    textExternalId?: string;
    mediaExternalIds?: string[];
  }> => {
    const ctxData = await ctx.runQuery(
      internal.chat.inbox.internalGetSendContext,
      { conversationId: args.conversationId },
    );
    if (ctxData === null) {
      return { ok: false, error: "Conversation not found", policy: "generic" };
    }
    const { conversation, channel } = ctxData;
    const options = { allowHumanAgentTag: args.allowHumanAgentTag ?? false };

    // Case 1: text + media
    if (args.content.trim() && args.mediaUrls.length > 0) {
      if (conversation.service === "instagram" || conversation.service === "messenger") {
        const { imageResult, textResult } = await sendTextAndImage(
          conversation,
          channel,
          { text: args.content, imageUrls: args.mediaUrls, ...options },
        );
        if (!imageResult.ok) return { ok: false, error: imageResult.error, policy: imageResult.policy };
        if (!textResult.ok) return { ok: false, error: textResult.error, policy: textResult.policy };
        return {
          ok: true,
          textExternalId: textResult.externalId,
          mediaExternalIds: imageResult.externalId ? [imageResult.externalId] : [],
        };
      }
      // WhatsApp: send text only
      const textResult = await sendTextToChannel(conversation, channel, args.content, options);
      if (!textResult.ok) return { ok: false, error: textResult.error, policy: textResult.policy };
      return { ok: true, textExternalId: textResult.externalId, mediaExternalIds: [] };
    }

    // Case 2: text only
    if (args.content.trim()) {
      const result = await sendTextToChannel(conversation, channel, args.content, options);
      if (!result.ok) return { ok: false, error: result.error, policy: result.policy };
      return { ok: true, textExternalId: result.externalId };
    }

    // Case 3: media only
    if (args.mediaUrls.length > 0) {
      const result = await sendMediaToChannel(conversation, channel, {
        imageUrls: args.mediaUrls,
        ...options,
      });
      if (!result.ok) return { ok: false, error: result.error, policy: result.policy };
      return { ok: true, mediaExternalIds: result.externalId ? [result.externalId] : [] };
    }

    return { ok: false, error: "Nothing to send", policy: "generic" };
  },
});

