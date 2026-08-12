# Remove Model Scorecard Languages Implementation Plan

**Goal:** Remove explicit language metadata and the Languages section from every model-selection hover card while preserving model identity, summary, rating, and metric scores.

**Architecture:** Keep the scorecard configuration as the single source for rating, metric, and descriptive content. Remove the unused language type and values from that configuration, then simplify the hover card so its metric grid is the final section.

**Tech Stack:** React, TypeScript, Vitest, react-test-renderer, Tailwind CSS

---

### Task 1: Prove the language UI and metadata are removed

**Files:**
- Modify: `src/config/modelScorecards.test.ts`
- Modify: `src/components/ModelScoreHoverCard.test.tsx`

1. Change the configuration contract test to reject a `languages` property while retaining complete rating and metric coverage.
2. Change the rendered hover-card test to reject a Languages heading, language slots, and language check icons while retaining rating, identity, description, and metric assertions.
3. Run the two focused tests under Node 22 and confirm they fail only because the existing language metadata and UI remain.

### Task 2: Remove the language metadata and UI

**Files:**
- Modify: `src/config/modelScorecards.ts`
- Modify: `src/components/ModelScoreHoverCard.tsx`

1. Remove `ModelLanguage` and each scorecard's `languages` array.
2. Remove the language section and its check-icon dependency from the hover card.
3. Run the two focused tests under Node 22 and confirm they pass.

### Task 3: Verify and hand off

**Files:**
- Modify: `CONTINUITY.md`

1. Run scoped ESLint, TypeScript, production build, and whitespace checks under Node 22.
2. Run the application and Docs suites used by this branch.
3. Confirm touched code files remain below 300 lines and review the final diff.
4. Record the verified local state in `CONTINUITY.md`; leave the unreleased changelog unchanged.
5. Commit the focused change and fast-forward the local `codex/model-catalog-refresh` checkout.
