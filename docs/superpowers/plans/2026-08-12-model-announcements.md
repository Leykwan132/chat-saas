# Model Refresh and Announcements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove Google Gemini 3.1 Flash Lite safely, reintroduce GPT-OSS 120B as a low-cost model, adjust model credit costs, and add a scrollable What’s new dialog to authenticated headers.

**Architecture:** `shared/planCatalog.ts` controls selectable paid models, while `convex/llm/modelPricing.ts` controls dashboard runtime metadata and credit costs. A small `WhatsNewDialog` component consumes local announcement data and is mounted beside `SupportHoverCard` in the dashboard and workspace headers.

**Tech Stack:** TypeScript, React, shadcn/ui Dialog and ScrollArea, Vitest, Node.js 22, Bun.

## Global Constraints

- Remove `google/gemini-3.1-flash-lite` from every current model-support surface and migrate persisted Gemini agents to `deepseek/deepseek-v4-flash` before release.
- Charge Qwen3.7 Flash and GPT-OSS 120B 0.5 credits, DeepSeek and NVIDIA one credit, and GPT-5.6 Luna two credits.
- Keep Qwen, NVIDIA, and Luna available only to Starter, Growth, and Business with Advanced and Latest labels.
- Use local structured announcement data with no persistence or backend schema.
- Use the existing Dialog and ScrollArea components, include DialogTitle and DialogDescription, and keep the list scrollable.
- Run tests and scripts under Node.js 22.
- Do not update the public release changelog until production availability is confirmed.

---

### Task 1: Lock the refreshed model contract

**Files:**
- Modify: `convex/llm/modelPricing.test.ts`
- Modify: `src/config/agentLimits.test.ts`
- Modify: `src/components/landing/landingAppPreviewData.test.ts`
- Modify: `kilobot-docs/tests/guide-outcomes.test.mjs`

**Interfaces:**
- Consumes: `listEnabledModels()`, `PLAN_CATALOG`, upgrade copy, and the Agent Setup guide.
- Produces: regression coverage for the current selectable catalog and its credit prices.

- [ ] **Step 1: Write failing model assertions**

```ts
expect(getModelPricing('google/gemini-3.1-flash-lite')).toBeNull();
expect(model.creditCost).toBe(0.5);
expect(luna.creditCost).toBe(2);
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && TMPDIR=/private/tmp BUN_TMPDIR=/private/tmp BUN_INSTALL_CACHE_DIR=/private/tmp/bun-cache bunx vitest run convex/llm/modelPricing.test.ts src/config/agentLimits.test.ts src/components/landing/landingAppPreviewData.test.ts`

Expected: FAIL because Gemini remains enabled and Qwen/Luna have the prior prices.

- [ ] **Step 3: Update all current catalog surfaces**

```ts
"qwen/qwen3.7-flash": { creditCost: 0.5 }
"openai/gpt-5.6-luna": { creditCost: 2 }
```

- [ ] **Step 4: Run the focused tests and Docs guide test to verify GREEN**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && TMPDIR=/private/tmp BUN_TMPDIR=/private/tmp BUN_INSTALL_CACHE_DIR=/private/tmp/bun-cache bunx vitest run convex/llm/modelPricing.test.ts src/config/agentLimits.test.ts src/components/landing/landingAppPreviewData.test.ts`

Run: `source ~/.nvm/nvm.sh && nvm use 22 && node --test kilobot-docs/tests/guide-outcomes.test.mjs`

Expected: both commands exit 0.

### Task 2: Add the What’s new announcement dialog

**Files:**
- Create: `src/components/whats-new/announcements.ts`
- Create: `src/components/WhatsNewDialog.tsx`
- Create: `src/components/WhatsNewDialog.test.ts`
- Modify: `src/layouts/DashboardLayout.tsx`
- Modify: `src/pages/WorkspacePage.tsx`
- Modify: `src/components/SupportHoverCard.test.ts`

**Interfaces:**
- Consumes: local `ANNOUNCEMENTS` data and existing shadcn `Button`, `Dialog`, and `ScrollArea` components.
- Produces: `WhatsNewDialog`, mounted before support in both authenticated headers.

- [ ] **Step 1: Write failing UI and header-placement tests**

```ts
expect(componentSource).toContain('New, more capable AI models');
expect(componentSource).toContain('<ScrollArea');
expect(componentSource).toContain('<DialogTitle>What’s new</DialogTitle>');
expect(dashboardSource).toContain('<WhatsNewDialog />');
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && TMPDIR=/private/tmp BUN_TMPDIR=/private/tmp BUN_INSTALL_CACHE_DIR=/private/tmp/bun-cache bunx vitest run src/components/WhatsNewDialog.test.ts src/components/SupportHoverCard.test.ts`

Expected: FAIL because the component and header trigger do not exist.

- [ ] **Step 3: Implement local data and dialog**

```tsx
<Dialog>
  <DialogTrigger asChild><Button aria-label="What’s new" /></DialogTrigger>
  <DialogContent>
    <DialogHeader><DialogTitle>What’s new</DialogTitle></DialogHeader>
    <ScrollArea className="max-h-[60vh]">...</ScrollArea>
  </DialogContent>
</Dialog>
```

- [ ] **Step 4: Mount the trigger beside support in both authenticated headers**

```tsx
<WhatsNewDialog />
<SupportHoverCard />
```

- [ ] **Step 5: Run the focused tests to verify GREEN**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && TMPDIR=/private/tmp BUN_TMPDIR=/private/tmp/bun-cache bunx vitest run src/components/WhatsNewDialog.test.ts src/components/SupportHoverCard.test.ts`

Expected: both tests exit 0.

### Task 3: Verify and prepare review

**Files:**
- Modify: `CONTINUITY.md`

- [ ] **Step 1: Run verification**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && TMPDIR=/private/tmp BUN_TMPDIR=/private/tmp/bun-cache bunx eslint shared/planCatalog.ts convex/llm/modelPricing.ts convex/llm/modelPricing.test.ts src/components/WhatsNewDialog.tsx src/components/WhatsNewDialog.test.ts src/layouts/DashboardLayout.tsx src/pages/WorkspacePage.tsx src/components/SupportHoverCard.test.ts src/config/upgradeScenarios.ts src/config/agentLimits.test.ts && npx tsc --noEmit && bun run build && git diff --check`

Expected: exit 0.

- [ ] **Step 2: Update the continuity ledger**

Record the model costs, modal behavior, verification outcome, and unconfirmed production availability.

- [ ] **Step 3: Release Gemini migration before catalog removal**

Deploy `agentModelMigration.ts` while Google Gemini 3.1 Flash Lite is still enabled, then run:

```sh
npx convex run --prod agentModelMigration:runMigrateGoogleGeminiAgents '{"dryRun":true}'
npx convex run --prod agentModelMigration:runMigrateGoogleGeminiAgents
```

Verify the migration completes, then deploy the catalog-removal and announcement release. Do not leave Google-configured agents in a deployment where the model is unavailable.

- [ ] **Step 4: Request independent review and leave the branch ready for local review**
