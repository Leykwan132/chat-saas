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
  saveHumanReplyTextAndImages,
  buildAgent,
  saveAiReply,
} from "./threads";
import { inboxAiReplyPool } from "../inboxPools";
import { extractMediaFromText } from "./mediaUrlExtractor";

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
    images: v.optional(
      v.array(
        v.object({
          publicUrl: v.string(),
          mediaType: v.string(),
        }),
      ),
    ),
    clientIds: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.conversationId);
    if (conv === null) {
      throw new Error("Conversation not found");
    }
    if (conv.assignedAgentId === undefined) {
      throw new Error("Conversation has no assigned agent");
    }

    const channel = conv.channelId ? await ctx.db.get(conv.channelId) : null;
    const orgAddress =
      channel?.phoneNumberId ?? channel?.igUserId ?? channel?.pageId ?? conv.orgAddress;

    const trimmed = args.content.trim();
    const images = args.images ?? [];
    const sentAt = Date.now();
    const humanReplyImages = images.map((img) => ({
      url: img.publicUrl,
      mimeType: img.mediaType,
    }));

    const agentMessageId =
      trimmed.length > 0 && humanReplyImages.length > 0
        ? await saveHumanReplyTextAndImages(
            ctx,
            conv.threadId,
            trimmed,
            humanReplyImages,
            {
              assignedAgentId: conv.assignedAgentId,
              authorUserId: args.authorUserId,
              sentAt,
              clientIds: args.clientIds,
            },
          )
        : await saveHumanReply(ctx, conv.threadId, trimmed, {
            assignedAgentId: conv.assignedAgentId,
            authorUserId: args.authorUserId,
            sentAt,
            images: humanReplyImages,
          });

    const now = Date.now();
    for (const img of images) {
      await ctx.db.insert("messages", {
        orgId: conv.orgId,
        conversationId: conv._id,
        channelId: conv.channelId,
        service: conv.service,
        externalId: args.externalId,
        orgAddress,
        contactAddress: conv.contactAddress,
        direction: "outgoing",
        authorUserId: args.authorUserId,
        contentType: "image",
        content: img.publicUrl,
        mediaUrl: img.publicUrl,
        agentMessageId,
        status: "sent",
        createdAt: now,
      });
    }

    if (trimmed.length > 0) {
      await ctx.db.insert("messages", {
        orgId: conv.orgId,
        conversationId: conv._id,
        channelId: conv.channelId,
        service: conv.service,
        externalId: args.externalId,
        orgAddress,
        contactAddress: conv.contactAddress,
        direction: "outgoing",
        authorUserId: args.authorUserId,
        contentType: "text",
        content: trimmed,
        agentMessageId,
        status: "sent",
        createdAt: now,
      });
    }

    const preview =
      trimmed.length > 0
        ? trimmed.slice(0, 140)
        : images.length > 0
          ? "Image"
          : "";

    await ctx.db.patch(conv._id, {
      lastMessageAt: now,
      lastMessagePreview: preview,
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
      Date.now(),
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

export const internalPersistAiMediaReply = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    threadId: v.string(),
    mediaUrls: v.array(v.string()),
    externalIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.conversationId);
    if (conv === null) return null;

    const now = Date.now();
    const channel = conv.channelId ? await ctx.db.get(conv.channelId) : null;
    const orgAddress =
      channel?.phoneNumberId ?? channel?.igUserId ?? channel?.pageId ?? conv.orgAddress;

    // Save each media URL as assistant message in the agent thread
    const agentMessageId = await saveAiReply(
      ctx,
      args.threadId,
      args.mediaUrls.join("\n"),
      conv.assignedAgentId,
      now,
    );

    // Insert into messages ledger for inbox display
    for (let i = 0; i < args.mediaUrls.length; i++) {
      const url = args.mediaUrls[i];
      const externalId = args.externalIds[i] ?? undefined;
      await ctx.db.insert("messages", {
        orgId: conv.orgId,
        conversationId: conv._id,
        channelId: conv.channelId,
        service: conv.service,
        externalId,
        orgAddress,
        contactAddress: conv.contactAddress,
        direction: "outgoing",
        contentType: "image",
        content: url,
        mediaUrl: url,
        agentMessageId,
        status: "sent",
        createdAt: now,
      });
    }

    await ctx.db.patch(conv._id, {
      lastMessageAt: now,
      lastMessagePreview: "📎 Media",
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

    const mediaCollections: string[] = await ctx.runQuery(
      internal.knowledgeBaseImages.internalListCollectionNames,
      { agentId: conv.assignedAgentId },
    );
    const configuredAgent = buildAgent(
      agent,
      conv.assignedAgentId,
      false,
      mediaCollections,
    );
    const result = await configuredAgent.generateText(
      ctx,
      { threadId: conv.threadId },
      { prompt: args.promptContent },
    );

    const replyText = result.text.trim();
    if (!replyText) return;

    const { text: cleanText, mediaUrls, mediaClientIds } =
      extractMediaFromText(replyText);
    const urlsFromClientIds: string[] =
      mediaClientIds.length > 0
        ? await ctx.runQuery(
            internal.knowledgeBaseImages.internalResolveClientIdsToPublicUrls,
            { agentId: conv.assignedAgentId, clientIds: mediaClientIds },
          )
        : [];
    const allMediaUrls = [...mediaUrls, ...urlsFromClientIds];
    if (!cleanText && allMediaUrls.length === 0) return;

    const sendResult: {
      ok: boolean;
      error?: string;
      policy?: string;
      textExternalId?: string;
      mediaExternalIds?: string[];
    } = await ctx.runAction(
      internal.chat.inboxActions.internalSendAiReply,
      {
        conversationId: conv._id,
        content: cleanText,
        mediaUrls: allMediaUrls,
        allowHumanAgentTag: false,
      },
    );

    if (!sendResult.ok) {
      console.error(
        "AI reply not sent to channel:",
        sendResult.error,
        { conversationId: conv._id, service: conv.service },
      );
      return;
    }

    if (cleanText) {
      await ctx.runMutation(internal.chat.inbox.internalPersistAiReply, {
        conversationId: conv._id,
        threadId: conv.threadId,
        content: cleanText,
        externalId: sendResult.textExternalId,
      });
    }

    if (allMediaUrls.length > 0) {
      await ctx.runMutation(
        internal.chat.inbox.internalPersistAiMediaReply,
        {
          conversationId: conv._id,
          threadId: conv.threadId,
          mediaUrls: allMediaUrls,
          externalIds: sendResult.mediaExternalIds ?? [],
        },
      );
    }
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
      page: await messageDocsToInboxUIMessages(
        ctx,
        args.conversationId,
        paginated.page,
      ),
      streams,
    };
  },
});
