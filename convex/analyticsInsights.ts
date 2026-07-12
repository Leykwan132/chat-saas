"use node";

import { generateObject } from "ai";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { openRouterModel } from "./llm/openRouter";
import { DEFAULT_OPENROUTER_MODEL } from "./llm/modelPricing";
import { captureAIGeneration } from "./posthog";
import {
  analyticsInsightsSchema,
  buildAnalyticsInsightsPrompt,
  buildAnalyticsInsightsSystemPrompt,
} from "./analyticsInsightsContract";
import { advancedAnalyticsPool } from "./analyticsInsightsPool";

const temperatureMap = {
  hot: "Hot",
  warm: "Warm",
  cold: "Cold",
} as const;

type WorkerResult = { status: "completed" | "skipped" };

export const processConversation = internalAction({
  args: {
    runId: v.string(),
    conversationId: v.id("conversations"),
    assignedUserId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<WorkerResult> => {
    const startedAt = Date.now();
    console.info("Advanced analytics worker", {
      event: "worker_started",
      runId: args.runId,
      conversationId: args.conversationId,
    });
    try {
      const context = await ctx.runQuery(
        internal.analyticsTopicRecords.getTopicDetectionContext,
        { conversationId: args.conversationId },
      );
      if (
        context === null ||
        context.conversation.customerId === undefined ||
        context.sourceMessageMaxCreatedAt === undefined ||
        !context.transcript.some((message) => message.direction === "incoming")
      ) {
        console.info("Advanced analytics worker", {
          event: "worker_skipped",
          runId: args.runId,
          conversationId: args.conversationId,
          reason: "missing_analysis_context",
          durationMs: Date.now() - startedAt,
        });
        return { status: "skipped" };
      }

      const { object, usage } = await generateObject({
        model: openRouterModel(DEFAULT_OPENROUTER_MODEL),
        schema: analyticsInsightsSchema,
        system: buildAnalyticsInsightsSystemPrompt(context.existingTopics),
        prompt: buildAnalyticsInsightsPrompt(context.transcript),
      });
      await captureAIGeneration({
        distinctId: args.assignedUserId ?? args.conversationId,
        traceId: args.conversationId,
        spanName: "combined_advanced_analytics",
        model: DEFAULT_OPENROUTER_MODEL,
        provider: "openrouter",
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        latencySeconds: (Date.now() - startedAt) / 1000,
      });
      await ctx.runMutation(internal.analyticsTopicRecords.assignConversationTopic, {
        conversationId: args.conversationId,
        topics: object.topics.map((topic) => ({
          topicName: topic.topic,
          existingTopicId: topic.existingTopicId ?? undefined,
          confidence: topic.confidence,
          description: topic.description,
          summary: topic.summary,
        })),
        sourceMessageMaxCreatedAt: context.sourceMessageMaxCreatedAt,
      });
      await ctx.runMutation(internal.customers.internalSetLeadTemperature, {
        customerId: context.conversation.customerId,
        temperature: temperatureMap[object.leadTemperature],
      });
      await ctx.runMutation(
        internal.analyticsInsightRecords.assignConversationInsights,
        {
          conversationId: args.conversationId,
          sentiment: object.sentiment,
          sourceMessageMaxCreatedAt: context.sourceMessageMaxCreatedAt,
        },
      );
      console.info("Advanced analytics worker", {
        event: "worker_completed",
        runId: args.runId,
        conversationId: args.conversationId,
        topicCount: object.topics.length,
        sentiment: object.sentiment,
        leadTemperature: object.leadTemperature,
        durationMs: Date.now() - startedAt,
      });
      return { status: "completed" };
    } catch (error) {
      console.error("Advanced analytics worker", {
        event: "worker_failed",
        runId: args.runId,
        conversationId: args.conversationId,
        durationMs: Date.now() - startedAt,
        error,
      });
      throw error;
    }
  },
});

export const runDailyAnalysis = internalAction({
  args: {},
  handler: async (ctx): Promise<{ enqueued: number }> => {
    const runId = crypto.randomUUID();
    const candidates = await ctx.runQuery(
      internal.analyticsInsightRecords.listCandidates,
      { limit: 30 },
    );
    console.info("Advanced analytics cron", {
      event: "cron_started",
      runId,
      scheduleUtc: process.env.ADVANCED_ANALYTICS_CRON_UTC,
      candidateCount: candidates.length,
    });
    for (const candidate of candidates) {
      await advancedAnalyticsPool.enqueueAction(
        ctx,
        internal.analyticsInsights.processConversation,
        {
          runId,
          conversationId: candidate.conversationId,
          assignedUserId: candidate.assignedUserId,
        },
        { retry: true },
      );
    }
    console.info("Advanced analytics cron", {
      event: "jobs_enqueued",
      runId,
      enqueued: candidates.length,
    });
    return { enqueued: candidates.length };
  },
});
