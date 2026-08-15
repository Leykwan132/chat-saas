# Workflow Cleanup Measured Nodes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Workflow Cleanup arrange expanded direct-control nodes using their actual rendered dimensions so they do not overlap.

**Architecture:** Extract valid dimensions from the rendered persisted React Flow nodes into a small, typed client-side measurement collection. Pass it from the canvas through the page action and layout persistence helper into the existing Dagre calculation. Dagre and the overlap resolver use each supplied measured footprint; existing deterministic dimensions remain the fallback for unmeasured nodes, templates, and edge routing.

**Tech Stack:** React 19, React Flow, TypeScript, Dagre, Vitest, Convex position-persistence mutation.

## Global Constraints

- Use Node v22 for all scripts: `source ~/.nvm/nvm.sh && nvm use 22`.
- Preserve the current Cleanup orientation; do not force a vertical layout.
- Persist only node positions through the existing `workflowLayout.apply` mutation. Do not change the Convex schema or mutation contract.
- A valid measured footprint has finite positive `width` and `height`; invalid or unavailable measurements use the current deterministic fallback.
- Supplied measurements already include the node control rail and must not receive additional rail width.
- Compact/template views continue using the fallback layout dimensions.
- Keep source modules below 300 lines, add no comments, and preserve `pricing-knowledge-base-updated.md`.

---

### Task 1: Introduce typed rendered-node measurements and forward them from Cleanup

**Files:**
- Create: `src/components/workflow/workflowLayoutMeasurements.ts`
- Create: `src/components/workflow/workflowLayoutMeasurements.test.ts`
- Modify: `src/components/workflow/WorkflowCanvas.tsx`
- Modify: `src/pages/WorkflowPage.tsx`
- Modify: `src/pages/useWorkflowMessageActions.ts`
- Modify: `src/pages/workflowLayoutPersistence.ts`
- Modify: `src/pages/workflowLayoutPersistence.test.ts`
- Modify: `src/pages/WorkflowPage.test.ts`

**Interfaces:**
- Produces `WorkflowLayoutNodeMeasurements`, a `ReadonlyMap<Id<'workflowNodes'>, { width: number; height: number }>`.
- Produces `getWorkflowLayoutNodeMeasurements(nodes: WorkflowFlowNode[]): WorkflowLayoutNodeMeasurements`.
- Extends `toWorkflowLayoutApplyArgs(graph, layoutOrientation, measurements?)` and `applyLayout(orientation, measurements?)` with the optional measurement map.
- Changes `WorkflowCanvasProps.onCleanup` to `(measurements: WorkflowLayoutNodeMeasurements) => void`.

- [x] **Step 1: Write failing measurement-extraction and persistence tests**

Create `workflowLayoutMeasurements.test.ts` using persisted and automation flow-node fixtures. Verify the observable contract:

```ts
const measurements = getWorkflowLayoutNodeMeasurements([
  persistedNode('message', { width: 340, height: 218 }),
  persistedNode('invalid', { width: 0, height: Number.NaN }),
  automationNode({ width: 420, height: 240 }),
]);

expect(measurements.get(messageNodeId)).toEqual({ width: 340, height: 218 });
expect(measurements.has(invalidNodeId)).toBe(false);
expect(measurements.has(automationNodeId)).toBe(false);
```

In `workflowLayoutPersistence.test.ts`, pass a 340×218 measurement for a workflow action and assert `toWorkflowLayoutApplyArgs` produces positions from `getWorkflowCleanupPositions(graph, 'vertical', measurements)`. In `WorkflowPage.test.ts`, assert the canvas Cleanup callback accepts `measurements` and forwards them to `handleCleanup(measurements)`. These name the broken contract: Cleanup currently discards rendered dimensions.

- [x] **Step 2: Run the focused tests to verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/workflowLayoutMeasurements.test.ts src/pages/workflowLayoutPersistence.test.ts src/pages/WorkflowPage.test.ts
```

Expected: FAIL because measurement extraction and the optional persistence argument do not exist.

- [x] **Step 3: Add the minimal measurement data flow**

Create `workflowLayoutMeasurements.ts`:

```ts
export type WorkflowLayoutNodeMeasurements = ReadonlyMap<
  Id<'workflowNodes'>,
  { width: number; height: number }
>;

export function getWorkflowLayoutNodeMeasurements(
  nodes: WorkflowFlowNode[],
): WorkflowLayoutNodeMeasurements {
  return new Map(nodes.flatMap((node) => {
    if (!isPersistedWorkflowFlowNode(node)) return [];
    const { width, height } = node.measured ?? {};
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return [];
    return [[node.data.nodeId, { width, height }] as const];
  }));
}
```

In `WorkflowCanvas`, pass `getWorkflowLayoutNodeMeasurements(localNodes)` to `onCleanup`. Thread the optional map through `WorkflowEditor.handleCleanup`, `useWorkflowMessageActions.applyLayout`, and `toWorkflowLayoutApplyArgs`. Do not serialize or send measurements to Convex; `toWorkflowLayoutApplyArgs` must consume them before returning the unchanged `{ layoutOrientation, positions }` payload.

- [x] **Step 4: Run the focused tests to verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/workflowLayoutMeasurements.test.ts src/pages/workflowLayoutPersistence.test.ts src/pages/WorkflowPage.test.ts src/components/workflow/WorkflowCanvas.test.ts
```

