# Model Recommended Scenarios Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one or two clear recommended scenarios to every supported model HoverCard.

**Architecture:** Store recommendations beside each scorecard's rating and metrics as a one-or-two-item tuple. Render a lightweight final section with semantic text rows and a green rounded white-check marker.

**Tech Stack:** React 19, TypeScript, Vitest, Lucide React, Tailwind CSS

## Global Constraints

- Run every script under Node v22.
- Keep every code file below 300 lines and add no source comments.
- Preserve existing ratings, identity, descriptions, and metrics.
- Use no recommendation cards, badges, or outer scenario containers.
- Leave the public changelog unchanged while production availability is unconfirmed.

---

### Task 1: Typed recommendation data

**Files:**
- Modify: `src/config/modelScorecards.test.ts`
- Modify: `src/config/modelScorecards.ts`

**Interfaces:**
- Produces: `recommendedFor: readonly [string] | readonly [string, string]` on every `ModelScorecard`.

- [ ] **Step 1: Add failing exact-data assertions**

Assert every enabled scorecard has one or two non-empty recommendations and assert the exact approved mapping for all seven models.

```ts
expect(MODEL_SCORECARDS['qwen/qwen3.7-flash'].recommendedFor).toEqual([
  'Fast Chinese-language replies',
  'Chinese and English conversations',
]);
```

- [ ] **Step 2: Verify RED**

Run `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/config/modelScorecards.test.ts`.

Expected: FAIL because scorecards do not expose `recommendedFor`.

- [ ] **Step 3: Add the typed approved mapping**

Add the exact scenario pairs from the design table without changing scores or descriptions.

```ts
export type ModelRecommendations = readonly [string] | readonly [string, string];

recommendedFor: [
  'Fast Chinese-language replies',
  'Chinese and English conversations',
]
```

- [ ] **Step 4: Verify GREEN and commit**

Run the focused test and commit both files with message `Add model recommendation scenarios`.

### Task 2: Recommended-for HoverCard section

**Files:**
- Modify: `src/components/ModelScoreHoverCard.test.tsx`
- Modify: `src/components/ModelScoreHoverCard.tsx`

**Interfaces:**
- Consumes: `scorecard.recommendedFor`.
- Produces: final `data-slot="model-recommendations"` section and one `data-slot="model-recommendation"` per scenario.

- [ ] **Step 1: Add failing rendered-behavior assertions**

Assert `Recommended for` appears after the metric `dl`, Qwen renders both exact scenarios, each row contains a Lucide Check, each check wrapper is rounded and green, each icon is white, and scenario rows have no badge/card background.

```ts
expect(text).toContain('Recommended for');
expect(text).toContain('Fast Chinese-language replies');
expect(text).toContain('Chinese and English conversations');
expect(recommendationChecks).toHaveLength(2);
```

- [ ] **Step 2: Verify RED**

Run `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/ModelScoreHoverCard.test.tsx`.

Expected: FAIL because the section does not exist.

- [ ] **Step 3: Render the lightweight section**

Import `Check`; append the section after `dl`; use a small `rounded-md bg-emerald-600` marker with `text-white`; keep scenario text in normal foreground styling.

```tsx
<span className="inline-flex size-5 items-center justify-center rounded-md bg-emerald-600">
  <Check className="size-3.5 text-white" />
</span>
```

- [ ] **Step 4: Verify GREEN and commit**

Run both scorecard tests, scoped ESLint, and TypeScript. Commit both files with message `Show model recommendations in hover cards`.

### Task 3: Final verification

**Files:**
- Modify: `CONTINUITY.md`

**Interfaces:**
- Produces: verified local handoff for all three plans.

- [ ] **Step 1: Run branch-level gates**

Run focused tests, scoped ESLint, `bunx tsc --noEmit`, `bun run build`, application Vitest excluding Docs, Docs Node tests, `git diff --check`, and code-file line counts under Node 22.

- [ ] **Step 2: Record and commit the verified state**

Update `CONTINUITY.md` with test counts and unreleased status. Do not update the changelog. Commit with message `Document agent template and model guidance verification`.
