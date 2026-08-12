import { expect, test } from "vitest";
import { getCreditUsageModelLabel } from "./creditUsageAnalytics";

test.each([
  ["amazon/nova-micro-v1", "Amazon Nova Micro"],
  ["openai/gpt-oss-120b", "OpenAI GPT-OSS 120B"],
])("keeps the historical label for %s", (modelId, label) => {
  expect(getCreditUsageModelLabel(modelId)).toBe(label);
});
