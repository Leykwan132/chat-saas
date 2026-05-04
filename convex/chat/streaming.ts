import { v } from "convex/values";
import { mutation, query, internalAction } from "../_generated/server";
import type { QueryCtx, MutationCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { components } from "../_generated/api";
import {
  createThread,
  saveMessage,
  listUIMessages,
  syncStreams,
  Agent,
  stepCountIs,
} from "@convex-dev/agent";
import { vStreamArgs } from "@convex-dev/agent";
import { google } from "@ai-sdk/google";
import { paginationOptsValidator } from "convex/server";

/* ── Helpers ──────────────────────────────────────────── */

async function getAuth(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  const orgId =
    (identity as Record<string, unknown>).o?.id as string | undefined ??
    "personal";
  return { userId: identity.subject, orgId };
}

function buildAgent(agent: { name: string; model: string; systemPrompt: string }) {
  return new Agent(components.agent, {
    name: agent.name,
    languageModel: google(agent.model),
    instructions: agent.systemPrompt,
    stopWhen: stepCountIs(6),
  });
}

/* ── Mutations / Queries / Actions ─────────────────────── */

export const resetThread = mutation({
  args: {
    agentId: v.id("agents"),
    existingThreadId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, orgId } = await getAuth(ctx);

    if (args.existingThreadId) {
      const agentDoc = await ctx.db.get(args.agentId);
      if (agentDoc) {
        const configuredAgent = buildAgent(agentDoc);
        await configuredAgent.deleteThreadAsync(ctx, {
          threadId: args.existingThreadId,
        });
      }
      const existingConv = await ctx.db
        .query("conversations")
        .withIndex("by_threadId", (q) =>
          q.eq("threadId", args.existingThreadId),
        )
        .first();
      if (existingConv) {
        await ctx.db.delete(existingConv._id);
      }
    }

    const threadId = await createThread(ctx, components.agent);

    const conversationId = await ctx.db.insert("conversations", {
      threadId,
      sender: "user",
      recipient: "bot",
      agentId: args.agentId,
      userId,
      orgId,
      createdAt: Date.now(),
    });

    return { threadId, conversationId };
  },
});

export const sendMessage = mutation({
  args: {
    threadId: v.string(),
    agentId: v.id("agents"),
    prompt: v.string(),
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
  },
  handler: async (ctx, args) => {
    const agent = await ctx.runQuery(internal.agents.internalGet, {
      agentId: args.agentId,
    });
    if (!agent) throw new Error("Agent not found");

    const configuredAgent = buildAgent(agent);
    const result = await configuredAgent.streamText(ctx, { threadId: args.threadId }, { promptMessageId: args.promptMessageId },
      {
        saveStreamDeltas: {
          chunking: "word",
          throttleMs: 1000,
        },
      },);
    await result.consumeStream();
  },
});

export const getConversationByThreadId = query({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("conversations")
      .withIndex("by_threadId", (q) => q.eq("threadId", args.threadId))
      .first();
  },
});

export const listThreadMessages = query({
  args: {
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
    streamArgs: vStreamArgs,
  },
  handler: async (ctx, args) => {
    const paginated = await listUIMessages(ctx, components.agent, args);
    const streams = await syncStreams(ctx, components.agent, args);
    return { ...paginated, streams };
  },
});
