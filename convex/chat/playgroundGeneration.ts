import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal, components } from "../_generated/api";
import { saveMessages } from "@convex-dev/agent";
import { buildAgent } from "./threads";
import {
  extractMediaUrls,
  replaceMediaUrlsWithKeys,
} from "./mediaUrlExtractor";
import { getModelProvider } from "../llm/modelPricing";
import { loadPlaygroundReplyInput } from "./playgroundReplyInput";
import { playgroundCitationInstructions } from "./playgroundCitationInstructions";
import { splitAiReplyMessages } from "./aiReplyMessages";
import { applyBookingReplyGate } from "./applyBookingReply";
import { ensureAvailabilityTimesInReplies } from "../appointmentBooking/availabilityPresentation";
import {
  generateWorkflowActionPlan,
  workflowActionPlanReplyPromptArgs,
} from "./workflowActionPlanner";

export const generatePlaygroundResponseAsync = internalAction({
  args: {
    threadId: v.string(),
    agentId: v.id("agents"),
    promptMessageId: v.string(),
    firstPromptMessageId: v.string(),
    enableCitations: v.optional(v.boolean()),
    billingUserId: v.string(),
    deductCredits: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const agent = await ctx.runQuery(internal.agents.internalGet, {
      agentId: args.agentId,
    });
    if (!agent) throw new Error("Agent not found");

    const conv = await ctx.runQuery(
      internal.chat.streaming.internalGetConversationByThreadId,
      { threadId: args.threadId },
    );
    if (
      !conv ||
      conv.service !== "playground" ||
      conv.assignedAgentId !== args.agentId
    )
      return;
    const activeBooking = conv
      ? await ctx.runQuery(
          internal.appointmentBooking.services.listActiveServices,
          {
            agentId: args.agentId,
          },
        )
      : { services: [] };
    await ctx.runMutation(
      internal.workflowMigrations.ensureLegacyHumanEscalationForAgent,
      {
        agentId: args.agentId,
      },
    );
    const workflowRuntimeContext = await ctx.runQuery(
      internal.workflowRuntimeContext.loadForAgent,
      { agentId: args.agentId },
    );
    const configuredAgent = buildAgent(
      agent,
      args.agentId,
      args.enableCitations ?? false,
      conv?._id ?? undefined,
      activeBooking.services,
      workflowRuntimeContext,
      args.promptMessageId,
      true,
    );
    const bookingBeforeReply = conv
      ? await ctx.runQuery(
          internal.appointmentBooking.currentBooking.getCurrentBooking,
          {
            conversationId: conv._id,
          },
        )
      : undefined;
    const replyInput = await loadPlaygroundReplyInput(
      ctx,
      args,
      agent.instructionsUpdatedAt,
    );
    const workflowActionPlan = await generateWorkflowActionPlan(
      ctx,
      args.threadId,
      {
        promptMessageId: args.promptMessageId,
        workflowDecisionState: replyInput.decisionState,
      },
      workflowRuntimeContext,
    );
    const replyPrompt = workflowActionPlanReplyPromptArgs(
      { promptMessageId: args.promptMessageId },
      workflowActionPlan,
      workflowRuntimeContext,
    );
    const result = await configuredAgent.streamText(
      ctx,
      { threadId: args.threadId },
      {
        ...replyPrompt,
        messages: [
          ...replyPrompt.messages,
          ...(args.enableCitations
            ? [
                {
                  role: "system" as const,
                  content: playgroundCitationInstructions,
                },
              ]
            : []),
        ],
      },
      {
        contextHandler: replyInput.contextHandler,
        contextOptions: { recentMessages: 0 },
        saveStreamDeltas: {
          chunking: "word",
          throttleMs: 1000,
        },
      },
    );

    const rawReplyText = await result.text;
    let replyMessages = splitAiReplyMessages(rawReplyText);
    const generationSteps = await result.steps;
    replyMessages = ensureAvailabilityTimesInReplies(
      replyMessages,
      generationSteps.flatMap((step) => step.toolResults),
    );
    if (conv && activeBooking.services.length > 0) {
      replyMessages = await applyBookingReplyGate(ctx, {
        conversationId: conv._id,
        generatedMessages: replyMessages,
        hadBookingBefore: bookingBeforeReply?.success === true,
      });
    }
    if (replyMessages.length === 0) return;

    const streamedAssistant = result.savedMessages
      ?.filter((message) => message.message?.role === "assistant")
      .at(-1);
    if (!streamedAssistant) return;

    const usage = await ctx.runMutation(
      internal.credits.internalDeductCredits,
      {
        workosUserId: args.billingUserId,
        modelId: agent.model,
        skipDeduction: !args.deductCredits,
        conversationId: conv?._id,
        agentId: args.agentId,
        reason: "AI playground response",
      },
    );

    const mediaUrls = [
      ...new Set(
        replyMessages.flatMap((message) => extractMediaUrls(message).mediaUrls),
      ),
    ];
    let messagesWithMediaKeys = replyMessages;
    if (mediaUrls.length > 0) {
      const urlToClientId: Record<string, string> = await ctx.runQuery(
        internal.knowledgeBaseImages.internalResolvePublicUrlsToClientIds,
        { agentId: args.agentId, urls: mediaUrls },
      );
      const urlToKey = new Map(Object.entries(urlToClientId));
      messagesWithMediaKeys = replyMessages.map((message) =>
        replaceMediaUrlsWithKeys(message, urlToKey),
      );
    }

    const [firstMessage, ...followUpMessages] = messagesWithMediaKeys;
    await configuredAgent.updateMessage(ctx, {
      messageId: streamedAssistant._id,
      patch: {
        message: { role: "assistant", content: firstMessage ?? "" },
        status: "success",
      },
    });
    await ctx.runMutation(components.agent.messages.updateMessage, {
      messageId: streamedAssistant._id,
      patch: {
        model: usage.llmModel,
        provider: getModelProvider(agent.model),
      },
    });

    const savedFollowUps = followUpMessages.length
      ? (
          await saveMessages(ctx, components.agent, {
            threadId: args.threadId,
            promptMessageId: args.promptMessageId,
            agentName: agent.name,
            messages: followUpMessages.map((content) => ({
              role: "assistant" as const,
              content,
            })),
            metadata: followUpMessages.map(() => ({
              model: usage.llmModel,
              provider: getModelProvider(agent.model),
            })),
          })
        ).messages
      : [];

    if (conv) {
      const savedAssistantMessages = [streamedAssistant, ...savedFollowUps];
      for (const [index, savedAssistant] of savedAssistantMessages.entries()) {
        await ctx.runMutation(
          internal.chat.streaming.internalPersistPlaygroundAiUsage,
          {
            conversationId: conv._id,
            agentId: args.agentId,
            agentMessageId: savedAssistant._id,
            content: messagesWithMediaKeys[index] ?? "",
            llmModel: usage.llmModel,
            creditsCharged: index === 0 ? usage.creditsCharged : 0,
          },
        );
      }
    }
  },
});
