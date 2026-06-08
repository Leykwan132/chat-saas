import { v } from "convex/values";
import {
  query,
  internalMutation,
  internalAction,
  internalQuery,
} from "../_generated/server";
import { internal } from "../_generated/api";
import { inboxPromptContent } from "../../shared/inboxAttachments";
import { components } from "../_generated/api";
import { syncStreams, vStreamArgs } from "@convex-dev/agent";
import { messageDocsToInboxUIMessages, listMessages, getChannelName } from "./inboxMessageMapping";
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
import { checkAiFeature } from "../plans";

export const internalIngestChannelMessage = internalMutation({
  args: ingestChannelMessageArgs,
  handler: async (ctx, args) => {
    const result = await ingestChannelMessage(ctx, args);
    if (result.skipped) {
      return result;
    }

    const conv = await ctx.db.get(result.conversationId);

    if (!result.shouldEnqueueAi) {
      return result;
    }

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
        promptContent: inboxPromptContent(
          args.content,
          args.images,
          args.files,
        ),
        promptMessageId: result.agentMessageId,
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
              channelName: channel ? getChannelName(channel) : undefined,
            },
          )
        : await saveHumanReply(ctx, conv.threadId, trimmed, {
            assignedAgentId: conv.assignedAgentId,
            authorUserId: args.authorUserId,
            sentAt,
            images: humanReplyImages,
            channelName: channel ? getChannelName(channel) : undefined,
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

    const patch: Record<string, any> = {
      lastMessageAt: now,
      unreadCount: 0,
      updatedAt: now,
    };
    if (preview && preview.trim() !== "") {
      patch.lastMessagePreview = preview;
    }
    if (conv.status === "requires_user_input") {
      patch.status = "open";
      patch.escalation = undefined;
    }
    await ctx.db.patch(conv._id, patch);

    return agentMessageId;
  },
});

export const internalPersistAiReply = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    threadId: v.string(),
    content: v.string(),
    externalId: v.optional(v.string()),
    llmModel: v.optional(v.string()),
    creditsCharged: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.conversationId);
    if (conv === null) return null;

    const trimmed = args.content.trim();
    const now = Date.now();
    const messageMetadata =
      args.llmModel !== undefined
        ? {
            llmModel: args.llmModel,
            creditsCharged: args.creditsCharged ?? 0,
          }
        : undefined;

    const agentMessageId = await saveAiReply(
      ctx,
      args.threadId,
      trimmed,
      conv.assignedAgentId,
      now,
      { messageMetadata },
    );

    const channel = conv.channelId ? await ctx.db.get(conv.channelId) : null;
    const orgAddress =
      channel?.phoneNumberId ?? channel?.igUserId ?? channel?.pageId ?? conv.orgAddress;

    await ctx.db.insert("messages", {
      orgId: conv.orgId,
      conversationId: conv._id,
      channelId: conv.channelId,
      service: conv.service,
      externalId: args.externalId,
      orgAddress,
      contactAddress: conv.contactAddress,
      direction: "outgoing",
      agentId: conv.assignedAgentId,
      contentType: "text",
      content: trimmed,
      agentMessageId,
      llmModel: args.llmModel,
      creditsCharged: args.creditsCharged,
      status: "sent",
      createdAt: now,
    });

    const patch: Record<string, any> = {
      lastMessageAt: now,
      unreadCount: 0,
      updatedAt: now,
    };
    const preview = trimmed.slice(0, 140);
    if (preview && preview.trim() !== "") {
      patch.lastMessagePreview = preview;
    }
    await ctx.db.patch(conv._id, patch);

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

