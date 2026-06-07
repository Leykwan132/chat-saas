"use node";

import { v } from "convex/values";
import { action, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { getAuthContext } from "../authUtils";
import { generateText } from "ai";
import { openRouterModel } from "../llm/openRouter";
import { DEFAULT_OPENROUTER_MODEL } from "../llm/modelPricing";
import { checkAiFeature } from "../plans";
import type { Doc } from "../_generated/dataModel";
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

    await ctx.runMutation(internal.chat.inbox.internalPersistAiReply, {
      conversationId: args.conversationId,
      threadId: conv.threadId,
      content: args.content,
      externalId: sendResult.textExternalId,
      llmModel: "escalation",
      creditsCharged: 0,
    });
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

    let modelId = DEFAULT_OPENROUTER_MODEL;
    if (conv.assignedAgentId) {
      const agent = await ctx.runQuery(internal.agents.internalGet, {
        agentId: conv.assignedAgentId,
      });
      if (agent) {
        modelId = agent.model;
      }
    }

    const transcript = messages
      .map((m: Doc<"messages">) => {
        const sender =
          m.direction === "incoming"
            ? "Customer"
            : m.authorUserId
              ? "Agent (User)"
              : "Agent (AI)";
        return `${sender}: ${m.content}`;
      })
      .join("\n");

    const systemPrompt = `You are a helpful assistant that summarizes chat transcripts between a customer and a business agent.
You have two jobs:
1. Generate a very simple, clear, and easy-to-understand summary of precisely 3-4 lines.
   Keep it short, sweet, and focused specifically on the customer and their status. Use plain English, avoid formal business speak or jargon, and explain:
   - The customer's primary inquiry, need, or concern (what they are looking for or trying to resolve).
   - The current status, sentiment, or next steps from the customer's perspective (e.g. they are waiting for a support response, frustrated with pricing, happy after a successful purchase, ready to book a demo).
   Make it highly customer-centric and readable at a single glance.
2. Classify the lead temperature as one of: "hot", "warm", or "cold".
   - Hot: Customer shows strong buying intent — asking about pricing, requesting a demo, ready to purchase, comparing specific options, asking about availability/delivery, or has already made a purchase.
   - Warm: Customer is interested but still exploring — asking general questions, requesting information, showing curiosity but not yet committed.
   - Cold: Customer is disengaged, unresponsive, just browsing, filing a complaint with no purchase intent, or conversation is a dead-end support ticket.

You MUST respond with ONLY a JSON object in this exact format, no other text:
{"summary": "your summary here", "leadTemperature": "hot" or "warm" or "cold"}`;
    const prompt = `Please summarize the following chat transcript and classify the lead temperature. Respond with ONLY a JSON object:\n\n${transcript}`;

    try {
      const { text } = await generateText({
        model: openRouterModel(modelId),
        prompt,
        system: systemPrompt,
      });
      const raw = text.trim();
      const jsonStr = raw.startsWith("{")
        ? raw
        : raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
      let summary = "";
      let leadTemperature: "hot" | "warm" | "cold" | undefined;
      try {
        const parsed = JSON.parse(jsonStr) as {
          summary?: string;
          leadTemperature?: string;
        };
        summary = (parsed.summary ?? "").trim();
        const temp = (parsed.leadTemperature ?? "").toLowerCase();
        if (temp === "hot" || temp === "warm" || temp === "cold") {
          leadTemperature = temp;
        }
      } catch {
        summary = raw;
      }

      if (!summary) {
        throw new Error("Could not generate a summary from this conversation.");
      }

      if (conv.customerId && leadTemperature) {
        const temperatureMap = { hot: "Hot", warm: "Warm", cold: "Cold" } as const;
        await ctx.runMutation(internal.customers.internalSetLeadTemperature, {
          customerId: conv.customerId,
          temperature: temperatureMap[leadTemperature],
        });
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
