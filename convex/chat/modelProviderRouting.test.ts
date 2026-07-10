import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

function readSource(relativePath: string) {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");
}

test("selected-model chat paths use provider-aware resolution", () => {
  const threads = readSource("./threads.ts");
  const inboxActions = readSource("./inboxActions.ts");
  const streaming = readSource("./streaming.ts");

  expect(threads).toContain("resolveLanguageModel(agent.model)");
  expect(threads).not.toContain("openRouterModel(agent.model)");
  expect(inboxActions.match(/resolveLanguageModel\(modelId\)/g)).toHaveLength(2);
  expect(inboxActions).not.toMatch(/provider:\s*['"]openrouter['"]/);
  expect(streaming).not.toMatch(/provider:\s*['"]openrouter['"]/);
});

test("usage tracking records the provider of the model used for each call", () => {
  const threads = readSource("./threads.ts");

  expect(threads).toMatch(
    /const \{[^}]*provider[^}]*\} = args;/s,
  );
  expect(threads).not.toContain("provider: resolvedModel.provider");
  expect(threads).toContain("provider,\n        usage:");
  expect(threads).toContain("provider,\n        inputTokens:");
});
