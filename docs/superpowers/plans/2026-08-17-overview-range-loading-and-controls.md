# Overview Range Loading and Control Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve the last complete Overview dashboard during date-range refreshes, and make the range and data-mode controls consistent and self-explanatory.

**Architecture:** A small generic retained-data hook will keep the last pair of resolved summary and credit responses while Convex fetches a selected range. `AgentOverviewPage` will use this only after permissions are ready, preserving the initial full skeleton and retaining data only for later range transitions. The two Overview controls own their respective presentation changes.

**Tech Stack:** React 19, TypeScript, Convex React, Radix Tooltip and Select, Tailwind CSS, Vitest.

## Global Constraints

- Use Node.js v22 for every test and build command.
- Do not alter shared Select styling or other pages.
- Preserve the full Overview skeleton on first load only.
- Range changes retain the prior result and must not disable the range controls.
- Daily/Cumulative remains a local chart transformation with no busy state.
- Keep code files below 300 lines and do not add code comments.

---

### Task 1: Retain the last complete Overview result pair

**Files:**
- Create: `src/components/agent-overview/useRetainedOverviewData.ts`
- Create: `src/components/agent-overview/useRetainedOverviewData.test.ts`
- Modify: `src/pages/AgentOverviewPage.tsx:1-92`

**Interfaces:**
- Produces: `useRetainedOverviewData<TSummary, TCreditUsage>(summary, creditUsage)` returning `{ data?: { summary: TSummary; creditUsage: TCreditUsage }; isRefreshing: boolean }`.
- Consumes: the existing summary and credit-usage Convex results.

- [ ] **Step 1: Write the failing data-state test**

```ts
test('retains the previous result while the replacement is incomplete', () => {
  const previous = { summary: { label: '30d' }, creditUsage: { total: 240 } };

  expect(resolveRetainedOverviewData(previous, undefined, undefined)).toEqual({
    data: previous,
    isRefreshing: true,
  });
});

test('uses a newly complete pair without a busy state', () => {
  const summary = { label: '7d' };
  const creditUsage = { total: 56 };

  expect(resolveRetainedOverviewData(undefined, summary, creditUsage)).toEqual({
    data: { summary, creditUsage },
    isRefreshing: false,
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/agent-overview/useRetainedOverviewData.test.ts`

Expected: FAIL because `resolveRetainedOverviewData` does not exist.

- [ ] **Step 3: Implement the retained-data helper and hook**

```ts
export function resolveRetainedOverviewData<TSummary, TCreditUsage>(
  previousData: RetainedOverviewData<TSummary, TCreditUsage> | undefined,
  summary: TSummary | undefined,
  creditUsage: TCreditUsage | undefined,
) {
  if (summary !== undefined && creditUsage !== undefined) {
    return { data: { summary, creditUsage }, isRefreshing: false };
  }

  return { data: previousData, isRefreshing: previousData !== undefined };
}
```

Use `useState` and an effect dependent on `summary` and `creditUsage` to retain only complete query pairs. In `AgentOverviewPage`, replace the undefined-query guard with the hook result, keep the skeleton when `data` is undefined, derive all dashboard values from `data`, and pass `isRefreshing` to the range controls.

- [ ] **Step 4: Run the data-state and Overview tests**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/agent-overview/useRetainedOverviewData.test.ts src/pages/AgentOverviewPage.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit the retained-data behavior**

```bash
git add src/components/agent-overview/useRetainedOverviewData.ts src/components/agent-overview/useRetainedOverviewData.test.ts src/pages/AgentOverviewPage.tsx
git commit -m "Retain overview data during range refreshes"
```

### Task 2: Add range tooltips and non-blocking busy feedback

**Files:**
- Create: `src/components/agent-overview/AgentOverviewTimeRangeButtons.test.tsx`
- Modify: `src/components/agent-overview/AgentOverviewTimeRangeButtons.tsx:1-43`

