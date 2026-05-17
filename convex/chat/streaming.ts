import { v } from "convex/values";
import { mutation, query, internalAction } from "../_generated/server";
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
    const { messageId } = await saveMessage(ctx, components.agent, {
      threadId: args.threadId,
      prompt: args.prompt,
    });

    await ctx.scheduler.runAfter(
      0,
      internal.chat.streaming.generateResponseAsync,
      {
        threadId: args.threadId,
        agentId: args.agentId,
        promptMessageId: messageId,
        enableCitations: args.enableCitations,
      },
    );

    return messageId;
  },
});

export const generateResponseAsync = internalAction({
  args: {
    threadId: v.string(),
    agentId: v.id("agents"),
    promptMessageId: v.string(),
    enableCitations: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.runQuery(internal.agents.internalGet, {
      agentId: args.agentId,
    });
    if (!agent) throw new Error("Agent not found");

    const configuredAgent = buildAgent(
      agent,
      args.agentId,
      args.enableCitations ?? false,
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
    await result.consumeStream();
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
