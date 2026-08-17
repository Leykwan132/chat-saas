# Agent Overview Centered Donut Details Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show an active overview donut's label and customer count in its center.

**Architecture:** Retain row-hover state and custom sector expansion. Remove radial SVG tooltip geometry and render the selected datum in a pointer-transparent HTML overlay constrained to the donut hole.

**Tech Stack:** React, TypeScript, Recharts, Tailwind CSS, Vitest.

## Global Constraints

- Use Node v22 for every test, build, and type-check command.
- Keep production code self-explanatory and free of comments.
- Preserve the 10px active sector expansion and direct chart tooltip.
- Use the shared Agent Overview renderer for Common Topics and Customer Sentiment.
- Keep the browser-only `?dummyData=true` mode unchanged and remove it before merging PR #63.

---

### Task 1: Prove centered active details

**Files:**

- Modify: `src/components/agent-overview/AgentOverviewTopicsAndSentiment.test.ts`

**Interfaces:**

- Consumes: `AgentOverviewActiveDonutChart({ data, activeIndex })`.
- Produces: A regression that requires an active datum's two-line label/count center overlay.

- [ ] **Step 1: Write the failing test**

```ts
expect(markup).toContain('Pricing');
expect(markup).toContain('4 customers');
expect(markup).toContain('inset-[28%]');
expect(markup).not.toContain('foreignObject');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/agent-overview/AgentOverviewTopicsAndSentiment.test.ts`

Expected: FAIL because the active detail is currently sector-rendered rather than centered.

- [ ] **Step 3: Write minimal implementation**

```tsx
{activeDatum ? (
  <div className="pointer-events-none absolute inset-[28%] flex flex-col items-center justify-center text-center">
    <span className="max-w-full break-words text-xs font-medium">{activeDatum.label}</span>
    <span className="mt-1 text-xs">{formatCustomerCount(activeDatum.customerCount)}</span>
  </div>
) : null}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/agent-overview/AgentOverviewTopicsAndSentiment.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/agent-overview/AgentOverviewActiveDonutChart.tsx src/components/agent-overview/AgentOverviewTopicsAndSentiment.test.ts
git commit -m "Center overview donut details"
```

### Task 2: Verify and publish the center-detail iteration

**Files:**

- Modify: `CONTINUITY.md`

**Interfaces:**

- Consumes: Focused test, TypeScript, and Vite build output.
- Produces: An updated PR #63 branch and a fast-forwarded Desktop checkout.

- [ ] **Step 1: Run focused verification**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/agent-overview/AgentOverviewTopicsAndSentiment.test.ts src/components/agent-overview/agentOverviewDummyData.test.ts src/pages/AgentOverviewPage.test.tsx && bunx tsc --noEmit --pretty false && bunx vite build && git diff --check`

Expected: Every command exits 0; the build can emit the known `%VITE_META_APP_ID%` and chunk-size warnings.

- [ ] **Step 2: Record and publish**

```bash
git add CONTINUITY.md docs/superpowers/plans/2026-08-17-overview-centered-donut-details.md src/components/agent-overview/AgentOverviewActiveDonutChart.tsx src/components/agent-overview/AgentOverviewTopicsAndSentiment.test.ts
git commit -m "Center overview donut details"
git push origin HEAD:refs/heads/codex/overview-topic-panel-interaction
git -C /Users/leykwanchoo/Desktop/Projects/chat-saas pull --ff-only
```
