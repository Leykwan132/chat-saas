# Overview Date Shortcut Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Agent Overview time-range dropdown with persistent shortcuts beside its read-only date range.

**Architecture:** Keep the existing `CreditTimeRange` values and query contract. A small Overview-only control component will use the installed Toggle Group, while the page moves the current range label and new controls beneath the title.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, shadcn Toggle Group, Vitest, React server rendering.

## Global Constraints

- Use only existing Billing period, 7d, 30d, and 90d range values.
- Display the active date range beside the buttons; do not make it a dropdown or date picker.
- Remove the time-range control from the chart header and retain its data-mode control.
- Keep dedicated usage pages unchanged.
- Keep code self-explanatory with no comments and under 300 lines per code file.
- Run tests using Node 22 in the same shell command.

---

### Task 1: Add persistent Overview range shortcuts

**Files:**
- Create: `src/components/agent-overview/AgentOverviewTimeRangeButtons.tsx`
- Delete: `src/components/agent-overview/AgentOverviewTimeRangeSelect.tsx`
- Modify: `src/pages/AgentOverviewPage.tsx`
- Modify: `src/pages/AgentOverviewPage.test.tsx`

**Interfaces:**
- Consumes: `CreditTimeRange` and `onChange(value: CreditTimeRange)`.
- Produces: `AgentOverviewTimeRangeButtons`, a single-selection Toggle Group with Billing period, 7d, 30d, and 90d items.

- [ ] **Step 1: Write the failing test**

Extend `src/pages/AgentOverviewPage.test.tsx` to render the existing Overview fixture and assert it contains the Toggle Group and all four visible range labels.

```tsx
expect(markup).toContain('data-slot="toggle-group"');
expect(markup).toContain('>Billing period</button>');
expect(markup).toContain('>7d</button>');
expect(markup).toContain('>30d</button>');
expect(markup).toContain('>90d</button>');
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/AgentOverviewPage.test.tsx
```

Expected: FAIL because Overview still renders a Select time-range control in the chart header.

- [ ] **Step 3: Write the minimal implementation**

Create `AgentOverviewTimeRangeButtons` with a `ToggleGroup type="single"`, controlled by the existing range state. Use the existing range values and visible labels Billing period, 7d, 30d, and 90d.

In `AgentOverviewPage`, render the formatted date range and the new button group together below the page title. Remove `AgentOverviewTimeRangeSelect` from the trend-chart actions, retaining `AgentOverviewDataModeSelect`.

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/AgentOverviewPage.test.tsx
```

Expected: PASS with visible shortcuts beside the date and no range Select in the chart header.

- [ ] **Step 5: Run focused regression coverage**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/AgentOverviewPage.test.tsx src/pages/DashboardDescribedPageHeaders.test.ts src/components/agent-overview/agentOverviewTrendModel.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add CONTINUITY.md docs/superpowers/specs/2026-08-17-overview-last-30-days-default-design.md docs/superpowers/plans/2026-08-17-overview-date-shortcut-controls.md src/components/agent-overview/AgentOverviewTimeRangeButtons.tsx src/components/agent-overview/AgentOverviewTimeRangeSelect.tsx src/pages/AgentOverviewPage.tsx src/pages/AgentOverviewPage.test.tsx
git commit -m "Move overview range shortcuts beside date"
```