Expected: PASS.

- [x] **Step 5: Commit the measured Cleanup data flow**

```bash
git add src/components/workflow/workflowLayoutMeasurements.ts src/components/workflow/workflowLayoutMeasurements.test.ts src/components/workflow/WorkflowCanvas.tsx src/pages/WorkflowPage.tsx src/pages/WorkflowPage.test.ts src/pages/useWorkflowMessageActions.ts src/pages/workflowLayoutPersistence.ts src/pages/workflowLayoutPersistence.test.ts src/components/workflow/WorkflowCanvas.test.ts
git commit -m "feat: carry measured workflow nodes into cleanup"
```

### Task 2: Lay out measured footprints without fallback rail duplication

**Files:**
- Modify: `src/components/workflow/workflowLayout.ts`
- Modify: `src/components/workflow/workflowLayout.test.ts`
- Modify: `src/components/workflow/workflowEdgeRouting.test.ts`

**Interfaces:**
- Extends `getWorkflowCleanupNodeSize(node, measuredSize?)` and `getWorkflowCleanupPositions(graph, orientation?, measurements?)`.
- `measuredSize` is `{ width: number; height: number } | undefined`; supplied valid values are the complete rendered footprint.
- `getWorkflowLayoutNodeSize(node)` remains the deterministic fallback used by edge routing.

- [x] **Step 1: Write the failing expanded-node layout regression**

In `workflowLayout.test.ts`, construct a horizontal graph where a 340×310 Human escalation node and a 340×250 Book appointment node share a rank after Cleanup. Pass:

```ts
const measurements = new Map([
  [escalation._id, { width: 340, height: 310 }],
  [booking._id, { width: 340, height: 250 }],
]);
const positions = getWorkflowCleanupPositions(graph, 'horizontal', measurements);
```

Convert positions to rectangles using the same measured dimensions, then assert every pair that overlaps vertically has no horizontal overlap. Add a separate assertion that `getWorkflowCleanupNodeSize(escalation, measurements.get(escalation._id))` exactly returns `{ width: 340, height: 310 }`, proving the control rail is not added twice.

- [x] **Step 2: Run the focused test to verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/workflowLayout.test.ts
```

Expected: FAIL because Cleanup currently accepts no measurements and always uses the old title/description footprint.

- [x] **Step 3: Use effective measured dimensions in Dagre and collision resolution**

In `workflowLayout.ts`, add a local size validator and resolve a complete Cleanup footprint with:

```ts
function getWorkflowCleanupNodeSize(
  node: WorkflowGraph['nodes'][number],
  measuredSize?: { width: number; height: number },
) {
  if (isFinitePositiveSize(measuredSize)) return measuredSize;
  const size = getWorkflowLayoutNodeSize(node);
  return { ...size, width: size.width + getWorkflowNodeControlRailWidth(node) };
}
```

Use this effective size for `layoutGraph.setNode`, the centered output position, and the collision rectangles. Keep `getWorkflowLayoutNodeSize` unchanged for `workflowEdgeRouting.ts`; update its test only if its explicit fallback assertions need the unchanged contract restated.

- [x] **Step 4: Run focused layout and routing tests to verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/workflowLayout.test.ts src/components/workflow/workflowEdgeRouting.test.ts
```

Expected: PASS, including unchanged deterministic edge-routing geometry.

- [x] **Step 5: Run static validation and commit**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx tsc --noEmit && git diff --check
```

Then commit:

```bash
git add src/components/workflow/workflowLayout.ts src/components/workflow/workflowLayout.test.ts src/components/workflow/workflowEdgeRouting.test.ts
git commit -m "fix: size workflow cleanup from rendered nodes"
```

### Task 3: Verify the full branch and record the cleanup regression receipt

**Files:**
- Modify: `CONTINUITY.md`
- Modify: `docs/superpowers/plans/2026-08-15-workflow-cleanup-measured-nodes.md`

**Interfaces:**
- No new runtime interface; records proof that measured Cleanup runs alongside existing workflow behavior.

- [x] **Step 1: Run the complete suite**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bun run test
```

Expected: PASS with all application/Convex and Docs suites.

- [x] **Step 2: Record verification and commit**

Record the Node version, suite totals, and that Cleanup preserves fallback/template behavior in `CONTINUITY.md`. Mark every plan checkbox complete, then commit:

```bash
git add CONTINUITY.md docs/superpowers/plans/2026-08-15-workflow-cleanup-measured-nodes.md
git commit -m "docs: record measured cleanup verification"
```
