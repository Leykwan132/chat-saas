# Agent Overview Slice-Anchored Tooltip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Anchor each active overview donut tooltip immediately beyond its matching slice, without a shadow.

**Architecture:** Extend the Agent Overview-only donut renderer with a pure sector-tooltip-position helper. Its custom Recharts sector shape renders the expanded sector and, only for the active index, an SVG `foreignObject` at the radial midpoint calculated from `cx`, `cy`, `midAngle`, and `outerRadius`.

**Tech Stack:** React, TypeScript, Recharts, SVG `foreignObject`, Tailwind CSS, Vitest.

## Global Constraints

- Use Node v22 for every test, build, and type-check command.
- Keep production code self-explanatory and free of comments.
- Preserve the existing active-sector expansion, two-line tooltip copy, and no-tooltip inactive state.
- Keep the interaction scoped to `AgentOverviewActiveDonutChart`; shared analytics charts remain unchanged.
- Keep the browser-only `?dummyData=true` mode unchanged and remove it before merging PR #63.

---

### Task 1: Prove radial tooltip geometry

**Files:**

- Modify: `src/components/agent-overview/AgentOverviewTopicsAndSentiment.test.ts`

**Interfaces:**

- Consumes: `getActiveDonutTooltipPosition({ cx, cy, midAngle, outerRadius })` from `AgentOverviewActiveDonutChart.tsx`.
- Produces: Regression expectations that a right-hand slice places its tooltip right of center and a top slice places it above center.

- [ ] **Step 1: Write the failing test**

```ts
const right = getActiveDonutTooltipPosition({ cx: 100, cy: 100, midAngle: 0, outerRadius: 50 });
const top = getActiveDonutTooltipPosition({ cx: 100, cy: 100, midAngle: 90, outerRadius: 50 });

expect(right.x).toBeGreaterThan(100);
expect(right.y).toBeLessThan(100);
expect(top.x).toBeLessThan(100);
expect(top.y).toBeLessThan(100);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/agent-overview/AgentOverviewTopicsAndSentiment.test.ts`

Expected: FAIL because the renderer has no radial-tooltip-position helper.

- [ ] **Step 3: Write minimal implementation**

```ts
const tooltipWidth = 184;
const tooltipHeight = 72;
const activeRadiusOffset = 10;
const tooltipGap = 8;
const angle = (-midAngle * Math.PI) / 180;
const xDirection = Math.cos(angle);
const yDirection = Math.sin(angle);
const projectedTooltipHalfSize =
  Math.abs(xDirection) * tooltipWidth / 2 + Math.abs(yDirection) * tooltipHeight / 2;
const distance = outerRadius + activeRadiusOffset + projectedTooltipHalfSize + tooltipGap;

return {
  x: cx + xDirection * distance - tooltipWidth / 2,
  y: cy + yDirection * distance - tooltipHeight / 2,
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/agent-overview/AgentOverviewTopicsAndSentiment.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/agent-overview/AgentOverviewActiveDonutChart.tsx src/components/agent-overview/AgentOverviewTopicsAndSentiment.test.ts
git commit -m "Anchor overview donut tooltip to slices"
```

### Task 2: Render the slice-anchored tooltip and publish

**Files:**

- Modify: `src/components/agent-overview/AgentOverviewActiveDonutChart.tsx`
- Modify: `CONTINUITY.md`

**Interfaces:**

- Consumes: `PieSectorShapeProps` and `getActiveDonutTooltipPosition`.
- Produces: An active sector shape that renders a shadow-free SVG tooltip adjacent to its selected slice for both Overview panels.

- [ ] **Step 1: Render the active SVG tooltip**

```tsx
<g>
  <Sector {...sectorProps} outerRadius={activeOuterRadius} />
  <foreignObject x={position.x} y={position.y} width={tooltipWidth} height={tooltipHeight} pointerEvents="none">
    <div role="tooltip" className="rounded-lg border bg-background px-3 py-2 text-center">
      <span className="block text-xs font-medium">{datum.label}</span>
      <span className="mt-0.5 block text-xs">{formatCustomerCount(datum.customerCount)}</span>
    </div>
  </foreignObject>
</g>
```

- [ ] **Step 2: Run focused verification**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/agent-overview/AgentOverviewTopicsAndSentiment.test.ts src/components/agent-overview/agentOverviewDummyData.test.ts src/pages/AgentOverviewPage.test.tsx && bunx tsc --noEmit --pretty false && bunx vite build && git diff --check`

Expected: Every command exits 0; the build can emit the known `%VITE_META_APP_ID%` and chunk-size warnings.

- [ ] **Step 3: Record and commit the change**

```bash
git add CONTINUITY.md docs/superpowers/plans/2026-08-17-overview-slice-anchored-tooltip.md src/components/agent-overview/AgentOverviewActiveDonutChart.tsx src/components/agent-overview/AgentOverviewTopicsAndSentiment.test.ts
git commit -m "Anchor overview donut tooltip to slices"
```

- [ ] **Step 4: Publish and synchronize local testing**

Run: `git push origin HEAD:refs/heads/codex/overview-topic-panel-interaction && git -C /Users/leykwanchoo/Desktop/Projects/chat-saas pull --ff-only`

Expected: Draft PR #63 and the Desktop checkout advance to the same commit.
