import { v } from "convex/values";
import {
  query,
  mutation,
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
import { inboxAiReplyPool, threadSummarizerPool } from "../inboxPools";
import { extractMediaFromText } from "./mediaUrlExtractor";
import { generateText } from "ai";
import { openRouterModel } from "../llm/openRouter";
import { DEFAULT_OPENROUTER_MODEL } from "../llm/modelPricing";
import { updateThreadMetadata } from "@convex-dev/agent";
import { checkAiFeature, getPlanFromStripe } from "../plans";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

async function getConversationBillingUserId(
  ctx: Pick<MutationCtx, "db">,
  conv: Doc<"conversations">,
): Promise<string | null> {
  if (conv.assignedAgentId) {
    const agent = await ctx.db.get(conv.assignedAgentId);
    if (agent) {
      return agent.userId;
    }
  }
  if (conv.channelId) {
    const channel = await ctx.db.get(conv.channelId);
    if (channel) {
      return channel.connectedByUserId;
    }
  }
  return null;
}

export const internalIngestChannelMessage = internalMutation({
  args: ingestChannelMessageArgs,
  handler: async (ctx, args) => {
    const result = await ingestChannelMessage(ctx, args);
    if (result.skipped) {
      return result;
    }

    const conv = await ctx.db.get(result.conversationId);
    if (conv) {
      const billingUserId = await getConversationBillingUserId(ctx, conv);
      if (billingUserId) {
        const stripeInfo = await getPlanFromStripe(ctx, billingUserId);
        if (checkAiFeature(stripeInfo.plan, "thread_summary")) {
          if (result.isNew || (!args.isHistorical && args.direction === "outgoing")) {
            await threadSummarizerPool.enqueueAction(
              ctx,
              internal.chat.inbox.summarizeThreadWorker,
              { conversationId: result.conversationId },
            );
          }
        }
      }
    }

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

    const patch: Record<string, any> = {
      lastMessageAt: now,
      unreadCount: 0,
      updatedAt: now,
    };
    if (preview && preview.trim() !== "") {
      patch.lastMessagePreview = preview;
    }
    await ctx.db.patch(conv._id, patch);

    const stripeInfo = await getPlanFromStripe(ctx, args.authorUserId);
    if (checkAiFeature(stripeInfo.plan, "thread_summary")) {
      await threadSummarizerPool.enqueueAction(
        ctx,
        internal.chat.inbox.summarizeThreadWorker,
        { conversationId: conv._id },
      );
    }

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

    await ctx.runMutation(internal.chat.inbox.internalEnqueueSummarization, {
      conversationId: conv._id,
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

export const internalUpdateThreadSummary = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    summary: v.string(),
  },
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.conversationId);
    if (!conv) return;

    await ctx.db.patch(args.conversationId, {
      interactionSummary: args.summary,
      updatedAt: Date.now(),
    });

    await updateThreadMetadata(ctx, components.agent, {
      threadId: conv.threadId,
      patch: { summary: args.summary },
    });
  },
});

export const internalEnqueueSummarization = internalMutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    await threadSummarizerPool.enqueueAction(
      ctx,
      internal.chat.inbox.summarizeThreadWorker,
      { conversationId: args.conversationId },
    );
  },
});

export const triggerSummarization = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const { orgId } = await getAuthContext(ctx);
    const conv = await ctx.db.get(args.conversationId);
    if (conv === null || conv.orgId !== orgId) {
      throw new Error("Conversation not found");
    }

    await threadSummarizerPool.enqueueAction(
      ctx,
      internal.chat.inbox.summarizeThreadWorker,
      { conversationId: args.conversationId },
    );
  },
});

export const summarizeThreadWorker = internalAction({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const conv = await ctx.runQuery(
      internal.chat.inbox.internalGetConversation,
      { conversationId: args.conversationId },
    );
    if (conv === null) return;

    const messages = await ctx.runQuery(
      internal.chat.inbox.internalGetMessagesForSummary,
      { conversationId: args.conversationId },
    );
    if (messages.length === 0) return;

    const stripeInfo = await ctx.runQuery(internal.plans.getTeamStripePlan, {
      workosOrgId: conv.orgId,
      userId: conv.assignedUserId ?? undefined,
    });
    if (!checkAiFeature(stripeInfo.plan, "thread_summary")) {
      console.warn("Thread summary skipped: feature disabled for plan tier", {
        orgId: conv.orgId,
        plan: stripeInfo.plan,
      });
      return;
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
      // Parse the JSON response — strip markdown fences if present.
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
        // If JSON parsing fails, treat the entire response as a plain summary.
        summary = raw;
      }
      if (summary) {
        await ctx.runMutation(
          internal.chat.inbox.internalUpdateThreadSummary,
          {
            conversationId: args.conversationId,
            summary,
          },
        );
      }
      // Update the customer's lead temperature tag.
      if (conv.customerId && leadTemperature) {
        const temperatureMap = { hot: "Hot", warm: "Warm", cold: "Cold" } as const;
        await ctx.runMutation(
          internal.customers.internalSetLeadTemperature,
          {
            customerId: conv.customerId,
            temperature: temperatureMap[leadTemperature],
          },
        );
      }
    } catch (error) {
      console.error("Failed to generate thread summary:", error);
    }
  },
});