**Interfaces:**
- Consumes: optional `isRefreshing?: boolean` from `AgentOverviewPage`.
- Produces: `aria-busy` on the ToggleGroup and a top-positioned Tooltip for each range option.

- [ ] **Step 1: Write the failing control test**

```ts
expect(markup).toContain('Last day');
expect(markup).toContain('Last 7 days');
expect(markup).toContain('Last 30 days');
expect(markup).toContain('Last 90 days');
expect(markup).toContain('aria-busy="true"');
expect(markup).toContain('>1d</button>');
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/agent-overview/AgentOverviewTimeRangeButtons.test.tsx`

Expected: FAIL because the component does not expose tooltip text or a busy state.

- [ ] **Step 3: Implement local tooltips and busy feedback**

```tsx
<TooltipProvider>
  <ToggleGroup aria-busy={isRefreshing} ...>
    <Tooltip>
      <TooltipTrigger asChild>
        <ToggleGroupItem value={option.value}>{option.label}</ToggleGroupItem>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6}>{option.tooltip}</TooltipContent>
    </Tooltip>
  </ToggleGroup>
</TooltipProvider>
```

Extend each range option with its approved tooltip text. Default `isRefreshing` to false. Do not add `disabled`; the user must be able to select another range while the current request is pending.

- [ ] **Step 4: Run the control test**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/agent-overview/AgentOverviewTimeRangeButtons.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit the range-control behavior**

```bash
git add src/components/agent-overview/AgentOverviewTimeRangeButtons.tsx src/components/agent-overview/AgentOverviewTimeRangeButtons.test.tsx
git commit -m "Add overview range control feedback"
```

### Task 3: Match the Daily/Cumulative selector to the range buttons

**Files:**
- Modify: `src/components/agent-overview/AgentOverviewDataModeSelect.tsx:1-42`
- Modify: `src/pages/AgentOverviewPage.test.tsx:47-70`

**Interfaces:**
- Preserves: existing `value` and `onChange` props.
- Produces: a local `SelectTrigger` class list with `rounded-full`, `h-8`, and `text-sm`.

- [ ] **Step 1: Write the failing selector-style regression**

```ts
expect(markup).toContain('aria-label="Overview data mode"');
expect(markup).toContain('rounded-full h-8 px-3 text-sm');
```

- [ ] **Step 2: Run the Overview test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/AgentOverviewPage.test.tsx`

Expected: FAIL because the local trigger has only the shared small-select defaults.

- [ ] **Step 3: Apply Overview-specific trigger classes**

```tsx
<SelectTrigger
  aria-label="Overview data mode"
  size="sm"
  className="h-8 rounded-full px-3 text-sm"
>
```

Keep the existing select options, alignment, value behavior, and all shared Select source unchanged.

- [ ] **Step 4: Run focused tests, build, and whitespace check**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/agent-overview/useRetainedOverviewData.test.ts src/components/agent-overview/AgentOverviewTimeRangeButtons.test.tsx src/pages/AgentOverviewPage.test.tsx && bun run build && git diff --check`

Expected: PASS with a successful production build and no whitespace errors.

- [ ] **Step 5: Commit the selector polish**

```bash
git add src/components/agent-overview/AgentOverviewDataModeSelect.tsx src/pages/AgentOverviewPage.test.tsx
git commit -m "Match overview data mode control styling"
```

### Task 4: Record and publish the completed feature

**Files:**
- Modify: `CONTINUITY.md`

**Interfaces:**
- Produces: a decision and verification receipt that name the actual implementation commits.

- [ ] **Step 1: Update the continuity ledger**

Record the completed data retention, tooltip, and selector behavior with their focused test, build, and `git diff --check` results.

- [ ] **Step 2: Commit and push the ledger**

Run: `git diff --check && git add CONTINUITY.md && git commit -m "Record overview control verification" && git push && git status -sb`

Expected: `codex/overview-date-range-controls` matches origin and draft PR #62 contains the completed feature.
