"use node";

import { internalAction, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { generateText } from "ai";
import { openRouterModel } from "./llm/openRouter";
import { DEFAULT_OPENROUTER_MODEL } from "./llm/modelPricing";
import { isAdvancedAnalyticsPlan } from "../shared/planCatalog";

type TopicDetectionResult = {
  topics?: TopicDetectionTopic[];
  topic?: string;
  existingTopicId?: string | null;
  confidence?: number;
  summary?: string;
};

type TopicDetectionTopic = {
  topic?: string;
  existingTopicId?: string | null;
  confidence?: number;
  description?: string;
  summary?: string;
};

const MAX_TOPICS_PER_CONVERSATION = 5;

function stripJsonFence(raw: string) {
  return raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function parseTopicDetection(raw: string): TopicDetectionTopic[] | null {
  try {
    const parsed = JSON.parse(stripJsonFence(raw)) as TopicDetectionResult | TopicDetectionTopic[];
    const rawTopics = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.topics)
        ? parsed.topics
        : parsed.topic !== undefined
          ? [parsed]
          : [];
    const topics = rawTopics
      .filter((topic) => typeof topic.topic === "string" && topic.topic.trim().length > 0)
      .slice(0, MAX_TOPICS_PER_CONVERSATION);
    if (topics.length === 0) {
      return null;
    }
    return topics;
  } catch {
    return null;
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

export const runDailyTopicDetection = internalAction({
  args: {},
  handler: async (ctx) => {
    const candidates = await ctx.runQuery(
      internal.analyticsTopicRecords.listTopicCandidates,
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

      const existingTopics = context.existingTopics
        .map((topic) => {
          const detail = topic.description ? ` — ${topic.description}` : "";
          return `- ${topic.id}: ${topic.name}${detail}`;
        })
        .join("\n") || "- None";
      const transcript = context.transcript
        .map((message) => {
          const speaker = message.direction === "incoming" ? "Customer" : "Business";
          return `${speaker}: ${message.content}`;
        })
        .join("\n");

      const system = `You classify customer conversation topics for analytics.

Return 1 to ${MAX_TOPICS_PER_CONVERSATION} specific topics, ordered from most important to least important.

Topic naming rules:
- Be specific about the customer's issue, request, or intent.
- Prefer concrete labels such as "Delayed shipment past promised date", "Refund for damaged item", or "Same-day delivery unavailable".
- Reuse an existing topic id when the conversation clearly matches that topic.
- Avoid vague labels like "General inquiry", "Question", "Support", or single-word categories.
- Do not include personal identifiers such as names, phone numbers, order IDs, or dates.

For each topic provide:
- topic: a specific short label (3-8 words)
- description: 2-3 sentences explaining what customers usually mean by this topic and the common issue behind it
- summary: one sentence describing how this specific conversation relates to the topic
- existingTopicId: topic id from the list or null
- confidence: 0.0 to 1.0

Existing topics:
${existingTopics}

Respond with ONLY this JSON object:
{
  "topics": [
    {
      "topic": "Specific Topic Label",
      "description": "What this topic means and the customer issue it represents.",
      "summary": "How this conversation relates to the topic.",
      "existingTopicId": "topic id from the list or null",
      "confidence": 0.0 to 1.0
    }
  ]
}`;

      const prompt = `Detect the conversation topics:\n\n${transcript}`;
      try {
        const { text } = await generateText({
          model: openRouterModel(DEFAULT_OPENROUTER_MODEL),
          system,
          prompt,
        });
        const parsed = parseTopicDetection(text);
        processed++;
        if (parsed === null) {
          continue;
        }
        await ctx.runMutation(
          internal.analyticsTopicRecords.assignConversationTopic,
          {
            conversationId: candidate.conversationId,
            topics: parsed.map((topic) => ({
              topicName: topic.topic!.trim(),
              existingTopicId: topic.existingTopicId ?? undefined,
              confidence: Math.max(0, Math.min(1, topic.confidence ?? 0.5)),
              description: topic.description?.trim() || undefined,
              summary: topic.summary?.trim() || undefined,
            })),
            sourceMessageMaxCreatedAt: context.sourceMessageMaxCreatedAt,
          },
        );
        assigned++;
      } catch (error) {
        console.error("Topic detection failed", {
          conversationId: candidate.conversationId,
          error,
        });
      }
    }

    return { processed, assigned };
  },
});
