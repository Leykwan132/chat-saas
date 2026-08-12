import { expect, test } from "vitest";
import { getHistoricalModelDisplayMetadata } from "./modelMetadata";

test.each([
  ["amazon/nova-micro-v1", "Amazon Nova Micro", "Amazon"],
  ["openai/gpt-oss-120b", "OpenAI GPT-OSS 120B", "OpenAI"],
])("preserves historical display metadata for %s", (modelId, label, chef) => {
  expect(getHistoricalModelDisplayMetadata(modelId)).toEqual({ label, chef });
});
