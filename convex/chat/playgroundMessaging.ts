import { v } from "convex/values";
import { mutation } from "../triggers";
import { internal, components } from "../_generated/api";
import { saveMessage } from "@convex-dev/agent";
import { getAuthContext } from "../authUtils";
import { buildAgent, createThreadForConversation } from "./threads";
import { isPlaygroundCreditsEnabled } from "../credits";
import { getPlanForCurrentSession } from "../plans";
import { sessionAllowsAgentModel } from "../agentModelAccess";
import { logConversationEvent } from "../conversationLogs";
import {
  cancelPlaygroundReply,
  schedulePlaygroundReply,
} from "./playgroundReplyScheduling";

export const resetThread = mutation({
  args: {
    agentId: v.id("agents"),
    existingThreadId: v.optional(v.string()),
  },
  returns: v.object({
    threadId: v.string(),
    conversationId: v.id("conversations"),
  }),
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
        await cancelPlaygroundReply(ctx, existingConv);
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
  returns: v.string(),
  handler: async (ctx, args) => {
    const { userId } = await getAuthContext(ctx);
    const agentDoc = await ctx.db.get(args.agentId);
    if (agentDoc === null) {
      throw new Error("Agent not found");
    }

    const conversation = await ctx.db
      .query("conversations")
      .withIndex("by_threadId", (q) => q.eq("threadId", args.threadId))
      .unique();
    if (
      !conversation ||
      conversation.service !== "playground" ||
      conversation.assignedAgentId !== args.agentId ||
      conversation.assignedUserId !== userId
    ) {
      throw new Error("Playground conversation is unavailable");
    }

    const stripeInfo = await getPlanForCurrentSession(ctx);

    if (!(await sessionAllowsAgentModel(ctx, stripeInfo, agentDoc.model))) {
      throw new Error(`Your plan does not support model: ${agentDoc.model}`);
    }

    const deductCredits = isPlaygroundCreditsEnabled();
    if (deductCredits) {
      const creditCheck = await ctx.runQuery(
        internal.credits.internalCheckCredits,
        {
          workosUserId: userId,
          modelId: agentDoc.model,
          agentId: agentDoc._id,
        },
      );
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

    await schedulePlaygroundReply(
      ctx,
      conversation,
      {
        threadId: args.threadId,
        agentId: args.agentId,
        promptMessageId: messageId,
        enableCitations: args.enableCitations,
        billingUserId: userId,
        deductCredits,
      },
      agentDoc.messageWaitSeconds,
    );

    return messageId;
  },
});
