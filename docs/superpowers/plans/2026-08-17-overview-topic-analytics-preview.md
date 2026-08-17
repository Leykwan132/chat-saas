# Overview Topic Analytics Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Withhold live Common Topics and Customer Sentiment data from Free and Starter, while providing an explicitly labelled local sample preview and upgrade action.

**Architecture:** The overview summary will derive the existing `topic_analytics` entitlement server-side and avoid computing advanced data when unavailable. The response carries `topicAnalyticsEnabled`; the lower-panels component uses that flag to render either live panels, locked panels, or a local sample preview. The existing upgrade modal remains the only billing action.

**Tech Stack:** Convex, React, TypeScript, Tailwind CSS, Vitest.

## Global Constraints

- Reuse `topic_analytics`: Free/Starter false, Growth/Business true.
- Do not return live topic or sentiment data when the entitlement is false.
- Mark every preview as sample data and do not persist it.
- Keep existing metrics and trend analytics unchanged.

---

### Task 1: Enforce topic analytics in the Overview summary

**Files:**
- Modify: `convex/agentOverviewModel.ts`
- Modify: `convex/agentOverview.test.ts`

- [ ] **Step 1: Write the failing access helper regression**

```ts
expect(resolveTopicAnalyticsSummary(false, topics, sentiment)).toEqual({
  topicAnalyticsEnabled: false,
  trendingTopics: [],
  sentimentDistribution: { positive: 0, neutral: 0, negative: 0 },
});
```

- [ ] **Step 2: Run the regression and verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/agentOverview.test.ts`

Expected: FAIL because the helper and topic entitlement response do not exist.

- [ ] **Step 3: Implement the server-side entitlement response**

Derive the billing plan with the existing billing-plan helper and evaluate `checkAiFeature(plan, 'topic_analytics')`. Add `resolveTopicAnalyticsSummary` to return empty advanced fields for a denied plan and live values for an entitled plan. Call topic and sentiment helpers only in the entitled branch, and return `topicAnalyticsEnabled` with the existing summary fields.

- [ ] **Step 4: Run the backend regression**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/agentOverview.test.ts`

Expected: PASS.

### Task 2: Build the locked and sample lower-panel states

**Files:**
- Modify: `src/components/agent-overview/AgentOverviewTopicsAndSentiment.tsx`
- Modify: `src/components/agent-overview/AgentOverviewTopicsAndSentiment.test.ts`
- Modify: `src/pages/AgentOverviewPage.tsx`

- [ ] **Step 1: Write the failing panel regression**

```ts
expect(markup).toContain('Preview');
expect(markup).toContain('Upgrade');
expect(markup).toContain('Sample data — not from your conversations.');
```

- [ ] **Step 2: Run the panel regression and verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/agent-overview/AgentOverviewTopicsAndSentiment.test.ts`

Expected: FAIL because locked and sample-preview states do not exist.

- [ ] **Step 3: Implement the local preview flow**

Give the component a `topicAnalyticsEnabled` prop. For denied access, render matching locked card overlays whose Preview action sets local preview state and whose Upgrade action calls `useUpgradeModal().openUpgradeModal()`. Use fixed local topics and `{ positive: 14, neutral: 7, negative: 3 }` for the preview. Show `Sample data` in both panel titles and `Sample data — not from your conversations.` above the preview panels. Pass the returned entitlement boolean from `AgentOverviewPage`.

- [ ] **Step 4: Run focused UI regressions**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/agent-overview/AgentOverviewTopicsAndSentiment.test.ts src/pages/AgentOverviewPage.test.tsx`

Expected: PASS.

### Task 3: Verify and publish

**Files:**
- Modify: `CONTINUITY.md`

- [ ] **Step 1: Run all relevant tests, build, and whitespace check**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/agentOverview.test.ts src/components/agent-overview/AgentOverviewTopicsAndSentiment.test.ts src/pages/AgentOverviewPage.test.tsx && bun run build && git diff --check`

Expected: focused tests and production build PASS.

- [ ] **Step 2: Record and push the verified change**

Run: `git add convex/agentOverviewModel.ts convex/agentOverview.test.ts src/components/agent-overview/AgentOverviewTopicsAndSentiment.tsx src/components/agent-overview/AgentOverviewTopicsAndSentiment.test.ts src/pages/AgentOverviewPage.tsx CONTINUITY.md && git commit -m "Gate overview topic analytics" && git push && git status -sb`

Expected: PR #62 tracks the pushed feature branch.
