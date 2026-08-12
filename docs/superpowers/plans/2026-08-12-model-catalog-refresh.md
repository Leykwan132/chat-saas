# Model Catalog Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Amazon Nova Micro and GPT-OSS 120B with GPT-5.6 Luna and NVIDIA Nemotron 3.5 Lightning, then add Qwen3.7 Flash in every supported-model surface.

**Architecture:** `shared/planCatalog.ts` is the paid-plan entitlement and display-name source, while `convex/llm/modelPricing.ts` is the dashboard runtime availability source. Both replacement model IDs must be present in both registries; a separate historical-metadata helper keeps retired records readable in analytics without making them selectable.

**Tech Stack:** TypeScript, Convex, Vitest, Docusaurus MDX, Node.js 22, Bun.

## Global Constraints

- Use the exact OpenRouter IDs `openai/gpt-5.6-luna`, `nvidia/nemotron-3.5-lightning`, and `qwen/qwen3.7-flash`.
- Keep Ilmu Mini V3.3 as the Free/default model.
- Grant the three new models to Starter, Growth, and Business only; use the existing one-credit price and Advanced/Latest labels.
- Run scripts and tests under Node.js 22.
- Keep code files below 300 lines and do not add comments.
- Do not add a production changelog entry until production availability is confirmed.

---

### Task 1: Define the intended catalog contract

**Files:**
- Modify: `convex/llm/modelPricing.test.ts`
- Test: `convex/llm/modelPricing.test.ts`

**Interfaces:**
- Consumes: `getModelPricing(modelId)`, `listEnabledModels()`, and `PLAN_CATALOG`.
- Produces: Regression coverage for retired model exclusion and replacement model metadata/entitlements.

- [ ] **Step 1: Write the failing exclusion regression**

```ts
test("retired models are unavailable and excluded from plan entitlements", () => {
  const enabledModelIds = listEnabledModels().map((model) => model.value);
  const planModelIds = Object.values(PLAN_CATALOG).flatMap((plan) => plan.models);

  for (const modelId of ["amazon/nova-micro-v1", "openai/gpt-oss-120b"]) {
    expect(getModelPricing(modelId)).toBeNull();
    expect(enabledModelIds).not.toContain(modelId);
    expect(planModelIds).not.toContain(modelId);
  }
});
```

- [ ] **Step 2: Write the failing replacement-model regression**

```ts
test.each([
  ["openai/gpt-5.6-luna", "OpenAI GPT-5.6 Luna", "OpenAI", "openai"],
  ["nvidia/nemotron-3.5-lightning", "NVIDIA Nemotron 3.5 Lightning", "NVIDIA", "nvidia"],
])("%s is enabled for every paid plan", (modelId, label, chef, chefSlug) => {
  const model = listEnabledModels().find((entry) => entry.value === modelId);

  expect(model).toMatchObject({
    label,
    creditCost: 1,
    provider: "openrouter",
    chef,
    chefSlug,
    requiredPlan: "starter",
    labels: ["advanced", "latest"],
  });
  expect(plansWithModel(modelId)).toEqual(["starter", "growth", "business"]);
});
```

- [ ] **Step 3: Run the focused test and verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && TMPDIR=/private/tmp BUN_TMPDIR=/private/tmp BUN_INSTALL_CACHE_DIR=/private/tmp/bun-cache bunx vitest run convex/llm/modelPricing.test.ts`

Expected: FAIL because the retired records remain and neither replacement model is configured.

### Task 2: Refresh the supported-model registries and guide

**Files:**
- Modify: `shared/planCatalog.ts`
- Modify: `convex/llm/modelPricing.ts`
- Modify: `kilobot-docs/docs/build-your-agent/agent-setup.mdx`
- Modify: `kilobot-docs/tests/guide-outcomes.test.mjs`
- Modify: `src/components/landing/LandingAppPreviewAgentSetup.tsx`
- Modify: `src/lib/fakeUsageData.ts`
- Modify: `src/config/upgradeScenarios.ts`

**Interfaces:**
- Consumes: The Task 1 model IDs and metadata.
- Produces: Paid-plan entitlement, dashboard support data, and customer documentation that name the same six models.

- [ ] **Step 1: Replace the two retired IDs in `ADVANCED_PLAN_MODELS` and `MODEL_DISPLAY_NAMES`**

```ts
  "openai/gpt-5.6-luna",
  "nvidia/nemotron-3.5-lightning",
```

- [ ] **Step 2: Replace the Amazon Nova Micro and GPT-OSS 120B pricing records**

```ts
  "openai/gpt-5.6-luna": {
    label: "OpenAI GPT-5.6 Luna",
    creditCost: 1,
    enabled: true,
    provider: "openrouter",
    chef: "OpenAI",
    chefSlug: "openai",
    requiredPlan: "starter",
    labels: ["advanced", "latest"],
  },
