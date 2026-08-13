# Remove Scorecard Languages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove language presentation and unused language metadata from model scorecards.

**Architecture:** Delete the language field and type from the scorecard configuration because the HoverCard is its only consumer. Remove the complete Languages section from `ModelScoreHoverCard`, leaving metrics as the final section, and simplify the existing scorecard regressions around the resulting contract.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Vitest.

## Global Constraints

- Run every script under Node v22.
- Keep code files below 300 lines and add no source comments.
- Remove the Languages heading, lists, checks, and progress presentation from the HoverCard.
- Remove `languages` and `ModelLanguage` from scorecard configuration.
- Preserve all ratings, metrics, model identity, and two-sentence descriptions.
- Production availability remains unconfirmed, so do not update the public changelog.

---

### Task 1: Language-free model scorecards

**Files:**
- Modify: `src/config/modelScorecards.test.ts`
- Modify: `src/components/ModelScoreHoverCard.test.tsx`
- Modify: `src/config/modelScorecards.ts`
- Modify: `src/components/ModelScoreHoverCard.tsx`
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: existing scorecard overall rating, metrics, and description.
- Produces: `ModelScorecard` without `languages`; `ModelScoreHoverCard` ending at its four-metric `dl`.

- [ ] **Step 1: Write failing removal tests**

  Remove language expectations from the scorecard fixture type and assert each scorecard has only `overall`, `metrics`, and `description`. Update the HoverCard regression to assert no `Languages` text, `Check` icons, or `model-language*` slots appear.

- [ ] **Step 2: Run focused tests to verify RED**

  Run:

  ```bash
  source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/config/modelScorecards.test.ts src/components/ModelScoreHoverCard.test.tsx
  ```

  Expected: FAIL because scorecards still expose `languages` and the HoverCard still renders its Languages section.

- [ ] **Step 3: Remove language data and presentation**

  Delete `ModelLanguage`, the `languages` field and values, the `Check` import, and the entire `model-languages` section. Keep the metrics `dl` as the final HoverCard child.

- [ ] **Step 4: Run focused verification to verify GREEN**

  Run:

  ```bash
  source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/config/modelScorecards.test.ts src/components/ModelScoreHoverCard.test.tsx
  ```

  Expected: all tests pass.

- [ ] **Step 5: Run the scoped quality gate**

  Run:

  ```bash
  source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/config/modelScorecards.ts src/config/modelScorecards.test.ts src/components/ModelScoreHoverCard.tsx src/components/ModelScoreHoverCard.test.tsx
  source ~/.nvm/nvm.sh && nvm use 22 && bunx tsc --noEmit
  source ~/.nvm/nvm.sh && nvm use 22 && bun run build
  git diff --check
  ```

  Expected: all commands pass; the build may retain only established bundle-size warnings.

- [ ] **Step 6: Record continuity and commit**

  Record the verified unreleased simplification in `CONTINUITY.md`, leave the changelog unchanged, stage only task-owned files, and commit with:

  ```bash
  git commit -m "Remove model scorecard languages"
  ```
