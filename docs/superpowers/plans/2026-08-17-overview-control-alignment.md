# Overview Control Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the unused metric-card space and align the Overview range controls as ghost buttons on the right.

**Architecture:** Keep the existing range state and ToggleGroup behavior. Change only the Overview header layout, the ToggleGroup visual variant, and metric-card sizing so the queries and selection behavior remain unchanged.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Radix Toggle Group, Vitest server rendering.

## Global Constraints

- Keep the selected range visibly filled and all unselected ranges ghost-style.
- Keep the title left-aligned and the date plus ranges right-aligned at the `sm` breakpoint and above.
- Keep the compact metric cards selectable and content-sized.
- Keep code self-explanatory with no comments and under 300 lines per code file.
- Run tests with Node 22 in the same shell command.

---

### Task 1: Cover the revised Overview presentation

**Files:**
- Modify: `src/pages/AgentOverviewPage.test.tsx`
- Modify: `src/pages/AgentOverviewPage.tsx`
- Modify: `src/components/agent-overview/AgentOverviewTimeRangeButtons.tsx`
- Modify: `src/components/agent-overview/AgentOverviewMetrics.tsx`

**Interfaces:**
- Consumes: `AgentOverviewPage` with its existing `CreditTimeRange` state and `AgentOverviewMetrics` selection callback.
- Produces: responsive split header markup, ghost range controls with a selected state, and metric cards with no reserved preview height.

- [ ] **Step 1: Write the failing test**

Add rendering assertions for the responsive `sm:justify-between` header, the ghost ToggleGroup variant, the selected ToggleGroup state, and the absence of the old `min-h-[116px]` metric-card class.

```tsx
expect(markup).toContain('sm:justify-between');
expect(markup).toContain('data-variant="ghost"');
expect(markup).toContain('data-state="on"');
expect(metricsMarkup).not.toContain('min-h-[116px]');
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/AgentOverviewPage.test.tsx
```

Expected: FAIL because the header has no responsive split layout, the range ToggleGroup uses `outline`, and cards preserve the removed chart height.

- [ ] **Step 3: Write the minimal implementation**

In `AgentOverviewPage.tsx`, use a responsive header container with `sm:justify-between` and retain the period label plus range controls in the right-side group.

In `AgentOverviewTimeRangeButtons.tsx`, switch the ToggleGroup variant to `ghost` and retain its existing `data-state=on` muted fill behavior from the shared component.

In `AgentOverviewMetrics.tsx`, remove the unused `rows` destructuring, remove `min-h-[116px]` and `justify-between` from metric cells and skeletons, and keep the two-line label/value spacing.

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/AgentOverviewPage.test.tsx
```

Expected: PASS with the split header, ghost buttons, selected state, and no reserved metric space.

- [ ] **Step 5: Verify and publish the branch update**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/AgentOverviewPage.test.tsx src/pages/DashboardDescribedPageHeaders.test.ts src/components/agent-overview/agentOverviewTrendModel.test.ts && bun run build && git diff --check
```

Then commit the listed files plus `CONTINUITY.md` and push `codex/overview-date-range-controls` to update PR #62.
