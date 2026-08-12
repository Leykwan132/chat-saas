# Model Metric Icons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add approved inline Lucide icons beside the four model HoverCard metric labels.

**Architecture:** Keep the icon mapping local to `ModelScoreHoverCard` because it is presentation-only and has one consumer. Render each icon inside the existing metric label without changing scorecard data or the two-column metric layout.

**Tech Stack:** React, TypeScript, Lucide React, Vitest

## Global Constraints

- Use Node.js v22 for every script and test command.
- Quality uses `Gem`, Speed uses `Gauge`, Reasoning uses `Brain`, and Value uses `BadgeDollarSign`.
- Icons are decorative, muted, 14px, inline with visible labels, and have no badge or background container.
- Numeric metric scores remain right-aligned.
- Keep every code file below 300 lines and add no source comments.

---

### Task 1: Model metric icon treatment

**Files:**
- Modify: `src/components/ModelScoreHoverCard.test.tsx`
- Modify: `src/components/ModelScoreHoverCard.tsx`
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: `scorecard.metrics` with `quality`, `speed`, `reasoning`, and `value` numeric properties.
- Produces: Existing metric rows with visible labels, right-aligned scores, and decorative Lucide icons.

- [ ] **Step 1: Write the failing regression assertions**

Import `Gem`, `Gauge`, `Brain`, and `BadgeDollarSign` in `ModelScoreHoverCard.test.tsx`. Collect each rendered icon by component type and assert that all four exist with `className="size-3.5 shrink-0 text-muted-foreground"` and `aria-hidden={true}`. Keep the existing assertions for visible metric labels and scores.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/ModelScoreHoverCard.test.tsx
```

Expected: FAIL because none of the four approved metric icons render yet.

- [ ] **Step 3: Add the minimal icon mapping and renderer**

In `ModelScoreHoverCard.tsx`, import the approved Lucide components and define:

```tsx
const metricIcons = {
  quality: Gem,
  speed: Gauge,
  reasoning: Brain,
  value: BadgeDollarSign,
} as const;
```

For each metric row, select `MetricIcon` from the mapping and render it directly before the visible label:

```tsx
<dt className="flex items-center gap-1.5 text-muted-foreground">
  <MetricIcon
    aria-hidden="true"
    className="size-3.5 shrink-0 text-muted-foreground"
  />
  <span>{metricLabels[metricKey]}</span>
</dt>
```

Do not add a wrapper background, badge, tooltip, or separate scorecard data field.

- [ ] **Step 4: Run focused and branch verification**

Run the focused test, scoped ESLint, TypeScript, production build, application suite excluding `kilobot-docs/**`, Docs native tests, `git diff --check`, and code-size checks under Node 22. Expected: all supported gates pass.

- [ ] **Step 5: Record and commit the verified result**

Update the top `CONTINUITY.md` entry from pending to implemented with fresh verification receipts. Leave the production changelog unchanged because availability remains unconfirmed.

```bash
git add CONTINUITY.md src/components/ModelScoreHoverCard.test.tsx src/components/ModelScoreHoverCard.tsx docs/superpowers/plans/2026-08-12-model-metric-icons.md
git commit -m "Add model metric icons"
```
