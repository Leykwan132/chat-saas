# Ilmu Mini Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `ilmu-mini-v3.3` through Ilmu's OpenAI-compatible API, make it the only Free model, keep every other model on paid plans, display the supplied logo, and include Ilmu token costs in admin reporting.

**Architecture:** Extend the existing model catalog with provider, image, and optional MYR token-rate metadata. Route selected models through one resolver that returns a language model plus stable provider identity; preserve provider-reported OpenRouter costs and calculate configured Ilmu costs from stored usage.

**Tech Stack:** TypeScript 6, Convex, AI SDK 6, `@convex-dev/agent`, `@ai-sdk/openai-compatible@2.0.59`, React 19, Vitest, shadcn-derived UI components.

## Global Constraints

- Run every script or test with `source ~/.nvm/nvm.sh && nvm use 22` in the same shell command.
- Keep every code file below 300 lines.
- Add no production-code comments.
- Use `ILMU_API_KEY`; missing configuration must throw and must not fall back to another provider.
- Ilmu pricing is RM0.20/M input tokens and RM1.20/M output tokens.
- Product charging remains one credit per message.
- Ilmu Mini V3.3 is the only Free model; Amazon Nova Micro, DeepSeek V4 Flash, and every other model require Starter or higher.
- Preserve unrelated user changes.

---

### Task 1: Catalog metadata and plan entitlements

**Files:**
- Modify: `convex/llm/modelPricing.test.ts`
- Modify: `convex/llm/modelPricing.ts`
- Modify: `shared/planCatalog.ts`

**Interfaces:**
- Produces: `ModelProvider = "openrouter" | "ilmu"`
- Produces: `getModelProvider(modelId: string): ModelProvider`
- Produces: enabled model rows with `provider`, optional `imageUrl`, `inputCostMyrPerMillion`, and `outputCostMyrPerMillion`

- [ ] **Step 1: Write the failing catalog tests**

Add this helper and these assertions:

```ts
function plansWithModel(modelId: string) {
  return Object.entries(PLAN_CATALOG)
    .filter(([, plan]) => plan.models.includes(modelId))
    .map(([planKey]) => planKey);
}

function modelById(modelId: string) {
  return listEnabledModels().find((entry) => entry.value === modelId);
}

test("Ilmu Mini V3.3 is enabled for every plan", () => {
  const model = listEnabledModels().find((entry) => entry.value === "ilmu-mini-v3.3");
  expect(model).toMatchObject({
    label: "Ilmu Mini V3.3",
    provider: "ilmu",
    chef: "YTL AI Labs",
    chefSlug: "ilmu",
    requiredPlan: "free",
    labels: ["basic", "latest"],
    imageUrl: "https://storage.kilobot.app/ytl_ai_labs-removebg-preview.png",
    inputCostMyrPerMillion: 0.2,
    outputCostMyrPerMillion: 1.2,
  });
  expect(plansWithModel("ilmu-mini-v3.3")).toEqual(["free", "starter", "growth", "business"]);
});

test("DeepSeek V4 Flash is popular and paid", () => {
  expect(modelById("deepseek/deepseek-v4-flash")).toMatchObject({
    requiredPlan: "starter",
    labels: ["advanced", "popular"],
    isPopular: true,
  });
  expect(plansWithModel("deepseek/deepseek-v4-flash")).toEqual(["starter", "growth", "business"]);
});
```