export const internalEscalateConversation = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    question: v.string(),
    context: v.string(),
  },
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.conversationId);
    if (!conv?.assignedAgentId) return;

    const agent = await ctx.db.get(conv.assignedAgentId);
    if (!agent?.escalationEnabled) {
      return;
    }

    const escalationMessage = agent.escalationMessage?.trim();
    const now = Date.now();
    await ctx.db.patch(args.conversationId, {
      status: "requires_user_input",
      assignToAiAgent: false,
      escalation: {
        question: args.question,
        context: args.context,
        escalatedAt: now,
      },
      updatedAt: now,
    });

    if (escalationMessage) {
      await ctx.scheduler.runAfter(
        0,
        internal.chat.inboxActions.internalSendEscalationMessage,
        {
          conversationId: args.conversationId,
          content: escalationMessage,
        },
      );
    }
  },
});

export const generateAiReplyWorker = internalAction({
  args: {
    conversationId: v.id("conversations"),
    promptContent: v.optional(v.string()),
    promptMessageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.promptMessageId && !args.promptContent) {
      throw new Error("Either promptMessageId or promptContent must be provided");
    }
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

    const stripeInfo = await ctx.runQuery(internal.plans.getTeamStripePlan, {
      workosOrgId: agent.orgId,
      userId: agent.userId,
    });

    if (!checkAiFeature(stripeInfo.plan, "auto_reply")) {
      console.warn("AI reply skipped: auto-reply feature disabled for plan tier", {
        billingUserId: agent.userId,
        plan: stripeInfo.plan,
      });
      return;
    }

    const creditCheck = await ctx.runQuery(internal.credits.internalCheckCredits, {
      workosUserId: agent.userId,
      modelId: agent.model,
    });
    if (!creditCheck.ok) {
      console.error("AI reply skipped: insufficient credits or unavailable model", {
        conversationId: args.conversationId,
        reason: creditCheck.reason,
        billingUserId: agent.userId,
      });
      return;
    }

    const mediaCollections: string[] = await ctx.runQuery(
      internal.knowledgeBaseImages.internalListCollectionNames,
      { agentId: conv.assignedAgentId },
    );
    const configuredAgent = buildAgent(
      agent,
      conv.assignedAgentId,
      false,
      mediaCollections,
      conv._id,
    );
    const result = await configuredAgent.generateText(
      ctx,
      { threadId: conv.threadId },
      args.promptMessageId
        ? { promptMessageId: args.promptMessageId }
        : { prompt: args.promptContent },
      { storageOptions: { saveMessages: "none" } },
    );

    const convAfterGeneration = await ctx.runQuery(
      internal.chat.inbox.internalGetConversation,
      { conversationId: args.conversationId },
    );
    if (
      convAfterGeneration?.status === "requires_user_input" &&
      convAfterGeneration.escalation
    ) {
      return;
    }

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

    let usage: { llmModel: string; creditsCharged: number };
    try {
      usage = await ctx.runMutation(internal.credits.internalDeductCredits, {
        workosUserId: agent.userId,
        modelId: agent.model,
        conversationId: conv._id,
        agentId: conv.assignedAgentId,
        reason: `AI reply in ${conv.service} conversation`,
      });
    } catch (error) {
      console.error("AI reply skipped: credit deduction failed", {
        conversationId: args.conversationId,
        error,
      });
      return;
    }

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
        llmModel: usage.llmModel,
        creditsCharged: usage.creditsCharged,
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

export const internalGetOrgByWorkosId = internalQuery({
  args: { orgId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("organizations")
      .withIndex("by_workosOrgId", (q) => q.eq("workosOrgId", args.orgId))
      .unique();
  },
});

export const internalGetConversation = internalQuery({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.conversationId);
  },
});

export const internalMarkSyncLeadLabeled = internalMutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.conversationId);
    if (conv === null || conv.syncLeadLabeledAt !== undefined) {
      return;
    }
    await ctx.db.patch(args.conversationId, {
      syncLeadLabeledAt: Date.now(),
      updatedAt: Date.now(),
    });
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

export const internalGetMessagesForSummary = internalQuery({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_conversationId_and_createdAt", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .order("asc")
      .take(100);
  },
});
