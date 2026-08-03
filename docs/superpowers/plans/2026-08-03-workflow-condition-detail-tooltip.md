# Workflow Condition Detail Tooltip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a workflow edge’s full condition detail in an accessible tooltip while preserving its compact, truncated label.

**Architecture:** Flow-model conversion passes the persisted edge detail through `WorkflowEdgeData`. `WorkflowEdge` wraps its existing clickable label in the shared tooltip primitive and only renders tooltip content when a detail exists.

**Tech Stack:** React, TypeScript, @xyflow/react, Radix tooltip, Vitest.

## Global Constraints

- Run project scripts under Node 22.
- Preserve existing condition-label truncation and click-to-select behavior.
- Show the stored condition detail only when it exists.
- Keep code files below 300 lines and avoid comments.

---

### Task 1: Pass and render condition detail

**Files:**
- Modify: `src/components/workflow/workflowTypes.ts:53-57`
- Modify: `src/components/workflow/workflowFlowModel.ts:205-225`
- Modify: `src/components/workflow/WorkflowEdge.tsx:1-75`
- Modify: `src/components/workflow/workflowFlowModel.test.ts:94-102`
- Create: `src/components/workflow/WorkflowEdge.test.tsx`

**Interfaces:**
- Consumes: persisted `workflowEdges.detail` from `WorkflowGraph`.
- Produces: optional `conditionDetail?: string` on `WorkflowEdgeData`.
- Consumes: `WorkflowEdgeData.conditionDetail` in `WorkflowEdge`.

- [x] **Step 1: Write failing model and edge-render tests**

```tsx
expect(flow.edges[0].data?.conditionDetail).toBe('Long internal condition detail');

expect(markup).toContain('Long internal condition detail');
expect(markup).toContain('Customer asks about billing');
```

The edge-render fixture supplies a `label` and `data: { conditionDetail: 'Long internal condition detail' }`, and renders `WorkflowEdge` within `TooltipProvider`.

- [x] **Step 2: Run tests to verify they fail**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && node node_modules/vitest/vitest.mjs run src/components/workflow/workflowFlowModel.test.ts src/components/workflow/WorkflowEdge.test.tsx
```

Expected: FAIL because the flow-edge data lacks `conditionDetail` and the edge does not render tooltip content.

- [x] **Step 3: Write minimal implementation**

```tsx
export type WorkflowEdgeData = Record<string, unknown> & {
  conditionDetail?: string;
};

data: {
  routePoints: edgeRoutes.get(edge._id),
  conditionDetail: edge.detail?.trim() || undefined,
}
```

```tsx
{data?.conditionDetail ? (
  <Tooltip>
    <TooltipTrigger asChild>{conditionButton}</TooltipTrigger>
    <TooltipContent side="top" className="max-w-xs whitespace-pre-wrap text-left">
      {data.conditionDetail}
    </TooltipContent>
  </Tooltip>
) : conditionButton}
```

- [x] **Step 4: Run focused verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && node node_modules/vitest/vitest.mjs run src/components/workflow/workflowFlowModel.test.ts src/components/workflow/WorkflowEdge.test.tsx && bun run build && git diff --check
```

Expected: focused tests and production build pass with no whitespace errors.

- [x] **Step 5: Commit**

```bash
git add docs/superpowers/plans/2026-08-03-workflow-condition-detail-tooltip.md src/components/workflow/workflowTypes.ts src/components/workflow/workflowFlowModel.ts src/components/workflow/WorkflowEdge.tsx src/components/workflow/workflowFlowModel.test.ts src/components/workflow/WorkflowEdge.test.tsx CONTINUITY.md
git commit -m "Show workflow condition details on hover"
```
