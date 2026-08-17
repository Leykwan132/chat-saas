# Overview Browser Dummy Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render browser-only Common Topics and Customer Sentiment test data when the Agent Overview URL contains `dummyData=true`.

**Architecture:** A small resolver module owns the fixed dataset and decides whether to return it or the live overview values. `AgentOverviewPage` reads the URL through React Router and passes the resolver output to the existing panel; Convex remains untouched.

**Tech Stack:** React, React Router, TypeScript, Vitest.

## Global Constraints

- Node.js v22 is required for every test and build command.
- `dummyData=true` must make no backend writes and must disappear when removed from the browser URL.
- Code files remain under 300 lines with no explanatory comments.

---

### Task 1: Add a failing browser-dummy-data resolver test

**Files:**
- Create: `src/components/agent-overview/agentOverviewDummyData.test.ts`

**Interfaces:**
- Produces: a regression for `resolveAgentOverviewPanelData({ dummyData, topics, sentimentDistribution, topicAnalyticsEnabled })`.

- [x] Write a test that passes empty live analytics with `dummyData: true` and expects seven non-empty topics, non-zero sentiment totals, and `topicAnalyticsEnabled: true`.
- [x] Run `/bin/zsh -lc 'source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/agent-overview/agentOverviewDummyData.test.ts'` and confirm it fails because the resolver does not exist.

### Task 2: Add the browser-only resolver and page integration

**Files:**
- Create: `src/components/agent-overview/agentOverviewDummyData.ts`
- Modify: `src/pages/AgentOverviewPage.tsx`
- Modify: `src/pages/AgentOverviewPage.test.tsx`

**Interfaces:**
- Consumes: `dummyData: boolean`, live topic rows, live sentiment counts, and live entitlement status.
- Produces: fixed test data only when `dummyData` is true; otherwise returns the exact live values.

- [x] Implement the fixed data and resolver with no Convex imports or mutations.
- [x] Read `searchParams.get('dummyData') === 'true'` with React Router on the overview page.
- [x] Pass the resolver result to `AgentOverviewTopicsAndSentiment`.
- [x] Add a page test that asserts the `dummyData` URL flag is read.
- [x] Re-run both focused Vitest files and confirm they pass.

### Task 3: Verify and publish the branch update

**Files:**
- Modify: `CONTINUITY.md`

- [x] Run the focused tests, Node v22 TypeScript check, Vite production build, and `git diff --check`.
- [ ] Commit and push the browser-only test-data update to draft PR #63.
