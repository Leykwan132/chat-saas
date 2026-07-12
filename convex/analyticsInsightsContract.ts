import { z } from "zod/v3";

export const analyticsInsightsSchema = z.object({
  topics: z
    .array(
      z.object({
        topic: z.string().min(1).max(80),
        description: z.string().min(1).max(500),
        summary: z.string().min(1).max(500),
        existingTopicId: z.string().nullable(),
        confidence: z.number().min(0).max(1),
      }),
    )
    .min(1)
    .max(5),
  sentiment: z.enum(["positive", "neutral", "negative"]),
  leadTemperature: z.enum(["hot", "warm", "cold"]),
});

export type AnalyticsInsights = z.infer<typeof analyticsInsightsSchema>;

type ExistingTopic = {
  id: string;
  name: string;
  description?: string;
};

type TranscriptMessage = {
  direction: "incoming" | "outgoing";
  content: string;
};

export function buildAnalyticsInsightsSystemPrompt(existingTopics: ExistingTopic[]) {
  const topicList =
    existingTopics
      .map((topic) => {
        const detail = topic.description ? ` — ${topic.description}` : "";
        return `- ${topic.id}: ${topic.name}${detail}`;
      })
      .join("\n") || "- None";

  return `Analyze a customer conversation for Advanced Analytics.

Return 1 to 5 specific topics, ordered from most important to least important.
- Use specific 3-8 word topic labels about the customer's issue, request, or intent.
- Reuse an existing topic id only when it clearly matches; otherwise return null.
- Never include personal identifiers.
- Provide a concise description, conversation summary, and confidence from 0 to 1.

Classify customer sentiment as exactly positive, neutral, or negative.
- Positive means satisfied, appreciative, enthusiastic, or pleased.
- Neutral means factual, mixed, unclear, or emotionally flat.
- Negative means frustrated, angry, disappointed, or upset.
- Judge only the customer; business messages are context.

Classify lead temperature as exactly hot, warm, or cold.
- Hot means strong buying intent such as pricing, demos, purchase readiness, comparisons, availability, or delivery.
- Warm means interested and exploring without commitment.
- Cold means disengaged, browsing without intent, or a dead-end support conversation.

Existing topics:
${topicList}`;
}

export function buildAnalyticsInsightsPrompt(messages: TranscriptMessage[]) {
  const transcript = messages
    .map((message) => {
      const speaker = message.direction === "incoming" ? "Customer" : "Business";
      return `${speaker}: ${message.content}`;
    })
    .join("\n");
  return `Analyze this conversation:\n\n${transcript}`;
}
