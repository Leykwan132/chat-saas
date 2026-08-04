import { expect, test } from "vitest";
import {
  analyticsInsightsSchema,
  buildAnalyticsInsightsPrompt,
  buildAnalyticsInsightsSystemPrompt,
} from "./analyticsInsightsContract";
import {
  ADVANCED_ANALYTICS_INCLUDES,
  isAdvancedAnalyticsPlan,
} from "../shared/planCatalog";

  const validInsights = {
  topics: [
    {
      topic: "Pricing",
      description: "Customers ask about prices and plan differences.",
      summary: "The customer asked for the current price.",
      existingTopicId: null,
      confidence: 0.93,
    },
  ],
  sentiment: "positive",
  leadTemperature: "hot",
} as const;

test("combined analytics schema accepts topics, sentiment, and lead temperature", () => {
  expect(analyticsInsightsSchema.parse(validInsights)).toEqual(validInsights);
  expect(() =>
    analyticsInsightsSchema.parse({ ...validInsights, sentiment: "excited" }),
  ).toThrow();
  expect(() =>
    analyticsInsightsSchema.parse({ ...validInsights, leadTemperature: "boiling" }),
  ).toThrow();
});

test("combined analytics prompt covers all three analyses", () => {
  const system = buildAnalyticsInsightsSystemPrompt([
    { id: "topic-1", name: "Pricing", description: "Pricing requests" },
  ]);
  const prompt = buildAnalyticsInsightsPrompt([
    { direction: "incoming", content: "How much is it?" },
    { direction: "outgoing", content: "It starts at RM99." },
  ]);

  expect(system).toContain("1 to 5 specific topics");
  expect(system).toContain("1-2 words");
  expect(system).not.toContain("3-8 word topic labels");
  expect(system).toContain("positive, neutral, or negative");
  expect(system).toContain("hot, warm, or cold");
  expect(system).toContain("topic-1: Pricing");
  expect(prompt).toContain("Customer: How much is it?");
  expect(prompt).toContain("Business: It starts at RM99.");
});

test("pricing lists every combined Advanced Analytics insight", () => {
  expect(ADVANCED_ANALYTICS_INCLUDES).toEqual([
    "Common Topic Detection",
    "Customer Sentiment",
    "Lead Temperature",
  ]);
});

test("daily combined analytics is limited to Growth and Business", () => {
  expect(isAdvancedAnalyticsPlan("free")).toBe(false);
  expect(isAdvancedAnalyticsPlan("starter")).toBe(false);
  expect(isAdvancedAnalyticsPlan("growth")).toBe(true);
  expect(isAdvancedAnalyticsPlan("business")).toBe(true);
});