- [ ] **Step 2: Verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/llm/modelPricing.test.ts --reporter=dot`

Expected: failures because Ilmu is absent and DeepSeek is still Free/basic.

- [ ] **Step 3: Implement the catalog and plan changes**

Add provider and optional metadata fields to `ModelPricingEntry`, add the Ilmu entry, return those fields from `listEnabledModels`, and make `getModelProvider` throw `Selected model is not available` for an unknown model. Add Ilmu to `ADVANCED_PLAN_MODELS` and `MODEL_DISPLAY_NAMES`; set the Free plan list to Ilmu only and make Amazon Nova Micro Starter-required.

- [ ] **Step 4: Verify GREEN**

Run the focused catalog test again and expect all tests to pass.

---

### Task 2: AI SDK-compatible provider routing and persistence

**Files:**
- Create: `convex/llm/ilmu.ts`
- Create: `convex/llm/languageModel.ts`
- Create: `convex/llm/languageModel.test.ts`
- Modify: `package.json`
- Modify: `bun.lock`
- Modify: `convex/schema.ts`
- Modify: `convex/agents.ts`
- Modify: `convex/chat/threads.ts`
- Modify: `convex/chat/inboxActions.ts`
- Modify: `convex/chat/streaming.ts`

**Interfaces:**
- Produces: `ilmuModel(modelId: string)`
- Produces: `resolveLanguageModel(modelId: string): { languageModel: LanguageModel; provider: ModelProvider }`
- Consumes: `getModelProvider(modelId)` from Task 1

- [ ] **Step 1: Write failing routing tests**

```ts
test("resolves Ilmu through the compatible provider", () => {
  process.env.ILMU_API_KEY = "test-ilmu-key";
  const resolved = resolveLanguageModel("ilmu-mini-v3.3");
  expect(resolved.provider).toBe("ilmu");
  expect(resolved.languageModel.modelId).toBe("ilmu-mini-v3.3");
});

test("throws when Ilmu credentials are missing", () => {
  delete process.env.ILMU_API_KEY;
  expect(() => resolveLanguageModel("ilmu-mini-v3.3")).toThrow("ILMU_API_KEY is not configured");
});
```

- [ ] **Step 2: Verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/llm/languageModel.test.ts --reporter=dot`

Expected: module-not-found failure because the resolver does not exist.

- [ ] **Step 3: Align the provider package**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bun add @ai-sdk/openai-compatible@2.0.59`

Expected: `package.json` and `bun.lock` resolve provider-v3 dependencies compatible with AI SDK 6.

- [ ] **Step 4: Implement provider modules**

`convex/llm/ilmu.ts` creates the compatible client with base URL `https://api.ilmu.ai/v1`, name `ilmu`, and the required API key. `convex/llm/languageModel.ts` switches on catalog provider and returns the language model plus stable provider identity.

- [ ] **Step 5: Route all selected-model call paths**

Use `resolveLanguageModel` in `buildAgent`, lead-temperature generation, thread-summary generation, and playground message metadata. Persist derived provider identity during agent create/update and allow `ilmu` in the agents schema. Fixed-default analytics jobs remain on `openRouterModel`.

- [ ] **Step 6: Verify GREEN**

Run the routing and catalog tests together and expect them to pass.

---

### Task 3: Ilmu usage-cost accounting

**Files:**
- Create: `shared/currency.ts`
- Create: `convex/llm/modelCost.ts`
- Create: `convex/llm/modelCost.test.ts`
- Modify: `convex/agentCostAggregateModel.ts`
- Modify: `convex/aggregates.ts`
- Modify: `src/components/admin/adminUsageCostsModel.ts`
- Modify: `src/components/admin/adminUsageCostsModel.test.ts`

**Interfaces:**
- Produces: `USD_TO_MYR_RATE = 4.7`
- Produces: `calculateConfiguredModelCostUsd(modelId, usage): number | null`
- Produces: `resolveAgentCostUsd(row): number | null`

- [ ] **Step 1: Write failing cost tests**

```ts
test("calculates Ilmu cost from input and output tokens", () => {
  expect(calculateConfiguredModelCostUsd("ilmu-mini-v3.3", {
    promptTokens: 1_000_000,
    completionTokens: 1_000_000,
  })).toBeCloseTo(1.4 / 4.7, 9);
});

test("returns null for models without configured token rates", () => {
  expect(calculateConfiguredModelCostUsd("amazon/nova-micro-v1", {
    promptTokens: 1_000,
    completionTokens: 1_000,
  })).toBeNull();
});
```

Add these aggregate-model assertions:

```ts
test("prefers provider-reported OpenRouter cost", () => {
  expect(resolveAgentCostUsd({
    model: "ilmu-mini-v3.3",
    providerMetadata: { openrouter: { usage: { cost: 0.5 } } },
    usage: { promptTokens: 1_000_000, completionTokens: 1_000_000 },
  })).toBe(0.5);
});

test("uses configured Ilmu cost when provider cost is absent", () => {
  expect(resolveAgentCostUsd({
    model: "ilmu-mini-v3.3",
    providerMetadata: undefined,
    usage: { promptTokens: 1_000_000, completionTokens: 1_000_000 },
  })).toBeCloseTo(1.4 / 4.7, 9);
});
```

