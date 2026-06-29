"use node";

import { v } from "convex/values";
import { action, internalAction } from "../_generated/server";
import type { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { getAuthContext } from "../authUtils";
import { metaIndicatorPool, metaReactionPool } from "../inboxPools";
import { generateText } from "ai";
import { openRouterModel } from "../llm/openRouter";
import { DEFAULT_OPENROUTER_MODEL } from "../llm/modelPricing";
import { checkAiFeature } from "../plans";
import type { Doc } from "../_generated/dataModel";
import {
  sendTextToChannel,
  sendMediaToChannel,
  sendTextAndImage,
  sendMetaMarkSeen,
  sendMetaTypingOn,
  sendMetaTypingOff,
  sendMetaReaction,
  removeMetaReaction,
  throwIfChannelSendFailed,
  type ChannelSendResult,
  type ChannelSendPolicy,
  type MetaIndicatorResult,
} from "./channelSend";
import {
  INBOX_REACTION_EMOJIS,
  isAllowedInboxReactionEmoji,
} from "../../shared/messageReactions";
import { normalizeCustomerFacingResponseFormatting } from "./responseFormatting";

type MetaIndicatorActionResult =
  | { ok: true; skipped?: string }
  | { ok: false; error: string };

type ReplyPersistResult = {
  agentMessageId: string;
  markedRead: boolean;
  latestInboundExternalId?: string;
};

const reactionEmojiValidator = v.union(
  ...INBOX_REACTION_EMOJIS.map((emoji) => v.literal(emoji)),
);

function isChannelConversation(conversation: Doc<"conversations">): boolean {
  return (
    conversation.service === "whatsapp" ||
    conversation.service === "instagram" ||
    conversation.service === "messenger"
  );
}

function metaIndicatorActionResult(
  result: MetaIndicatorResult,
): MetaIndicatorActionResult {
  if (result.ok) return { ok: true };
  return { ok: false, error: result.error };
}

function skippedMetaIndicator(reason: string): MetaIndicatorActionResult {
  return { ok: true, skipped: reason };
}

function formatUserDisplayName(user: Doc<"users"> | null, fallback: string): string {
  if (user === null) return fallback;
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || user.email || fallback;
}

async function enqueueMetaMarkSeenIfRead(
  ctx: ActionCtx,
  conversationId: Doc<"conversations">["_id"],
  result: Pick<ReplyPersistResult, "markedRead" | "latestInboundExternalId"> | null,
) {
  if (!result?.markedRead) return;
  await metaIndicatorPool.enqueueAction(
    ctx,
    internal.chat.inboxActions.internalSendMetaMarkSeen,
    {
      conversationId,
      messageExternalId: result.latestInboundExternalId,
    },
  );
}

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

      const persistResult: ReplyPersistResult = await ctx.runMutation(
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
      await enqueueMetaMarkSeenIfRead(
        ctx,
        args.conversationId,
        persistResult,
      );

      return { agentMessageId: persistResult.agentMessageId };
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

    const persistResult: ReplyPersistResult = await ctx.runMutation(
      internal.chat.inbox.internalPersistHumanReply,
      {
        conversationId: args.conversationId,
        content: trimmed,
        authorUserId: userId,
        externalId: result.externalId,
        images: persistImages,
      },
    );
    await enqueueMetaMarkSeenIfRead(ctx, args.conversationId, persistResult);

    return { agentMessageId: persistResult.agentMessageId };
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

export const internalSendMetaMarkSeen = internalAction({
  args: {
    conversationId: v.id("conversations"),
    messageExternalId: v.optional(v.string()),
    requireAiHandled: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<MetaIndicatorActionResult> => {
    const ctxData = await ctx.runQuery(
      internal.chat.inbox.internalGetSendContext,
      { conversationId: args.conversationId },
    );
    if (ctxData === null) {
      return skippedMetaIndicator("conversation_not_found");
    }

    const { conversation, channel } = ctxData;
    if (!isChannelConversation(conversation)) {
      return skippedMetaIndicator("not_channel_conversation");
    }
    if (
      args.requireAiHandled === true &&
      (!conversation.assignToAiAgent || !conversation.assignedAgentId)
    ) {
      return skippedMetaIndicator("not_ai_handled");
    }

    const result = await sendMetaMarkSeen(conversation, channel, {
      messageExternalId: args.messageExternalId,
    });
    if (!result.ok) {
      console.warn("Failed to send Meta mark-seen indicator", {
        conversationId: args.conversationId,
        service: conversation.service,
        error: result.error,
      });
    }
    return metaIndicatorActionResult(result);
  },
});

export const internalSendMetaTypingOn = internalAction({
  args: {
    conversationId: v.id("conversations"),
    messageExternalId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<MetaIndicatorActionResult> => {
    const ctxData = await ctx.runQuery(
      internal.chat.inbox.internalGetSendContext,
      { conversationId: args.conversationId },
    );
    if (ctxData === null) {
      return skippedMetaIndicator("conversation_not_found");
    }

    const { conversation, channel } = ctxData;
    if (!isChannelConversation(conversation)) {
      return skippedMetaIndicator("not_channel_conversation");
    }

    const result = await sendMetaTypingOn(conversation, channel, {
      messageExternalId: args.messageExternalId,
    });
    if (!result.ok) {
      console.warn("Failed to send Meta typing-on indicator", {
        conversationId: args.conversationId,
        service: conversation.service,
        error: result.error,
      });
    }
    return metaIndicatorActionResult(result);
  },
});

export const internalSendMetaTypingOff = internalAction({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args): Promise<MetaIndicatorActionResult> => {
    const ctxData = await ctx.runQuery(
      internal.chat.inbox.internalGetSendContext,
      { conversationId: args.conversationId },
    );
    if (ctxData === null) {
      return skippedMetaIndicator("conversation_not_found");
    }

    const { conversation, channel } = ctxData;
    if (!isChannelConversation(conversation)) {
      return skippedMetaIndicator("not_channel_conversation");
    }

    const result = await sendMetaTypingOff(conversation, channel);
    if (!result.ok) {
      console.warn("Failed to send Meta typing-off indicator", {
        conversationId: args.conversationId,
        service: conversation.service,
        error: result.error,
      });
    }
    return metaIndicatorActionResult(result);
  },
});

export const reactToMessage = action({
  args: {
    conversationId: v.id("conversations"),
    messageId: v.optional(v.id("messages")),
    agentMessageId: v.optional(v.string()),
    emoji: reactionEmojiValidator,
  },
  handler: async (ctx, args): Promise<void> => {
    const { orgId, userId } = await getAuthContext(ctx);
    const ctxData = await ctx.runQuery(
      internal.chat.inbox.internalGetSendContext,
      { conversationId: args.conversationId },
    );
    if (ctxData === null || ctxData.conversation.orgId !== orgId) {
      throw new Error("Conversation not found");
    }
    if (
      ctxData.conversation.service !== "whatsapp" &&
      ctxData.conversation.service !== "messenger"
    ) {
      throw new Error("Reactions are only supported for WhatsApp and Messenger");
    }
    const target = await ctx.runQuery(
      internal.chat.reactions.internalResolveReactionTarget,
      {
        conversationId: args.conversationId,
        messageId: args.messageId,
        agentMessageId: args.agentMessageId,
      },
    );
    if (target === null || !target.externalId) {
      throw new Error("This message cannot be reacted to yet");
    }
    const currentUser = await ctx.runQuery(internal.users.internalGetByWorkosUserId, {
      workosUserId: userId,
    });
    await metaReactionPool.enqueueAction(
      ctx,
      internal.chat.inboxActions.internalSendAndPersistReaction,
      {
        conversationId: args.conversationId,
        messageId: target.messageId,
        targetExternalId: target.externalId,
        emoji: args.emoji,
        source: "human",
        actorUserId: userId,
        actorName: formatUserDisplayName(currentUser, "Team member"),
      },
    );
  },
});

export const removeReactionFromMessage = action({
  args: {
    conversationId: v.id("conversations"),
    messageId: v.id("messages"),
  },
  handler: async (ctx, args): Promise<void> => {
    const { orgId, userId } = await getAuthContext(ctx);
    const ctxData = await ctx.runQuery(
      internal.chat.inbox.internalGetSendContext,
      { conversationId: args.conversationId },
    );
    if (ctxData === null || ctxData.conversation.orgId !== orgId) {
      throw new Error("Conversation not found");
    }
    const target = await ctx.runQuery(
      internal.chat.reactions.internalResolveReactionTarget,
      {
        conversationId: args.conversationId,
        messageId: args.messageId,
      },
    );
    if (target === null || !target.externalId) {
      throw new Error("This reaction cannot be removed");
    }
    await metaReactionPool.enqueueAction(
      ctx,
      internal.chat.inboxActions.internalRemoveAndPersistReaction,
      {
        conversationId: args.conversationId,
        messageId: target.messageId,
        targetExternalId: target.externalId,
        source: "human",
        actorUserId: userId,
      },
    );
  },
});

export const internalReactToLatestCustomerMessage = internalAction({
  args: {
    conversationId: v.id("conversations"),
    emoji: reactionEmojiValidator,
    actorAgentId: v.optional(v.id("agents")),
    actorName: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ ok: boolean; error?: string }> => {
    const target = await ctx.runQuery(
      internal.chat.reactions.internalGetLatestIncomingReactionTarget,
      { conversationId: args.conversationId },
    );
    if (target === null || !target.externalId) {
      return { ok: false, error: "No customer message available to react to" };
    }
    await metaReactionPool.enqueueAction(
      ctx,
      internal.chat.inboxActions.internalSendAndPersistReaction,
      {
        conversationId: args.conversationId,
        messageId: target.messageId,
        targetExternalId: target.externalId,
        emoji: args.emoji,
        source: "ai",
        actorAgentId: args.actorAgentId,
        actorName: args.actorName ?? "AI",
      },
    );
    return { ok: true };
  },
});

export const internalSendAndPersistReaction = internalAction({
  args: {
    conversationId: v.id("conversations"),
    messageId: v.id("messages"),
    targetExternalId: v.string(),
    emoji: v.string(),
    source: v.union(v.literal("human"), v.literal("ai")),
    actorUserId: v.optional(v.string()),
    actorAgentId: v.optional(v.id("agents")),
    actorName: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ ok: boolean; error?: string }> => {
    if (!isAllowedInboxReactionEmoji(args.emoji)) {
      return { ok: false, error: "Unsupported reaction emoji" };
    }
    const ctxData = await ctx.runQuery(
      internal.chat.inbox.internalGetSendContext,
      { conversationId: args.conversationId },
    );
    if (ctxData === null) {
      return { ok: false, error: "Conversation not found" };
    }
    const sendResult = await sendMetaReaction(
      ctxData.conversation,
      ctxData.channel,
      {
        targetExternalId: args.targetExternalId,
        emoji: args.emoji,
      },
    );
    if (!sendResult.ok) {
      console.warn("Failed to send Meta reaction", {
        conversationId: args.conversationId,
        service: ctxData.conversation.service,
        error: sendResult.error,
      });
      return { ok: false, error: sendResult.error };
    }
    const persistResult = await ctx.runMutation(
      internal.chat.reactions.internalUpsertReaction,
      {
        conversationId: args.conversationId,
        messageId: args.messageId,
        emoji: args.emoji,
        source: args.source,
        actorUserId: args.actorUserId,
        actorAgentId: args.actorAgentId,
        actorName: args.actorName,
        externalReactionMessageId: sendResult.externalId,
      },
    );
    return persistResult.ok
      ? { ok: true }
      : { ok: false, error: persistResult.error };
  },
});

export const internalRemoveAndPersistReaction = internalAction({
  args: {
    conversationId: v.id("conversations"),
    messageId: v.id("messages"),
    targetExternalId: v.string(),
    source: v.union(v.literal("human"), v.literal("ai")),
    actorUserId: v.optional(v.string()),
    actorAgentId: v.optional(v.id("agents")),
  },
  handler: async (ctx, args): Promise<{ ok: boolean; error?: string }> => {
    const ctxData = await ctx.runQuery(
      internal.chat.inbox.internalGetSendContext,
      { conversationId: args.conversationId },
    );
    if (ctxData === null) {
      return { ok: false, error: "Conversation not found" };
    }
    const sendResult = await removeMetaReaction(
      ctxData.conversation,
      ctxData.channel,
      { targetExternalId: args.targetExternalId },
    );
    if (!sendResult.ok) {
      console.warn("Failed to remove Meta reaction", {
        conversationId: args.conversationId,
        service: ctxData.conversation.service,
        error: sendResult.error,
      });
      return { ok: false, error: sendResult.error };
    }
    const persistResult = await ctx.runMutation(
      internal.chat.reactions.internalRemoveReaction,
      {
        conversationId: args.conversationId,
        messageId: args.messageId,
        source: args.source,
        actorUserId: args.actorUserId,
        actorAgentId: args.actorAgentId,
      },
    );
    return persistResult.ok
      ? { ok: true }
      : { ok: false, error: persistResult.error };
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
    const content =
      conversation.service === "whatsapp"
        ? normalizeCustomerFacingResponseFormatting(args.content)
        : args.content;

    if (content.trim() && args.mediaUrls.length > 0) {
      if (conversation.service === "instagram" || conversation.service === "messenger") {
        const { imageResult, textResult } = await sendTextAndImage(
          conversation,
          channel,
          { text: content, imageUrls: args.mediaUrls, ...options },
        );
        if (!imageResult.ok) return { ok: false, error: imageResult.error, policy: imageResult.policy };
        if (!textResult.ok) return { ok: false, error: textResult.error, policy: textResult.policy };
        return {
          ok: true,
          textExternalId: textResult.externalId,
          mediaExternalIds: imageResult.externalId ? [imageResult.externalId] : [],
        };
      }
      const textResult = await sendTextToChannel(conversation, channel, content, options);
      if (!textResult.ok) return { ok: false, error: textResult.error, policy: textResult.policy };
      return { ok: true, textExternalId: textResult.externalId, mediaExternalIds: [] };
    }

    if (content.trim()) {
      const result = await sendTextToChannel(conversation, channel, content, options);
      if (!result.ok) return { ok: false, error: result.error, policy: result.policy };
      return { ok: true, textExternalId: result.externalId };
    }

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

export const internalSendEscalationMessage = internalAction({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const sendResult = await ctx.runAction(
      internal.chat.inboxActions.internalSendAiReply,
      {
        conversationId: args.conversationId,
        content: args.content,
        mediaUrls: [],
        allowHumanAgentTag: false,
      },
    );

    if (!sendResult.ok) {
      console.error("Failed to send escalation message to channel:", sendResult.error);
      return;
    }

    const conv = await ctx.runQuery(internal.chat.inbox.internalGetConversation, {
      conversationId: args.conversationId,
    });
    if (!conv) return;

    const persistResult: ReplyPersistResult | null = await ctx.runMutation(
      internal.chat.inbox.internalPersistAiReply,
      {
        conversationId: args.conversationId,
        threadId: conv.threadId,
        content: args.content,
        externalId: sendResult.textExternalId,
        llmModel: "escalation",
        creditsCharged: 0,
      },
    );
    await enqueueMetaMarkSeenIfRead(ctx, args.conversationId, persistResult);
  },
});

function buildSummaryTranscript(messages: Doc<"messages">[]): string {
  return messages
    .map((m) => {
      const sender =
        m.direction === "incoming"
          ? "Customer"
          : m.authorUserId
            ? "Agent (User)"
            : "Agent (AI)";
      return `${sender}: ${m.content}`;
    })
    .join("\n");
}

async function resolveConversationModelId(
  ctx: ActionCtx,
  conv: Doc<"conversations">,
): Promise<string> {
  if (!conv.assignedAgentId) {
    return DEFAULT_OPENROUTER_MODEL;
  }
  const agent = await ctx.runQuery(internal.agents.internalGet, {
    agentId: conv.assignedAgentId,
  });
  return agent?.model ?? DEFAULT_OPENROUTER_MODEL;
}

function parseLeadTemperature(
  raw: string,
): "hot" | "warm" | "cold" | undefined {
  const jsonStr = raw.startsWith("{")
    ? raw
    : raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try {
    const parsed = JSON.parse(jsonStr) as { leadTemperature?: string };
    const temp = (parsed.leadTemperature ?? "").toLowerCase();
    if (temp === "hot" || temp === "warm" || temp === "cold") {
      return temp;
    }
  } catch {
    // Fall through.
  }
  return undefined;
}

export const internalLabelLeadOnSync = internalAction({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const conv = await ctx.runQuery(internal.chat.inbox.internalGetConversation, {
      conversationId: args.conversationId,
    });
    if (conv === null || conv.syncLeadLabeledAt !== undefined || !conv.customerId) {
      return;
    }

    const stripeInfo = await ctx.runQuery(internal.plans.getTeamStripePlan, {
      workosOrgId: conv.orgId,
      userId: conv.assignedUserId ?? undefined,
    });
    if (!checkAiFeature(stripeInfo.plan, "sync_lead_labeling")) {
      return;
    }

    const messages = await ctx.runQuery(
      internal.chat.inbox.internalGetMessagesForSummary,
      { conversationId: args.conversationId },
    );
    if (messages.length === 0) {
      return;
    }

    const modelId = await resolveConversationModelId(ctx, conv);
    const transcript = buildSummaryTranscript(messages);
    const systemPrompt = `You classify sales leads from chat transcripts between a customer and a business agent.
Classify the lead temperature as one of: "hot", "warm", or "cold".
- Hot: Customer shows strong buying intent — asking about pricing, requesting a demo, ready to purchase, comparing specific options, asking about availability/delivery, or has already made a purchase.
- Warm: Customer is interested but still exploring — asking general questions, requesting information, showing curiosity but not yet committed.
- Cold: Customer is disengaged, unresponsive, just browsing, filing a complaint with no purchase intent, or conversation is a dead-end support ticket.

You MUST respond with ONLY a JSON object in this exact format, no other text:
{"leadTemperature": "hot" or "warm" or "cold"}`;
    const prompt = `Classify the lead temperature for this chat transcript. Respond with ONLY a JSON object:\n\n${transcript}`;

    try {
      const { text } = await generateText({
        model: openRouterModel(modelId),
        prompt,
        system: systemPrompt,
      });
      const leadTemperature = parseLeadTemperature(text.trim());
      if (!leadTemperature) {
        console.error("Sync lead labeling returned no temperature", {
          conversationId: args.conversationId,
        });
        return;
      }

      const temperatureMap = { hot: "Hot", warm: "Warm", cold: "Cold" } as const;
      await ctx.runMutation(internal.customers.internalSetLeadTemperature, {
        customerId: conv.customerId,
        temperature: temperatureMap[leadTemperature],
      });
      await ctx.runMutation(internal.chat.inbox.internalMarkSyncLeadLabeled, {
        conversationId: args.conversationId,
      });
    } catch (error) {
      console.error("Failed to label lead during conversation sync:", error);
    }
  },
});

export const generateThreadSummary = action({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args): Promise<{ summary: string }> => {
    const { orgId } = await getAuthContext(ctx);
    const conv = await ctx.runQuery(internal.chat.inbox.internalGetConversation, {
      conversationId: args.conversationId,
    });
    if (conv === null || conv.orgId !== orgId) {
      throw new Error("Conversation not found");
    }

    const messages = await ctx.runQuery(
      internal.chat.inbox.internalGetMessagesForSummary,
      { conversationId: args.conversationId },
    );
    if (messages.length === 0) {
      throw new Error("Not enough messages to generate a summary.");
    }

    const stripeInfo = await ctx.runQuery(internal.plans.getTeamStripePlan, {
      workosOrgId: conv.orgId,
      userId: conv.assignedUserId ?? undefined,
    });
    if (!checkAiFeature(stripeInfo.plan, "thread_summary")) {
      throw new Error("Thread summary is not available on your plan.");
    }

    const modelId = await resolveConversationModelId(ctx, conv);
    const transcript = buildSummaryTranscript(messages);

    const systemPrompt = `You are a helpful assistant that summarizes chat transcripts between a customer and a business agent.
Generate a very simple, clear, and easy-to-understand summary of precisely 3-4 lines.
Keep it short, sweet, and focused specifically on the customer and their status. Use plain English, avoid formal business speak or jargon, and explain:
- The customer's primary inquiry, need, or concern (what they are looking for or trying to resolve).
- The current status, sentiment, or next steps from the customer's perspective (e.g. they are waiting for a support response, frustrated with pricing, happy after a successful purchase, ready to book a demo).
Make it highly customer-centric and readable at a single glance.`;
    const prompt = `Please summarize the following chat transcript:\n\n${transcript}`;

    try {
      const { text } = await generateText({
        model: openRouterModel(modelId),
        prompt,
        system: systemPrompt,
      });
      const summary = text.trim();
      if (!summary) {
        throw new Error("Could not generate a summary from this conversation.");
      }

      return { summary };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      console.error("Failed to generate thread summary:", error);
      throw new Error("Failed to generate summary. Please try again.");
    }
  },
});
