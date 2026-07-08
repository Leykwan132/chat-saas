"use node";

import { internalAction, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { generateText } from "ai";
import { openRouterModel } from "./llm/openRouter";
import { DEFAULT_OPENROUTER_MODEL } from "./llm/modelPricing";
import { captureAIGeneration } from "./posthog";
import { isAdvancedAnalyticsPlan } from "../shared/planCatalog";
import {
  CUSTOMER_SENTIMENTS,
  type CustomerSentiment,
  normalizeCustomerSentiment,
} from "../shared/customerSentiment";

type SentimentDetectionResult = {
  sentiment?: string;
};

function stripJsonFence(raw: string) {
  return raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function parseCustomerSentiment(raw: string): CustomerSentiment | null {
  try {
    const parsed = JSON.parse(stripJsonFence(raw)) as SentimentDetectionResult | string;
    if (typeof parsed === "string") {
      return normalizeCustomerSentiment(parsed);
    }
    return normalizeCustomerSentiment(parsed.sentiment);
  } catch {
    const normalized = normalizeCustomerSentiment(raw);
    return normalized;
  }
}

async function canRunAdvancedAnalytics(
  ctx: ActionCtx,
  candidate: { orgId: string; assignedUserId?: string },
  planCache: Map<string, boolean>,
) {
  const cached = planCache.get(candidate.orgId);
  if (cached !== undefined) {
    return cached;
  }

  try {
    const stripeInfo = await ctx.runQuery(internal.plans.getTeamStripePlan, {
      workosOrgId: candidate.orgId,
      userId: candidate.assignedUserId,
    });
    const eligible = isAdvancedAnalyticsPlan(stripeInfo.plan);
    planCache.set(candidate.orgId, eligible);
    return eligible;
  } catch {
    planCache.set(candidate.orgId, false);
    return false;
  }
}

export const runDailySentimentAnalysis = internalAction({
  args: {},
  handler: async (ctx) => {
    const candidates = await ctx.runQuery(
      internal.analyticsTopicRecords.listSentimentCandidates,
      { limit: 30 },
    );
    let processed = 0;
    let assigned = 0;
    const planCache = new Map<string, boolean>();

    for (const candidate of candidates) {
      if (!(await canRunAdvancedAnalytics(ctx, candidate, planCache))) {
        continue;
      }
      const context = await ctx.runQuery(
        internal.analyticsTopicRecords.getTopicDetectionContext,
        { conversationId: candidate.conversationId },
      );
      if (context === null || context.transcript.length === 0) {
        continue;
      }

      const customerMessages = context.transcript.filter(
        (message) => message.direction === "incoming",
      );
      if (customerMessages.length === 0) {
        continue;
      }

      const transcript = context.transcript
        .map((message) => {
          const speaker = message.direction === "incoming" ? "Customer" : "Business";
          return `${speaker}: ${message.content}`;
        })
        .join("\n");

      const system = `You analyze the customer's overall sentiment in a support or sales conversation.

Focus only on the customer's tone, satisfaction, frustration, and emotional state.
Ignore the business/agent side except as context for what the customer is reacting to.

Classify the customer's overall sentiment as exactly one of:
- positive
- neutral
- negative

Use:
- positive when the customer sounds satisfied, appreciative, enthusiastic, or pleased
- neutral when the customer is factual, mixed, unclear, or emotionally flat
- negative when the customer sounds frustrated, angry, disappointed, or upset

Respond with ONLY this JSON object:
{
  "sentiment": "${CUSTOMER_SENTIMENTS.join('" | "')}"
}`;

      const prompt = `Analyze the customer's sentiment in this conversation:\n\n${transcript}`;

      try {
        const sentimentStart = Date.now();
        const { text, usage: sentimentUsage } = await generateText({
          model: openRouterModel(DEFAULT_OPENROUTER_MODEL),
          system,
          prompt,
        });
        await captureAIGeneration({
          distinctId: candidate.conversationId,
          traceId: candidate.conversationId,
          spanName: 'sentiment_analysis',
          model: DEFAULT_OPENROUTER_MODEL,
          provider: 'openrouter',
          inputTokens: sentimentUsage.inputTokens,
          outputTokens: sentimentUsage.outputTokens,
          latencySeconds: (Date.now() - sentimentStart) / 1000,
        });
        const sentiment = parseCustomerSentiment(text);
        processed++;
        if (sentiment === null) {
          continue;
        }
        await ctx.runMutation(internal.analyticsTopicRecords.assignConversationSentiment, {
          conversationId: candidate.conversationId,
          sentiment,
          sourceMessageMaxCreatedAt: Math.max(
            0,
            ...customerMessages.map((message) => message.createdAt),
          ),
        });
        assigned++;
      } catch (error) {
        console.error("Sentiment analysis failed", {
          conversationId: candidate.conversationId,
          error,
        });
      }
    }

    return { processed, assigned };
  },
});
