# Agent Overview Active Donut Tooltip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace active donut-center details with a two-line tooltip above the hovered Common Topics or Customer Sentiment donut.

**Architecture:** Keep the Agent Overview-only donut renderer and its state-driven sector expansion. Replace its center overlay with a conditional, pointer-transparent tooltip whose two block lines receive the normalized label and formatted customer count.

**Tech Stack:** React, TypeScript, Recharts, Tailwind CSS, Vitest.

## Global Constraints

- Use Node v22 for every test, build, and type-check command.
- Keep production code self-explanatory and free of comments.
- Keep the tooltip scoped to `AgentOverviewActiveDonutChart`; shared analytics charts remain unchanged.
- Keep the browser-only `?dummyData=true` mode unchanged and remove it before merging PR #63.

---

### Task 1: Prove tooltip display and inactive absence

**Files:**

- Modify: `src/components/agent-overview/AgentOverviewTopicsAndSentiment.test.ts`

**Interfaces:**

- Consumes: `AgentOverviewActiveDonutChart({ data, activeIndex })`.
- Produces: Regressions that prove an active datum renders a tooltip with separate label/count lines and an inactive donut renders no tooltip.

- [ ] **Step 1: Write the failing test**

```ts
const activeMarkup = renderToStaticMarkup(
  createElement(AgentOverviewActiveDonutChart, {
    data: [{ key: 'pricing', label: 'Pricing', customerCount: 4, fill: '#7cb4f4' }],
    activeIndex: 0,
  }),
);

expect(activeMarkup).toContain('role="tooltip"');
expect(activeMarkup).toContain('Pricing');
expect(activeMarkup).toContain('4 customers');
expect(activeMarkup).toContain('block text-xs');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/agent-overview/AgentOverviewTopicsAndSentiment.test.ts`

Expected: FAIL because the active details still occupy the donut center and have no tooltip role.

- [ ] **Step 3: Write minimal implementation**

```tsx
{activeDatum ? (
  <div role="tooltip" className="pointer-events-none absolute inset-x-0 -top-2 z-10 -translate-y-full">
    <div className="rounded-lg border bg-background px-3 py-2 shadow-sm">
      <span className="block text-xs font-medium">{activeDatum.label}</span>
      <span className="mt-0.5 block text-xs">{formatCustomerCount(activeDatum.customerCount)}</span>
    </div>
  </div>
) : null}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/agent-overview/AgentOverviewTopicsAndSentiment.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/agent-overview/AgentOverviewActiveDonutChart.tsx src/components/agent-overview/AgentOverviewTopicsAndSentiment.test.ts
git commit -m "Show overview donut details in a tooltip"
```

### Task 2: Verify and publish the tooltip iteration

**Files:**

- Modify: `CONTINUITY.md`

**Interfaces:**

- Consumes: The focused test suite, TypeScript check, and Vite production build.
- Produces: An updated draft PR #63 and a fast-forwarded Desktop checkout on `codex/overview-topic-panel-interaction`.

- [ ] **Step 1: Run focused verification**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/agent-overview/AgentOverviewTopicsAndSentiment.test.ts src/components/agent-overview/agentOverviewDummyData.test.ts src/pages/AgentOverviewPage.test.tsx && bunx tsc --noEmit --pretty false && bunx vite build && git diff --check`

Expected: Every command exits 0; the build can emit the known `%VITE_META_APP_ID%` and chunk-size warnings.

- [ ] **Step 2: Update continuity**

Record the active-tooltip decision and fresh validation receipt in `CONTINUITY.md`; do not add the unshipped change to the customer-facing changelog.

- [ ] **Step 3: Push the detached managed-worktree commit**

Run: `git push origin HEAD:refs/heads/codex/overview-topic-panel-interaction`

Expected: The draft PR #63 branch advances to the tooltip commit.

- [ ] **Step 4: Fast-forward the Desktop checkout**

Run: `git -C /Users/leykwanchoo/Desktop/Projects/chat-saas pull --ff-only`

Expected: The Desktop checkout advances cleanly on `codex/overview-topic-panel-interaction`.
