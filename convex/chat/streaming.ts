import { v } from "convex/values";
import { mutation, query, internalAction } from "../_generated/server";
import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { components } from "../_generated/api";
import {
  createThread,
  saveMessage,
  listUIMessages,
  syncStreams,
  Agent,
  stepCountIs,
  createTool,
} from "@convex-dev/agent";
import { vStreamArgs } from "@convex-dev/agent";
import { google } from "@ai-sdk/google";
import { paginationOptsValidator } from "convex/server";
import { z } from "zod";
import { getAuthContext } from "../authUtils";

function buildAgent(
  agent: { name: string; model: string; systemPrompt: string },
  agentId: Id<"agents">,
  enableCitations: boolean = false,
) {
  const tools = {
    fetchContext: createTool({
      description:
        "MUST be called before answering ANY user question. Searches the knowledge base (uploaded documents, Q&A pairs, web references) for relevant context. Always call this first — even if you think you know the answer.",
      inputSchema: z.object({
        query: z.string().describe("The exact user original query"),
      }),
      execute: async (ctx, { query }) => {
        const result = await ctx.runAction(internal.cloudflare.internalSearch, {
          agentId,
          query,
        });
        return result;
      },
    }),
  };

  const citationBlock = enableCitations
    ? `\n\nWhen responding, include:
- A comprehensive paragraph with inline citations marked as [1], [2], etc.
- 2-3 citations with realistic source information
- Each citation MUST have a {title: "", url: "", description: ""} JSON object. If ANY of them doesn't exist, leave it as empty string "" for that key. 
- If it's a file, the URL value must start with https://chat-saas.com/{{fileName}}
- The description key MUST contain a short summary of the content from the source. 
- Make the content informative and the sources credible
Format citations as numbered references within the text. Use only sources found via \`fetchContext\` — do not fabricate sources.
- This is citations section, not references. Must use the keyword Citations.`
    : "";

  const instructions = `${agent.systemPrompt}

  ## Tool Usage — REQUIRED
  You have a \`fetchContext\` tool that searches the user's knowledge base. You MUST call it before responding to any question — no exceptions. Please pass the exact user original prompt to the \`fetchContext\` tool. Do not rely on your training data alone.

  ### Steps for every response:
  1. Call \`fetchContext\` with the user's original query
  2. Read the returned context carefully
  3. If relevant context is found: base your answer on it
  4. If no relevant context is found: explicitly tell the user ("I couldn't find relevant information in the company knowledge base") only then supplement with general knowledge
  ${citationBlock}`;

  return new Agent(components.agent, {
    name: agent.name,
    languageModel: google(agent.model),
    instructions,
    stopWhen: stepCountIs(6),
    // rawRequestResponseHandler: async (ctx, { request, response }) => {
    //   console.log("request", request);
    //   console.log("response", response);
    // },
    tools,
  });
}

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

    const configuredAgent = buildAgent(agent, args.agentId, args.enableCitations ?? false);
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
