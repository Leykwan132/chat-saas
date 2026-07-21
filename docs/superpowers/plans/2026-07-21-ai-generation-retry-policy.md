# AI Generation Retry Policy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply one explicit three-retry provider policy to every backend `generateText` and `generateObject` path without replaying surrounding Convex action side effects.

**Architecture:** A focused `convex/llm/retryPolicy.ts` module owns the retry count. Direct AI SDK calls pass it as `maxRetries`, while the shared Convex `Agent` passes it through `callSettings`, allowing the SDK to retain retryability classification, exponential backoff, and `Retry-After` handling.

**Tech Stack:** TypeScript 6, Convex 1.36, AI SDK 6, `@convex-dev/agent` 0.6, Vitest 1.6, Bun, Node 22.

## Global Constraints

- `AI_GENERATION_MAX_RETRIES` is exactly `3`, meaning four total provider attempts.
- Retry only provider or SDK errors marked transient and retryable; do not add a broad catch-and-retry loop.
- Do not wrap these paths with Action Retrier or register its Convex component.
- Do not change prompts, schemas, models, timeouts, usage accounting, credits, public APIs, or deployment state.
- All scripts and tests run after `source ~/.nvm/nvm.sh && nvm use 22` in the same shell command.
- New code files must remain below 300 lines and contain no comments.
- Preserve unrelated existing changes in `package.json`, `bun.lock`, `.codex/`, and `CONTINUITY.md`.

---

### Task 1: Apply the shared provider retry policy

**Files:**
- Create: `convex/aiGenerationRetryPolicy.test.ts`
- Create: `convex/llm/retryPolicy.ts`
- Modify: `convex/_generated/api.d.ts` through the active Convex code generator
- Modify: `convex/analyticsInsights.ts`
- Modify: `convex/chat/inboxActions.ts`
- Modify: `convex/chat/threads.ts`

**Interfaces:**
- Produces: `AI_GENERATION_MAX_RETRIES: 3` from `convex/llm/retryPolicy.ts`.
- Consumes: AI SDK `maxRetries` on direct `generateText` and `generateObject` options.
- Consumes: `callSettings.maxRetries` on the shared `Agent` configuration returned by `buildAgent`.
- Preserves: the existing `configuredAgent.generateText` and `configuredAgent.generateObject` call signatures in `convex/chat/inbox.ts` and `convex/chat/workflowActionPlanner.ts`.

- [ ] **Step 1: Write the failing source-contract test**

Create `convex/aiGenerationRetryPolicy.test.ts`:

```typescript
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
  expect(inbox.match(/configuredAgent\.generateText\(/g)).toHaveLength(2);
  expect(workflowPlanner.match(/configuredAgent\.generateObject\(/g)).toHaveLength(1);
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
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/aiGenerationRetryPolicy.test.ts
```

Expected: FAIL because `convex/llm/retryPolicy.ts` does not exist and generation call sites do not yet specify the shared retry policy.

- [ ] **Step 3: Add the minimal shared policy and direct-call integrations**

Create `convex/llm/retryPolicy.ts`:

```typescript
export const AI_GENERATION_MAX_RETRIES = 3;
```

In `convex/analyticsInsights.ts`, import the constant:

```typescript
import { AI_GENERATION_MAX_RETRIES } from "./llm/retryPolicy";
```

Add the option to its direct structured generation call:

```typescript
const { object, usage } = await generateObject({
  model: openRouterModel(DEFAULT_OPENROUTER_MODEL),
  schema: analyticsInsightsSchema,
  system: buildAnalyticsInsightsSystemPrompt(context.existingTopics),
  prompt: buildAnalyticsInsightsPrompt(context.transcript),
  maxRetries: AI_GENERATION_MAX_RETRIES,
});
```

In `convex/chat/inboxActions.ts`, import the constant:

```typescript
import { AI_GENERATION_MAX_RETRIES } from "../llm/retryPolicy";
```

Add the option to both direct text generation calls:

```typescript
const { text, usage: leadUsage } = await generateText({
  model: resolvedModel.languageModel,
  prompt,
  system: systemPrompt,
  maxRetries: AI_GENERATION_MAX_RETRIES,
});
```

```typescript
const { text, usage: summaryUsage } = await generateText({
  model: resolvedModel.languageModel,
  prompt,
  system: systemPrompt,
  maxRetries: AI_GENERATION_MAX_RETRIES,
});
```

- [ ] **Step 4: Apply the policy to the shared Convex Agent**

In `convex/chat/threads.ts`, import the constant:

```typescript
import { AI_GENERATION_MAX_RETRIES } from "../llm/retryPolicy";
```

Add the shared call setting to the existing `Agent` configuration:

```typescript
return new Agent(components.agent, {
  name: agent.name,
  languageModel: resolvedModel.languageModel,
  callSettings: { maxRetries: AI_GENERATION_MAX_RETRIES },
  instructions,
  stopWhen: stepCountIs(8),
  tools,
  usageHandler: async (ctx, args) => {
```

- [ ] **Step 5: Run the focused test and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/aiGenerationRetryPolicy.test.ts
```

Expected: PASS with 4 tests.

- [ ] **Step 6: Run relevant AI and workflow regression tests**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/analyticsInsightsSource.test.ts convex/chat/workflowActionPlanner.test.ts convex/chat/modelProviderRouting.test.ts
```

Expected: PASS with no failures or warnings caused by the retry-policy change.

- [ ] **Step 7: Run scoped static verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint convex/aiGenerationRetryPolicy.test.ts convex/llm/retryPolicy.ts convex/analyticsInsights.ts convex/chat/inboxActions.ts convex/chat/threads.ts
git diff --check
test "$(wc -l < convex/llm/retryPolicy.ts)" -lt 300
test "$(wc -l < convex/aiGenerationRetryPolicy.test.ts)" -lt 300
```

Expected: all commands exit 0. Existing oversized legacy files are not expanded structurally beyond the minimal retry option and import.

- [ ] **Step 8: Commit only the retry implementation and plan**

```bash
git add docs/superpowers/plans/2026-07-21-ai-generation-retry-policy.md convex/aiGenerationRetryPolicy.test.ts convex/llm/retryPolicy.ts convex/_generated/api.d.ts convex/analyticsInsights.ts convex/chat/inboxActions.ts convex/chat/threads.ts CONTINUITY.md
git commit -m "Add explicit AI generation retries"
```

Expected: one commit containing only the implementation plan, retry policy, focused test, generated API registration, three production integrations, and continuity update. Existing `package.json`, `bun.lock`, and `.codex/` changes remain unstaged.
