# Remove Amazon Model Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fully remove Amazon Nova Micro from supported models without a migration or compatibility path.

**Architecture:** The shared plan catalog remains the entitlement source and Convex model pricing remains the runtime availability source. Removing the model from both makes it unselectable and causes existing validation to reject its identifier, while UI typing and public documentation are cleaned up to match.

**Tech Stack:** TypeScript, Convex, Vitest, React, Docusaurus MDX, Node.js 22, Bun

## Global Constraints

- No existing agent uses `amazon/nova-micro-v1`; do not add a migration or fallback.
- Run all scripts and tests under Node.js 22.
- Keep code files under 300 lines and do not add comments.
- Do not add a production changelog entry until production availability is confirmed.

---

### Task 1: Prove Amazon models are unavailable

**Files:**
- Modify: `convex/llm/modelPricing.test.ts`
- Test: `convex/llm/modelPricing.test.ts`

**Interfaces:**
- Consumes: `getModelPricing(modelId)`, `listEnabledModels()`, and `PLAN_CATALOG`.
- Produces: A regression contract that treats `amazon/nova-micro-v1` as unavailable and unentitled.

- [ ] **Step 1: Replace the paid-plan availability test with the failing unsupported-model regression**

```ts
test("Amazon models are unavailable and excluded from plan entitlements", () => {
  const enabledModelIds = listEnabledModels().map((model) => model.value);
  const planModelIds = Object.values(PLAN_CATALOG).flatMap((plan) => plan.models);

  expect(getModelPricing("amazon/nova-micro-v1")).toBeNull();
  expect(enabledModelIds).not.toContain("amazon/nova-micro-v1");
  expect(planModelIds).not.toContain("amazon/nova-micro-v1");
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && TMPDIR=/private/tmp BUN_TMPDIR=/private/tmp BUN_INSTALL_CACHE_DIR=/private/tmp/bun-cache bunx vitest run convex/llm/modelPricing.test.ts`

Expected: FAIL because `getModelPricing("amazon/nova-micro-v1")` still returns the enabled pricing entry.

### Task 2: Remove the model and align fixtures and docs

**Files:**
- Modify: `shared/planCatalog.ts`
- Modify: `convex/llm/modelPricing.ts`
- Modify: `convex/llm/modelPricing.test.ts`
- Modify: `convex/llm/modelCost.test.ts`
- Modify: `src/components/ai-elements/model-selector.tsx`
- Modify: `kilobot-docs/docs/build-your-agent/agent-setup.mdx`
- Modify: `kilobot-docs/tests/guide-outcomes.test.mjs`

**Interfaces:**
- Consumes: The regression from Task 1 and the existing unavailable-model validation path.
- Produces: Catalogs, UI typing, fixtures, and docs with no Amazon-specific model support.

- [ ] **Step 1: Delete Amazon Nova Micro from runtime pricing and plan catalogs**

The resulting `ADVANCED_PLAN_MODELS` and `MODEL_DISPLAY_NAMES` contain only the five supported entries, and `MODEL_PRICING` starts with `ilmu-mini-v3.3`:

```ts
export const ADVANCED_PLAN_MODELS = [
  "ilmu-mini-v3.3",
  "deepseek/deepseek-v4-flash",
  "google/gemini-3.1-flash-lite",
  "openai/gpt-oss-120b",
  "xiaomi/mimo-v2.5",
] as const;
```

- [ ] **Step 2: Remove the `"amazon-bedrock"` literal from `ModelSelectorLogoProps.provider`**

Keep the existing `(string & {})` escape hatch unchanged so generic provider strings remain accepted.

- [ ] **Step 3: Use `openai/gpt-oss-120b` in generic no-custom-metadata and no-token-rate tests**

```ts
const model = listEnabledModels().find(
  (entry) => entry.value === "openai/gpt-oss-120b",
);
```

```ts
calculateConfiguredModelCostUsd("openai/gpt-oss-120b", {
  promptTokens: 1_000,
  completionTokens: 1_000,
});
```

- [ ] **Step 4: Delete the Amazon Nova Micro table row and its `source.includes("Amazon Nova Micro")` assertion**
- [ ] **Step 5: Run the focused pricing, cost, and Docs tests and verify GREEN**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && TMPDIR=/private/tmp BUN_TMPDIR=/private/tmp BUN_INSTALL_CACHE_DIR=/private/tmp/bun-cache bunx vitest run convex/llm/modelPricing.test.ts convex/llm/modelCost.test.ts`

Run: `source ~/.nvm/nvm.sh && nvm use 22 && node --test kilobot-docs/tests/guide-outcomes.test.mjs`

Expected: All focused tests pass.

### Task 3: Verify and publish

**Files:**
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: The completed implementation and test evidence.
- Produces: A verified commit pushed to `codex/landing-whatsapp-live-demo` and a draft PR attempt.

- [ ] **Step 1: Confirm no Amazon-specific support references remain**

Run: `rg -n -i 'amazon|nova-micro|nova micro|amazon-bedrock' shared convex src kilobot-docs`

Expected: No matches outside historical planning records.

- [ ] **Step 2: Run scoped ESLint**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint shared/planCatalog.ts convex/llm/modelPricing.ts convex/llm/modelPricing.test.ts convex/llm/modelCost.test.ts src/components/ai-elements/model-selector.tsx`

Expected: Exit 0.

- [ ] **Step 3: Run the production build and whitespace validation**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && TMPDIR=/private/tmp BUN_TMPDIR=/private/tmp BUN_INSTALL_CACHE_DIR=/private/tmp/bun-cache bun run build`

Run: `git diff --check`

Expected: Both commands exit 0; established local environment and bundle-size warnings may remain.

- [ ] **Step 4: Record the unreleased result, stage only scoped files, and commit**
- [ ] **Step 5: Cherry-pick the commit into the primary local branch and push it**
- [ ] **Step 6: Retry draft PR creation through the connected GitHub app**
