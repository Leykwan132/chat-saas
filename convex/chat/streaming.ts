import { v } from "convex/values";
import { mutation, query, internalAction, internalMutation, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import { components } from "../_generated/api";
import {
  saveMessage,
  listUIMessages,
  syncStreams,
} from "@convex-dev/agent";
import { vStreamArgs } from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import { getAuthContext } from "../authUtils";
import {
  buildAgent,
  createThreadForConversation,
} from "./threads";
import {
  extractMediaUrls,
  replaceMediaUrlsWithKeys,
} from "./mediaUrlExtractor";
import { isPlaygroundCreditsEnabled } from "../credits";
import { checkModelAccess, getPlanFromStripe } from "../plans";
import { logConversationEvent } from "../conversationLogs";

/* ── Mutations / Queries / Actions ─────────────────────── */

export const resetThread = mutation({
  args: {
    agentId: v.id("agents"),
    existingThreadId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, orgId } = await getAuthContext(ctx);

    if (args.existingThreadId) {
      const agentDoc = await ctx.db.get(args.agentId);
      if (agentDoc) {
        const configuredAgent = buildAgent(agentDoc, args.agentId);
        await configuredAgent.deleteThreadAsync(ctx, {
          threadId: args.existingThreadId,
        });
      }
      const existingConv = await ctx.db
        .query("conversations")
        .withIndex("by_threadId", (q) =>
          q.eq("threadId", args.existingThreadId!),
        )
        .first();
      if (existingConv) {
        await ctx.db.delete(existingConv._id);
      }
    }

    const threadId = await createThreadForConversation(ctx, {
      orgId,
      contactName: undefined,
      contactAddress: "user",
      service: "playground",
      userId,
    });

    const now = Date.now();
    const conversationId = await ctx.db.insert("conversations", {
      orgId,
      service: "playground",
      orgAddress: "agent",
      contactAddress: "user",
      status: "open",
      assignedAgentId: args.agentId,
      assignedUserId: userId,
      assignToAiAgent: false,
      threadId,
      tags: [],
      lastMessageAt: now,
      unreadCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    await logConversationEvent(ctx, {
      conversationId,
      action: "thread_created",
      actor: {
        type: "user",
        userId,
      },
      metadata: {
        service: "playground",
      },
    });

    return { threadId, conversationId };
  },
});

export const sendMessage = mutation({
  args: {
    threadId: v.string(),
    agentId: v.id("agents"),
    prompt: v.string(),
    enableCitations: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId } = await getAuthContext(ctx);
    const agentDoc = await ctx.db.get(args.agentId);
    if (agentDoc === null) {
      throw new Error("Agent not found");
    }

    const stripeInfo = await getPlanFromStripe(ctx, userId);
    const plan = stripeInfo.plan;

    if (!checkModelAccess(plan, agentDoc.model)) {
      throw new Error(`Your plan does not support model: ${agentDoc.model}`);
    }

    const deductCredits = isPlaygroundCreditsEnabled();
    if (deductCredits) {
      const creditCheck = await ctx.runQuery(internal.credits.internalCheckCredits, {
        workosUserId: userId,
        modelId: agentDoc.model,
      });
      if (!creditCheck.ok) {
        if (creditCheck.reason === "insufficient_credits") {
          throw new Error("Insufficient credits to send this message");
        }
        if (creditCheck.reason === "user_not_found") {
          throw new Error("Billing account not found");
        }
        throw new Error("Selected model is not available");
      }
    }

    const { messageId } = await saveMessage(ctx, components.agent, {
      threadId: args.threadId,
      prompt: args.prompt,
    });

    await ctx.scheduler.runAfter(
      0,
      internal.chat.streaming.generatePlaygroundResponseAsync,
      {
        threadId: args.threadId,
        agentId: args.agentId,
        promptMessageId: messageId,
        enableCitations: args.enableCitations,
        billingUserId: userId,
        deductCredits,
      },
    );

    return messageId;
  },
});

export const generatePlaygroundResponseAsync = internalAction({
  args: {
    threadId: v.string(),
    agentId: v.id("agents"),
    promptMessageId: v.string(),
    enableCitations: v.optional(v.boolean()),
    billingUserId: v.string(),
    deductCredits: v.boolean(),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.runQuery(internal.agents.internalGet, {
      agentId: args.agentId,
    });
    if (!agent) throw new Error("Agent not found");

    const mediaCollections: string[] = await ctx.runQuery(
      internal.knowledgeBaseImages.internalListCollectionNames,
      { agentId: args.agentId },
    );

    const conv = await ctx.runQuery(
      internal.chat.streaming.internalGetConversationByThreadId,
      { threadId: args.threadId },
    );

    const configuredAgent = buildAgent(
      agent,
      args.agentId,
      args.enableCitations ?? false,
      mediaCollections,
      conv?._id ?? undefined,
    );
    const result = await configuredAgent.streamText(
      ctx,
      { threadId: args.threadId },
      { promptMessageId: args.promptMessageId },
      {
        saveStreamDeltas: {
          chunking: "word",
          throttleMs: 1000,
        },
      },
    );

    const replyText = (await result.text).trim();
    if (!replyText) return;

    const { text: cleanText, mediaUrls } = extractMediaUrls(replyText);
    const hasMediaKeys = /\[MEDIA:(?!https?:\/\/)/.test(replyText);
    if (!cleanText && mediaUrls.length === 0 && !hasMediaKeys) return;

    const savedAssistant = result.savedMessages
      ?.filter((message) => message.message?.role === "assistant")
      .at(-1);

    if (!savedAssistant) return;

    const usage = await ctx.runMutation(internal.credits.internalDeductCredits, {
      workosUserId: args.billingUserId,
      modelId: agent.model,
      skipDeduction: !args.deductCredits,
      conversationId: conv?._id,
      agentId: args.agentId,
      reason: "AI playground response",
    });

    let contentWithKeys = replyText;
    if (mediaUrls.length > 0) {
      const urlToClientId: Record<string, string> = await ctx.runQuery(
        internal.knowledgeBaseImages.internalResolvePublicUrlsToClientIds,
        { agentId: args.agentId, urls: mediaUrls },
      );
      const urlToKey = new Map(Object.entries(urlToClientId));
      contentWithKeys = replaceMediaUrlsWithKeys(replyText, urlToKey);
    }

    if (contentWithKeys !== replyText) {
      await configuredAgent.updateMessage(ctx, {
        messageId: savedAssistant._id,
        patch: {
          message: { role: "assistant", content: contentWithKeys },
          status: "success",
        },
      });
    }

    await ctx.runMutation(components.agent.messages.updateMessage, {
      messageId: savedAssistant._id,
      patch: {
        model: usage.llmModel,
        provider: "openrouter",
      },
    });

    if (conv) {
      await ctx.runMutation(internal.chat.streaming.internalPersistPlaygroundAiUsage, {
        conversationId: conv._id,
        agentId: args.agentId,
        agentMessageId: savedAssistant._id,
        content: contentWithKeys,
        llmModel: usage.llmModel,
        creditsCharged: usage.creditsCharged,
      });
    }
  },
});

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
      .withIndex("by_orgId_and_service_and_assignedAgentId_and_assignedUserId", (q) =>
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
