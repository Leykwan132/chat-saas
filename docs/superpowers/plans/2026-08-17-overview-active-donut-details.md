# Agent Overview Active Donut Details Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display the active Common Topics and Customer Sentiment label and customer count inside the matching hovered donut sector, without duplicate bottom spacing.

**Architecture:** Extract a small Agent Overview-only donut renderer that owns the Recharts sector shape, tooltip, and center overlay. The existing panel component supplies normalized data and hover state for each distribution list, keeping shared analytics components unchanged.

**Tech Stack:** React, TypeScript, Recharts, Tailwind CSS, Vitest.

## Global Constraints

- Use Node v22 for every test, build, and type-check command.
- Keep production code self-explanatory and free of comments.
- Keep the `?dummyData=true` development-only flag unchanged and remove it before merging PR #63.
- Do not change the shared analytics customer-sentiment chart contract.

---

### Task 1: Prove normalized active data and compact panel content

**Files:**

- Modify: `src/components/agent-overview/AgentOverviewTopicsAndSentiment.test.ts`

**Interfaces:**

- Consumes: `buildSentimentChartData(distribution)` and `getTopicChartOuterRadius(outerRadius, index, activeIndex)` from `AgentOverviewTopicsAndSentiment.tsx`.
- Produces: Regression expectations that sentiment data carries raw customer counts and the content grid has no duplicate bottom padding.

- [ ] **Step 1: Write the failing test**

```ts
expect(buildSentimentChartData({ positive: 6, neutral: 3, negative: 1 })).toEqual([
  expect.objectContaining({ label: 'Positive', customerCount: 6 }),
  expect.objectContaining({ label: 'Neutral', customerCount: 3 }),
  expect.objectContaining({ label: 'Negative', customerCount: 1 }),
]);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/agent-overview/AgentOverviewTopicsAndSentiment.test.ts`

Expected: FAIL because sentiment rows do not yet expose raw customer counts.

- [ ] **Step 3: Write minimal implementation**

```ts
type AgentOverviewDistributionItem = {
  key: string;
  label: string;
  customerCount: number;
  percentage: number;
  fill: string;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/agent-overview/AgentOverviewTopicsAndSentiment.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/agent-overview/AgentOverviewTopicsAndSentiment.test.ts src/components/agent-overview/AgentOverviewTopicsAndSentiment.tsx
git commit -m "Normalize overview active donut data"
```

### Task 2: Render active details in both panels

**Files:**

- Create: `src/components/agent-overview/AgentOverviewActiveDonutChart.tsx`
- Modify: `src/components/agent-overview/AgentOverviewTopicsAndSentiment.tsx`
- Test: `src/components/agent-overview/AgentOverviewTopicsAndSentiment.test.ts`

**Interfaces:**

- Consumes: `AgentOverviewDistributionItem` with `key`, `label`, `customerCount`, and `fill`; `activeIndex: number | null`.
- Produces: `AgentOverviewActiveDonutChart`, which renders a Recharts donut, expands only its active sector by 10px, and overlays a wrapped label plus formatted customer count while active.

- [ ] **Step 1: Write the failing test**

```ts
expect(markup).toContain('activeIndex');
expect(markup).toContain('Customer count');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/agent-overview/AgentOverviewTopicsAndSentiment.test.ts`

Expected: FAIL because no active center label is rendered.

- [ ] **Step 3: Write minimal implementation**

```tsx
<AgentOverviewActiveDonutChart
  data={topicChartData}
  activeIndex={activeTopicIndex}
/>
<AgentOverviewActiveDonutChart
  data={sentimentChartData}
  activeIndex={activeSentimentIndex}
/>
```

The new renderer must show a wrapped label and a second line formatted as `N customer` or `N customers`, and it must not render the overlay when `activeIndex` is `null`.

- [ ] **Step 4: Run test to verify it passes**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/agent-overview/AgentOverviewTopicsAndSentiment.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/agent-overview/AgentOverviewTopicsAndSentiment.test.ts src/components/agent-overview/AgentOverviewTopicsAndSentiment.tsx src/components/agent-overview/AgentOverviewActiveDonutChart.tsx
git commit -m "Show active overview donut details"
```

### Task 3: Verify and publish the approved change

**Files:**

- Modify: `CONTINUITY.md`

**Interfaces:**

- Consumes: Focused tests, TypeScript, and Vite build output.
- Produces: A pushed PR #63 branch and a fast-forwarded user checkout on `codex/overview-topic-panel-interaction`.

- [ ] **Step 1: Run focused verification**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/agent-overview/AgentOverviewTopicsAndSentiment.test.ts src/components/agent-overview/agentOverviewDummyData.test.ts src/pages/AgentOverviewPage.test.tsx && bunx tsc --noEmit --pretty false && bunx vite build && git diff --check`

Expected: Each command exits 0; the build may retain the known `%VITE_META_APP_ID%` and chunk-size warnings.

- [ ] **Step 2: Update continuity**

Record the active-center detail decision, verification receipt, and commit SHA in `CONTINUITY.md` without adding an unshipped customer-facing changelog entry.

- [ ] **Step 3: Push the detached managed-worktree commit**

Run: `git push origin HEAD:refs/heads/codex/overview-topic-panel-interaction`

Expected: The remote branch receives the new commit for draft PR #63.

- [ ] **Step 4: Fast-forward the user checkout**

Run: `git -C /Users/leykwanchoo/Desktop/Projects/chat-saas pull --ff-only`

Expected: The user checkout advances cleanly on `codex/overview-topic-panel-interaction`.