```

```ts
  "nvidia/nemotron-3.5-lightning": {
    label: "NVIDIA Nemotron 3.5 Lightning",
    creditCost: 1,
    enabled: true,
    provider: "openrouter",
    chef: "NVIDIA",
    chefSlug: "nvidia",
    requiredPlan: "starter",
    labels: ["advanced", "latest"],
  },
```

- [ ] **Step 3: Replace the retired rows in the Agent Setup supported-model table and its source assertions**

The guide, landing preview, fake usage display, and Starter upgrade copy must no longer advertise Amazon Nova Micro or GPT-OSS 120B and must include the replacement models where they show named options.

- [ ] **Step 4: Run focused pricing and guide tests and verify GREEN**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && TMPDIR=/private/tmp BUN_TMPDIR=/private/tmp BUN_INSTALL_CACHE_DIR=/private/tmp/bun-cache bunx vitest run convex/llm/modelPricing.test.ts`

Run: `source ~/.nvm/nvm.sh && nvm use 22 && node --test kilobot-docs/tests/guide-outcomes.test.mjs`

Expected: Both commands exit 0.

### Task 3: Preserve historical analytics labels

**Files:**
- Create: `shared/modelMetadata.ts`
- Create: `shared/modelMetadata.test.ts`
- Modify: `convex/creditUsageAnalytics.ts`
- Create: `convex/creditUsageAnalytics.test.ts`
- Modify: `convex/credits.ts`
- Modify: `src/components/analytics/modelLeaderboardUtils.ts`
- Modify: `src/components/analytics/modelLeaderboardUtils.test.ts`

**Interfaces:**
- Consumes: retired model IDs stored in existing credit and usage records.
- Produces: their original customer-facing labels and provider names without exposing them through `listEnabledModels()`.

- [ ] **Step 1: Write failing historical-label regressions for Amazon Nova Micro and GPT-OSS 120B**

```ts
expect(getCreditUsageModelLabel("amazon/nova-micro-v1")).toBe("Amazon Nova Micro");
expect(getCreditUsageModelLabel("openai/gpt-oss-120b")).toBe("OpenAI GPT-OSS 120B");
```

- [ ] **Step 2: Add a historical metadata helper and use it in credit history and leaderboard fallbacks**

The helper returns `{ label, chef }` only for the two retired IDs. Runtime availability and plan entitlements must continue to reject both IDs.

- [ ] **Step 3: Run the historical-label tests and verify GREEN**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && TMPDIR=/private/tmp BUN_TMPDIR=/private/tmp BUN_INSTALL_CACHE_DIR=/private/tmp/bun-cache bunx vitest run shared/modelMetadata.test.ts convex/creditUsageAnalytics.test.ts src/components/analytics/modelLeaderboardUtils.test.ts`

Expected: The historical labels and providers render correctly while removed IDs remain unavailable.

### Task 4: Verify and publish the isolated change

**Files:**
- Modify: `CONTINUITY.md`
- Create: `docs/superpowers/specs/2026-08-12-model-catalog-refresh-design.md`
- Create: `docs/superpowers/plans/2026-08-12-model-catalog-refresh.md`

**Interfaces:**
- Consumes: The completed model-catalog update and verification evidence.
- Produces: A committed, pushed draft PR from `codex/model-catalog-refresh`.

- [ ] **Step 1: Confirm the active catalog has no retired IDs**

Run: `rg -n 'amazon/nova-micro-v1|openai/gpt-oss-120b' shared convex/llm kilobot-docs/docs/build-your-agent/agent-setup.mdx`

Expected: No matches.

- [ ] **Step 2: Run scoped lint, production build, and whitespace validation**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && TMPDIR=/private/tmp BUN_TMPDIR=/private/tmp BUN_INSTALL_CACHE_DIR=/private/tmp/bun-cache bunx eslint shared/planCatalog.ts convex/llm/modelPricing.ts convex/llm/modelPricing.test.ts`

Run: `source ~/.nvm/nvm.sh && nvm use 22 && TMPDIR=/private/tmp BUN_TMPDIR=/private/tmp BUN_INSTALL_CACHE_DIR=/private/tmp/bun-cache bun run build`

Run: `git diff --check`

Expected: All commands exit 0.

- [ ] **Step 3: Record the unreleased state, commit, push, and open a draft PR**

Stage only the model catalog, tests, documentation, plan, specification, and ledger files. Commit with `Refresh supported model catalog`, push `codex/model-catalog-refresh`, and open a draft pull request targeting `main`.
