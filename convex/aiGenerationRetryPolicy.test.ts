import { existsSync, readFileSync } from "node:fs";
import { expect, test } from "vitest";

function source(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

test("defines one explicit three-retry AI generation policy", () => {
  const policyUrl = new URL("./llm/retryPolicy.ts", import.meta.url);

  expect(existsSync(policyUrl)).toBe(true);
  expect(readFileSync(policyUrl, "utf8")).toContain(
    "export const AI_GENERATION_MAX_RETRIES = 3;",
  );
});

test("applies the shared policy to every direct AI SDK generation call", () => {
  for (const [relativePath, callPattern, expectedCount] of [
    ["./analyticsInsights.ts", /\bgenerateObject\(\{/g, 1],
    ["./chat/inboxActions.ts", /\bgenerateText\(\{/g, 2],
  ] as const) {
    const moduleSource = source(relativePath);

    expect(moduleSource.match(callPattern)).toHaveLength(expectedCount);
    expect(
      moduleSource.match(/maxRetries:\s*AI_GENERATION_MAX_RETRIES/g),
    ).toHaveLength(expectedCount);
  }
});

test("applies the shared policy to every Convex Agent generation call", () => {
  const agentFactory = source("./chat/threads.ts");
  const inbox = source("./chat/inbox.ts");
  const workflowPlanner = source("./chat/workflowActionPlanner.ts");

  expect(agentFactory).toContain(
    "callSettings: { maxRetries: AI_GENERATION_MAX_RETRIES },",
  );
  expect(inbox.match(/configuredAgent\.generateText\(/g)).toHaveLength(1);
  expect(workflowPlanner.match(/configuredAgent\.generateObject\(/g)).toHaveLength(1);
  expect(workflowPlanner).toContain("AI_GENERATION_MAX_RETRIES");
  expect(workflowPlanner).toContain("maxAttempts = AI_GENERATION_MAX_RETRIES + 1");
  expect(workflowPlanner).toContain("Workflow action plan generation failed; retrying");
});

test("does not retry whole Convex actions", () => {
  const retryTargets = [
    source("./analyticsInsights.ts"),
    source("./chat/inbox.ts"),
    source("./chat/inboxActions.ts"),
    source("./chat/workflowActionPlanner.ts"),
    source("./chat/threads.ts"),
  ].join("\n");

  expect(retryTargets).not.toContain("ActionRetrier");
  expect(source("./convex.config.ts")).not.toContain("actionRetrier");
});
