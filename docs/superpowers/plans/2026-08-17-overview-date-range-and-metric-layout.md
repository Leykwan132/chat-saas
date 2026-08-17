# Overview Date Range and Metric Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Agent Overview start with the last 30 days and give its metrics and selected trend chart a more compact, readable layout.

**Architecture:** Keep the existing Overview query, selection, and time-range architecture. Adjust the page’s initial local state and the two presentational agent-overview components; no backend contract changes are needed.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Recharts, Vitest, React server rendering.

## Global Constraints

- Initialize only the Agent Overview page to the `30d` rolling range; other usage pages remain unchanged.
- Keep Billing period and all existing range options available.
- Preserve metric-card selection behavior while removing only their decorative mini graphs.
- Use `AI conversations` for the visible metric and selected chart title.
- Keep code self-explanatory with no comments and under 300 lines per code file.
- Run tests using Node 22 in the same shell command.

---

### Task 1: Cover the compact Overview contract

**Files:**
- Create: `src/pages/AgentOverviewPage.test.tsx`
- Modify: `src/pages/AgentOverviewPage.tsx`
- Modify: `src/components/agent-overview/AgentOverviewMetrics.tsx`
- Modify: `src/components/agent-overview/AgentOverviewTrendChart.tsx`
- Delete: `src/components/agent-overview/AgentOverviewMetricPreview.tsx`

**Interfaces:**
- Consumes: `AgentOverviewPage` rendered at `/dashboard/:agentId/overview` with `useQuery` responses for the summary and usage queries.
- Produces: an Overview rendering that exposes the selected Last 30 days range, compact selectable metrics, and an `AI conversations` selected chart title.

- [ ] **Step 1: Write the failing test**

Create `src/pages/AgentOverviewPage.test.tsx`. Mock `convex/react` and `usePermissions`, render the page through a `MemoryRouter`, and return completed literal fixtures only when its query receives `30d`. Assert the rendered page shows the Overview content and `AI conversations`. Render `AgentOverviewMetrics` directly with a literal metric and assert its label occurs before its value with no SVG. Render `AgentOverviewTrendChart` with no rows and assert its empty state occupies 400px.

```tsx
expect(markup).toContain('>Overview</h1>');
expect(markup).toContain('AI conversations');
expect(metricsMarkup.indexOf('AI conversations')).toBeLessThan(metricsMarkup.indexOf('12'));
expect(metricsMarkup).not.toContain('<svg');
expect(emptyTrendMarkup).toContain('height:400px');
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/AgentOverviewPage.test.tsx
```

Expected: FAIL because the page initially selects Billing period, uses the old AI-assisted copy, renders the metric preview SVG, and uses the taller chart height.

- [ ] **Step 3: Write the minimal implementation**

In `src/pages/AgentOverviewPage.tsx`, initialize `timeRange` with `useState<CreditTimeRange>('30d')` and replace the AI metric label with `AI conversations`.

In `src/components/agent-overview/AgentOverviewMetrics.tsx`, remove the preview dependency, render the label before the value, and use a compact text-only card layout. Preserve its existing props to avoid changing its consumer contract. Update its skeleton to match the shorter two-line card.

In `src/components/agent-overview/AgentOverviewTrendChart.tsx`, change the visible AI label in both chart-label maps to `AI conversations`, set `CHART_HEIGHT` to `400`, and reduce the skeleton to match the smaller card.

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/AgentOverviewPage.test.tsx
```

Expected: PASS with a rendered Last 30 days default, compact text-only metric cards, and the shortened label.

- [ ] **Step 5: Run focused regression coverage**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/AgentOverviewPage.test.tsx src/pages/DashboardDescribedPageHeaders.test.ts src/components/agent-overview/agentOverviewTrendModel.test.ts
```

Expected: PASS with no changed dashboard-header or trend-model behavior.

- [ ] **Step 6: Commit**

```bash
git add src/pages/AgentOverviewPage.test.tsx src/pages/AgentOverviewPage.tsx src/components/agent-overview/AgentOverviewMetrics.tsx src/components/agent-overview/AgentOverviewTrendChart.tsx src/components/agent-overview/AgentOverviewMetricPreview.tsx CONTINUITY.md docs/superpowers/specs/2026-08-17-overview-last-30-days-default-design.md docs/superpowers/plans/2026-08-17-overview-date-range-and-metric-layout.md
git commit -m "Compact overview metrics and default date range"
```

### Task 2: Verify the local handoff

**Files:**
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: the implemented local worktree and focused test results.
- Produces: an accurate continuity receipt and a clean local checkout ready for user testing.

- [ ] **Step 1: Check the complete change set**

Run:

```bash
git diff --check
git status --short
```

Expected: no whitespace errors and only the expected documentation/implementation changes before the final commit.

- [ ] **Step 2: Update the continuity ledger**

Record the new Overview default, metric layout, and focused test receipt in `CONTINUITY.md` with the current date and provenance tags.

- [ ] **Step 3: Confirm the local test handoff**

Run:

```bash
git log -1 --oneline
git status --short
```

Expected: the compact Overview change is the current local commit and the checkout has no pending changes from this task.
