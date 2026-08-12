# Model Scorecard Hierarchy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorder each model HoverCard around the rating, identity, two-sentence guidance, metrics, and plainly presented languages.

**Architecture:** Keep model-specific editorial content in `MODEL_SCORECARDS`, replacing the narrow `bestFor` value with a complete two-sentence `description`. Keep `ModelScoreHoverCard` responsible for presentation and expose stable data slots for testing the approved hierarchy without coupling tests to incidental wrapper structure.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, shadcn HoverCard, `@smastrom/react-rating`, Lucide React, Vitest.

## Global Constraints

- Run every script under Node v22.
- Keep code files below 300 lines and add no source comments.
- The rating row is first and contains the one-decimal score plus 88px read-only StickerStars.
- Remove the visible `Kilobot rating` and standalone `Best for` labels.
- Place model identity second and its two-sentence description immediately below.
- Place Quality, Speed, Reasoning, and Value below the description.
- End with a `Languages` section whose language text has no pill background; only each green check’s small rounded wrapper uses the neutral background.
- Production availability remains unconfirmed, so do not update the public changelog.

---

### Task 1: Scorecard content and HoverCard hierarchy

**Files:**
- Modify: `src/config/modelScorecards.test.ts`
- Modify: `src/components/ModelScoreHoverCard.test.tsx`
- Modify: `src/config/modelScorecards.ts`
- Modify: `src/components/ModelScoreHoverCard.tsx`
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: existing model IDs, ratings, metrics, languages, labels, chef slugs, and provider logos.
- Produces: `ModelScorecard.description: string` containing exactly two sentences and data slots `model-rating`, `model-identity`, `model-description`, `model-languages`, `model-language`, and `model-language-check`.

- [x] **Step 1: Write failing scorecard-content tests**

  Replace `bestFor` expectations with literal two-sentence `description` values. Assert every enabled scorecard has exactly two non-empty sentences and begins with `Best for`.

- [x] **Step 2: Write the failing HoverCard hierarchy test**

  Assert the rating precedes identity, the description immediately follows identity, metrics precede `Languages`, and the visible text omits `Kilobot rating`. Assert language rows have no neutral background while their check wrappers include `rounded` and `bg-muted`, and the readable language label uses `text-foreground`.

- [x] **Step 3: Run focused tests to verify RED**

  Run:

  ```bash
  source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/config/modelScorecards.test.ts src/components/ModelScoreHoverCard.test.tsx
  ```

  Expected: FAIL because scorecards still expose `bestFor`, the identity precedes the rating, the old labels remain, and the entire language pill owns the neutral background.

- [x] **Step 4: Replace `bestFor` with two-sentence descriptions**

  Define the approved descriptions:

  ```ts
  'Best for free Malay-first customer conversations. It also handles straightforward English support.'
  'Best for general-purpose Chinese customer conversations. It also supports everyday English interactions.'
  'Best for balanced everyday customer support. It works well across Chinese and English conversations.'
  'Best for budget-friendly reasoning tasks. It provides capable English support at the lowest paid credit tier.'
  'Best for conversations that need stronger overall performance. It handles English especially well and can also support Chinese.'
  'Best for fast English customer conversations. It prioritizes response speed while keeping reasoning balanced.'
  'Best for fast Chinese customer conversations. It also handles everyday English support reliably.'
  ```

- [x] **Step 5: Implement the approved visual order**

  Render rating, identity, description, metrics, then Languages. Use a plain flex row for each language, a `text-foreground` label, and a small `rounded-md bg-muted` wrapper around only the green check.

- [x] **Step 6: Run focused tests to verify GREEN**

  Run:

  ```bash
  source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/config/modelScorecards.test.ts src/components/ModelScoreHoverCard.test.tsx
  ```

  Expected: all focused tests pass.

- [x] **Step 7: Run the scoped quality gate**

  Run:

  ```bash
  source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/config/modelScorecards.ts src/config/modelScorecards.test.ts src/components/ModelScoreHoverCard.tsx src/components/ModelScoreHoverCard.test.tsx
  source ~/.nvm/nvm.sh && nvm use 22 && bunx tsc --noEmit
  source ~/.nvm/nvm.sh && nvm use 22 && bun run build
  git diff --check
  ```

  Expected: all commands pass; the production build may retain only established environment or bundle-size warnings.

- [x] **Step 8: Record continuity and commit**

  Record the verified unreleased change in `CONTINUITY.md`, leave the changelog unchanged, stage only task-owned files, and commit with:

  ```bash
  git commit -m "Refine model scorecard content"
  ```