- [ ] **Step 2: Verify RED**

Run the new cost tests and expect module-not-found or missing-export failures.

- [ ] **Step 3: Implement cost resolution**

Move the shared FX constant to `shared/currency.ts`. Calculate Ilmu MYR usage from catalog rates, divide by `USD_TO_MYR_RATE`, and round with `roundUsd`. Replace OpenRouter-only aggregate namespace and sum logic with `resolveAgentCostUsd` while retaining OpenRouter metadata precedence.

- [ ] **Step 4: Verify GREEN**

Run model-cost, admin-cost-model, and admin usage cost tests together and expect them to pass.

---

### Task 4: Ilmu model image in model-list surfaces

**Files:**
- Create: `src/components/ai-elements/modelSelectorLogo.test.ts`
- Modify: `src/components/ai-elements/model-selector.tsx`
- Modify: `src/components/ModelPicker.tsx`
- Modify: `src/pages/LeaderboardPage.tsx`

**Interfaces:**
- Produces: `getModelSelectorLogoSource(provider: string, imageUrl?: string): string`
- Consumes: enabled model `imageUrl` from Task 1

- [ ] **Step 1: Write failing logo-source tests**

```ts
test("uses a custom model image when supplied", () => {
  const imageUrl = "https://storage.kilobot.app/ytl_ai_labs-removebg-preview.png";
  expect(getModelSelectorLogoSource("ilmu", imageUrl)).toBe(imageUrl);
});

test("uses models.dev for ordinary providers", () => {
  expect(getModelSelectorLogoSource("deepseek"))
    .toBe("https://models.dev/logos/deepseek.svg");
});
```

- [ ] **Step 2: Verify RED**

Run the logo-source test and expect a missing-export failure.

- [ ] **Step 3: Implement logo selection with the hosted asset**

Add the pure source helper, add optional `src` to `ModelSelectorLogo`, add `imageUrl` to `ModelPickerOption`, and pass it in list, trigger, and Supported LLM Models states. Use the verified hosted JPEG URL directly.

- [ ] **Step 4: Verify GREEN and line limits**

Run the logo and catalog tests. Confirm `ModelPicker.tsx` and every new code file remain below 300 lines.

---

### Task 5: Generated types and full verification

**Files:**
- Modify generated output only through Convex code generation.
- Update: `CONTINUITY.md`

**Interfaces:**
- Consumes all prior task outputs.
- Produces verified generated API/schema types and final implementation receipts.

- [ ] **Step 1: Generate Convex types**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && STRIPE_PRICE_STARTER_MONTHLY=mock_starter_monthly STRIPE_PRICE_STARTER_ANNUAL=mock_starter_annual STRIPE_PRICE_GROWTH_MONTHLY=mock_growth_monthly STRIPE_PRICE_GROWTH_ANNUAL=mock_growth_annual STRIPE_PRICE_BUSINESS_MONTHLY=mock_business_monthly STRIPE_PRICE_BUSINESS_ANNUAL=mock_business_annual STRIPE_PRICE_EXTRA_CREDITS_2000=mock_extra_2000 STRIPE_PRICE_EXTRA_CREDITS_5000=mock_extra_5000 STRIPE_PRICE_EXTRA_CREDITS_15000=mock_extra_15000 bunx convex codegen
```

Expected: code generation completes without schema or type errors.

- [ ] **Step 2: Run focused and adjacent tests**

Run the combined model catalog, routing, cost, admin cost, logo, agent usage, and chat regression suites. Expected: all pass with no unhandled errors.

- [ ] **Step 3: Run static verification**

Run targeted ESLint for touched TypeScript files, `bunx tsc -b --pretty false`, `bun run build`, `git diff --check`, and line-count checks. Expected: all pass; the existing Vite chunk warning is acceptable if unchanged.

- [ ] **Step 4: Inspect final diff and update continuity**

Confirm only scoped implementation, generated output, the supplied image, plan/spec documentation, dependency alignment, and continuity changes are present. Record RED/GREEN and verification receipts in `CONTINUITY.md`.
