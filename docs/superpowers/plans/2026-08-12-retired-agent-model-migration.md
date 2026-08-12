# Retired Agent Model Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate agents using Amazon Nova Micro or Google Gemini 3.1 Flash Lite to DeepSeek V4 Flash through OpenRouter.

**Architecture:** Generalize the existing bounded `@convex-dev/migrations` job from one Gemini identifier to a retired-model set. Keep a pure patch helper for exact, idempotent test coverage.

**Tech Stack:** Convex, `@convex-dev/migrations`, TypeScript, Vitest

## Global Constraints

- Read `convex/_generated/ai/guidelines.md` before editing Convex code.
- Run every script under Node v22.
- Keep every code file below 300 lines and add no source comments.
- Do not add request-time fallback behavior.
- Leave the public changelog unchanged while production availability is unconfirmed.

---

### Task 1: Generalize the migration

**Files:**
- Modify: `convex/agentModelMigration.test.ts`
- Modify: `convex/agentModelMigration.ts`

**Interfaces:**
- Produces: `getRetiredModelMigrationPatch(agent): { model: 'deepseek/deepseek-v4-flash'; provider: 'openrouter' } | undefined`.
- Produces: `migrateRetiredAgentModels` and `runMigrateRetiredAgentModels`.

- [ ] **Step 1: Add the failing Amazon case and rename the contract**

Test the same DeepSeek/OpenRouter patch for `amazon/nova-micro-v1` and `google/gemini-3.1-flash-lite`. Test `qwen/qwen3.7-flash` and DeepSeek return `undefined`.

```ts
for (const model of ['amazon/nova-micro-v1', 'google/gemini-3.1-flash-lite']) {
  expect(getRetiredModelMigrationPatch({ model })).toEqual({
    model: 'deepseek/deepseek-v4-flash',
    provider: 'openrouter',
  });
}
```

- [ ] **Step 2: Verify RED**

Run `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/agentModelMigration.test.ts`.

Expected: FAIL because the helper and migration currently cover only Gemini.

- [ ] **Step 3: Implement the retired-model set**

Use a readonly set containing the two exact retired IDs. Return the constant DeepSeek/OpenRouter patch only when the set contains `agent.model`. Rename the migration definition and runner to describe all retired agents while preserving batch size 25.

```ts
const RETIRED_AGENT_MODELS = new Set([
  'amazon/nova-micro-v1',
  'google/gemini-3.1-flash-lite',
]);

export function getRetiredModelMigrationPatch(agent: { model: string }) {
  if (!RETIRED_AGENT_MODELS.has(agent.model)) return undefined;
  return { model: 'deepseek/deepseek-v4-flash', provider: 'openrouter' as const };
}
```

- [ ] **Step 4: Verify GREEN and commit**

Run the focused test, scoped ESLint, and TypeScript. Commit both files with message `Migrate retired agent models to DeepSeek`.

### Task 2: Release verification record

**Files:**
- Modify: `CONTINUITY.md`

**Interfaces:**
- Produces: an operational record requiring deploy, run, and verification of `runMigrateRetiredAgentModels` before catalog removal.

- [ ] **Step 1: Record the migration sequence**

State that both retired IDs are covered, the target is DeepSeek/OpenRouter, the migration has not been run against a deployment unless a verified run occurs, and catalog removal must follow successful migration verification.

- [ ] **Step 2: Commit**

Commit the ledger update with the final task verification record.
