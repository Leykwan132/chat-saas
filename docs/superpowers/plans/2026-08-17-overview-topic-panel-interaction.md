# Overview Topic Panel Interaction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent clipped Common Topics rows and expand the corresponding donut sector while its row is hovered.

**Architecture:** Keep the existing overview panel component as the integration boundary. Give its reusable distribution list an optional active-item callback, and render the Common Topics donut with a state-backed Recharts `Sector` function. Replace the hard 340px height with a matching 340px minimum height so the two grid siblings grow together.

**Tech Stack:** React, TypeScript, Tailwind CSS, Recharts, Vitest.

## Global Constraints

- Node.js v22 is required for every test and build command.
- The scope is limited to the Agent Overview topic panel interaction and its regression coverage.
- Code files must remain under 300 lines and contain no explanatory comments.

---

### Task 1: Create the failure-first regression

**Files:**
- Modify: `src/components/agent-overview/AgentOverviewTopicsAndSentiment.test.ts`

**Interfaces:**
- Produces: a component regression that expects a 340px minimum-height shell, a hoverable topic row, and an active-sector donut renderer.

- [x] Add a test named `keeps topic rows visible and expands the hovered donut segment`.
- [x] Assert static output uses `min-height:340px` and the active-sector radius helper returns 10px more only for the hovered index.
- [x] Run `/bin/zsh -lc 'source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/agent-overview/AgentOverviewTopicsAndSentiment.test.ts'` and confirm the test fails because the current implementation has fixed height and no active sector.

### Task 2: Implement flexible sizing and linked interaction

**Files:**
- Modify: `src/components/agent-overview/AgentOverviewTopicsAndSentiment.tsx`
- Modify: `src/components/agent-overview/AgentOverviewTopicsAndSentiment.test.ts`

**Interfaces:**
- Consumes: `activeTopicIndex: number | null` and `setActiveTopicIndex: (index: number | null) => void` in the panel component.
- Produces: list hover callbacks and a Common Topics `Pie` that renders an expanded `Sector` only for the active index.

- [x] Replace the fixed `height: 340px` shell styles with `minHeight: 340` for both the rendered panels and skeletons.
- [x] Add the active topic index state to `AgentOverviewTopicsAndSentiment`.
- [x] Extend `DistributionList` to invoke the active-index callback on mouse enter and clear it on mouse leave.
- [x] Import and use Recharts `Sector` as the Common Topics `Pie` shape; add 10px to the matching segment’s outer radius.
- [x] Re-run the focused Vitest command and confirm it passes.

### Task 3: Verify and publish

**Files:**
- Modify: `CONTINUITY.md`

- [x] Run the focused test, the Node v22 production build, and `git diff --check`.
- [x] Commit only the topic panel code, focused test, design, plan, and ledger updates.
- [x] Push `codex/overview-topic-panel-interaction` and open draft PR #63 against `main`.
