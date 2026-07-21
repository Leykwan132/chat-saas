# Landing Workflow Preview Density Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Open the landing application demo on Workflow and render only its workflow node cards and directly attached controls at an approximately 15% smaller density.

**Architecture:** Extend persisted workflow flow-node data with an opt-in `compact` density that defaults to `standard` in the shared graph adapter. The landing adapter alone requests `compact`; the shared node renderer and add-node trigger select density-specific shadcn/Tailwind variants while all product callers retain standard presentation.

**Tech Stack:** React 19, TypeScript 6, React Flow 12, Tailwind CSS 4, shadcn/ui Button and DropdownMenu, Vitest 1.6, Bun, Node 22

## Global Constraints

- Run every script and test with Node 22 selected in the same shell command.
- Keep every code file at or below 300 lines.
- Add no comments unless a non-obvious workaround cannot be simplified.
- Do not add default fallbacks that hide failures.
- The authenticated product workflow must remain visually and behaviorally unchanged.
- The compact treatment applies only to landing persisted node cards, typography, icons, handles, and directly attached add/delete controls.
- Do not resize the landing canvas toolbar, background, edges, inspector, dropdown content, or application shell.

---

### Task 1: Default the landing demo to Workflow

**Files:**
- Modify: `src/components/landing/landingAppPreviewData.test.ts`
- Modify: `src/components/landing/LandingAppPreview.tsx`

**Interfaces:**
- Consumes: `LandingPreviewNavKey` and `LandingPreviewSectionId` state already owned by `LandingAppPreview`.
- Produces: First-render values `activeNavKey === 'workflow'` and `activeSectionId === 'workflow'`; existing sidebar selection callbacks remain unchanged.

- [ ] **Step 1: Write the failing default-state test**

Add this focused source contract to `landingAppPreviewData.test.ts`:

```ts
test('landing application preview opens on workflow by default', () => {
  const previewSource = readComponentSource('LandingAppPreview.tsx');

  expect(previewSource).toContain(
    "useState<LandingPreviewNavKey>('workflow')",
  );
  expect(previewSource).toContain(
    "useState<LandingPreviewSectionId>('workflow')",
  );
  expect(previewSource).not.toContain(
    "useState<LandingPreviewNavKey>('overview')",
  );
  expect(previewSource).not.toContain(
    "useState<LandingPreviewSectionId>('overview')",
  );
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/landing/landingAppPreviewData.test.ts
```

Expected: FAIL because both state initializers still contain `overview`.

- [ ] **Step 3: Implement the Workflow default**

Change only the initial values in `LandingAppPreview.tsx`:

```ts
const [activeNavKey, setActiveNavKey] = useState<LandingPreviewNavKey>('workflow');
const [activeSectionId, setActiveSectionId] = useState<LandingPreviewSectionId>('workflow');
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run the Step 2 command again.

Expected: PASS with the landing navigation and content defaults aligned.

- [ ] **Step 5: Commit Task 1**

```bash
git add src/components/landing/LandingAppPreview.tsx src/components/landing/landingAppPreviewData.test.ts
git commit -m "Default landing demo to workflow"
```

---

### Task 2: Propagate preview-only compact node density

**Files:**
- Modify: `src/components/workflow/workflowTypes.ts`
- Modify: `src/components/workflow/workflowFlowModel.ts`
- Modify: `src/components/workflow/workflowFlowModel.test.ts`
- Modify: `src/components/landing/LandingAppPreviewWorkflow.tsx`
- Modify: `src/components/landing/LandingAppPreviewWorkflow.test.ts`

**Interfaces:**
- Produces: `WorkflowNodeDensity = 'standard' | 'compact'` and optional `WorkflowNodeData.density?: WorkflowNodeDensity`.
- Produces: `workflowGraphToFlow(..., disabled = false, nodeDensity: WorkflowNodeDensity = 'standard')`.
- Consumes: Landing adapter passes `'compact'` as the seventh argument; product callers omit it and receive `standard`.

- [ ] **Step 1: Write failing density-propagation tests**

Add to `workflowFlowModel.test.ts`:

```ts
test('workflowGraphToFlow defaults persisted nodes to standard density', () => {
  const flow = workflowGraphToFlow(workflowGraph(), () => {}, () => {});
  const persistedNodes = flow.nodes.filter((node) => node.type === 'workflow');

  expect(persistedNodes.every((node) => node.data.density === 'standard')).toBe(true);
});

test('workflowGraphToFlow propagates compact density to persisted nodes only', () => {
  const flow = workflowGraphToFlow(
    workflowGraph(),
    () => {},
    () => {},
    undefined,
    'vertical',
    false,
    'compact',
  );
  const persistedNodes = flow.nodes.filter((node) => node.type === 'workflow');

  expect(persistedNodes.every((node) => node.data.density === 'compact')).toBe(true);
  expect(
    flow.nodes
      .filter((node) => node.type !== 'workflow')
      .every((node) => !('density' in node.data)),
  ).toBe(true);
});
```

Add to `LandingAppPreviewWorkflow.test.ts`:

```ts
test('landing workflow preview requests compact persisted nodes', () => {
  expect(source).toContain("'compact',");
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/workflowFlowModel.test.ts src/components/landing/LandingAppPreviewWorkflow.test.ts
```

Expected: FAIL because density is absent from the type, adapter, and landing call.

- [ ] **Step 3: Add the density interface and propagation**

Add in `workflowTypes.ts`:

```ts
export type WorkflowNodeDensity = 'standard' | 'compact';

export type WorkflowNodeData = Record<string, unknown> & {
  density?: WorkflowNodeDensity;
```

Extend `workflowGraphToFlow` in `workflowFlowModel.ts`:

```ts
export function workflowGraphToFlow(
  graph: WorkflowGraph,
  onAddNode: (nodeId: Id<'workflowNodes'>, kind: AddableWorkflowNodeKind) => void,
  onRemoveNode: (nodeId: Id<'workflowNodes'>) => void,
  selectedNodeId?: Id<'workflowNodes'>,
  layoutOrientation: WorkflowLayoutOrientation = 'horizontal',
  disabled = false,
  nodeDensity: WorkflowNodeDensity = 'standard',
): { nodes: WorkflowFlowNode[]; edges: WorkflowFlowEdge[] } {
```

Set `density: nodeDensity` beside the existing persisted-node data fields. Import `WorkflowNodeDensity` from `workflowTypes`.

Pass the landing-only option in `LandingAppPreviewWorkflow.tsx`:

```ts
workflowGraphToFlow(
  graph,
  handleAddNode,
  handleRemoveNode,
  selectedNodeId,
  layoutOrientation,
  false,
  'compact',
)
```

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the Step 2 command again.

Expected: PASS; standard remains the default and only landing persisted nodes request compact density.

- [ ] **Step 5: Commit Task 2**

```bash
git add src/components/workflow/workflowTypes.ts src/components/workflow/workflowFlowModel.ts src/components/workflow/workflowFlowModel.test.ts src/components/landing/LandingAppPreviewWorkflow.tsx src/components/landing/LandingAppPreviewWorkflow.test.ts
git commit -m "Scope compact workflow nodes to landing demo"
```

---

### Task 3: Render compact cards and attached controls

**Files:**
- Modify: `src/components/workflow/WorkflowNode.tsx`
- Modify: `src/components/workflow/WorkflowNode.test.ts`
- Modify: `src/components/workflow/WorkflowAddNodeMenu.tsx`

**Interfaces:**
- Consumes: `WorkflowNodeData.density` from Task 2.
- Produces: `WorkflowAddNodeMenu` optional `compact?: boolean`; standard remains `false`.
- Produces: Density-specific classes and shadcn Button `icon-sm` sizing for compact direct controls.

- [ ] **Step 1: Write the failing renderer contract**

Add to `WorkflowNode.test.ts`:

```ts
test('workflow node compact density reduces the card and direct controls', () => {
  expect(source).toContain("const isCompact = data.density === 'compact'");
  expect(source).toContain("'min-w-[150px] max-w-[255px]'");
  expect(source).toContain("'min-h-[68px] min-w-[150px] max-w-[255px] gap-[5px] rounded-[10px] px-3.5 py-3'");
  expect(source).toContain("'min-w-[187px]'");
  expect(source).toContain("'gap-2 text-sm'");
  expect(source).toContain("'size-7 rounded-md'");
  expect(source).toContain("'size-3.5'");
  expect(source).toContain("'text-[10px] leading-[1.35]'");
  expect(source).toContain("compact={isCompact}");
  expect(source).toContain("size={isCompact ? 'icon-sm' : 'icon'}");
});

test('workflow node standard density keeps the existing production classes', () => {
  expect(source).toContain("'min-w-[176px] max-w-[300px]'");
  expect(source).toContain("'min-h-20 min-w-[176px] max-w-[300px] gap-1.5 rounded-xl px-4 py-3.5'");
  expect(source).toContain("'min-w-[220px]'");
  expect(source).toContain("'gap-2.5 text-base'");
  expect(source).toContain("'size-8 rounded-lg'");
  expect(source).toContain("'text-xs leading-relaxed'");
});
```

- [ ] **Step 2: Run the renderer test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/WorkflowNode.test.ts
```

Expected: FAIL because compact branching and classes do not exist.

- [ ] **Step 3: Implement the compact renderer**

In `WorkflowNode.tsx`, derive compact state:

```ts
const isCompact = data.density === 'compact';
```

Use `cn()` arrays so the existing visual classes remain the standard branch and compact classes are explicit. Apply these compact values:

```ts
const nodeFrameClassName = isCompact
  ? 'min-w-[150px] max-w-[255px]'
  : 'min-w-[176px] max-w-[300px]';
const nodeCardClassName = isCompact
  ? 'min-h-[68px] min-w-[150px] max-w-[255px] gap-[5px] rounded-[10px] px-3.5 py-3'
  : 'min-h-20 min-w-[176px] max-w-[300px] gap-1.5 rounded-xl px-4 py-3.5';
const describedNodeWidthClassName = isCompact ? 'min-w-[187px]' : 'min-w-[220px]';
```

Choose compact branches for the title row (`gap-2 text-sm`), entry icon container (`size-7 rounded-md`), icons (`size-3.5`), description (`text-[10px] leading-[1.35]`), handles (`!size-2.5`), and control rail (`ml-3.5 gap-1.5`). Pass `compact={isCompact}` to `WorkflowAddNodeMenu` and `size={isCompact ? 'icon-sm' : 'icon'}` to the delete Button.

In `WorkflowAddNodeMenu.tsx`, add `compact?: boolean`, default it to `false`, and select the installed Button variant:

```tsx
<Button
  type="button"
  variant="outline"
  size={compact ? 'icon-sm' : 'icon'}
```

Keep DropdownMenu content dimensions and behavior unchanged.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/WorkflowNode.test.ts src/components/workflow/workflowFlowModel.test.ts src/components/landing/LandingAppPreviewWorkflow.test.ts src/components/landing/landingAppPreviewData.test.ts
```

Expected: PASS for compact styling, density isolation, and landing defaults.

- [ ] **Step 5: Commit Task 3**

```bash
git add src/components/workflow/WorkflowNode.tsx src/components/workflow/WorkflowNode.test.ts src/components/workflow/WorkflowAddNodeMenu.tsx
git commit -m "Compact landing workflow node presentation"
```

---

### Task 4: Verify the integrated change and update continuity

**Files:**
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: Completed Tasks 1–3.
- Produces: Verification receipt and current state in the compaction-safe ledger.

- [ ] **Step 1: Run relevant regressions**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/landing/landingAppPreviewData.test.ts src/components/landing/LandingAppPreviewWorkflow.test.ts src/components/landing/landingWorkflowPreviewGraph.test.ts src/components/workflow/WorkflowNode.test.ts src/components/workflow/workflowFlowModel.test.ts src/pages/WorkflowPage.test.ts
```

Expected: all selected files and tests PASS.

- [ ] **Step 2: Run scoped lint**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/components/landing/LandingAppPreview.tsx src/components/landing/LandingAppPreviewWorkflow.tsx src/components/landing/landingAppPreviewData.test.ts src/components/landing/LandingAppPreviewWorkflow.test.ts src/components/workflow/WorkflowNode.tsx src/components/workflow/WorkflowNode.test.ts src/components/workflow/WorkflowAddNodeMenu.tsx src/components/workflow/workflowFlowModel.ts src/components/workflow/workflowFlowModel.test.ts src/components/workflow/workflowTypes.ts
```

Expected: exit 0 with no new lint errors.

- [ ] **Step 3: Verify repository constraints**

```bash
git diff --check
wc -l src/components/landing/LandingAppPreview.tsx src/components/landing/LandingAppPreviewWorkflow.tsx src/components/workflow/WorkflowNode.tsx src/components/workflow/WorkflowAddNodeMenu.tsx src/components/workflow/workflowFlowModel.ts src/components/workflow/workflowTypes.ts
```

Expected: no whitespace errors and every code file is at most 300 lines.

- [ ] **Step 4: Update continuity with factual results**

Record the completed behavior, exact verification outcomes, and touched working set in `CONTINUITY.md`, preserving all section caps and provenance tags.

- [ ] **Step 5: Commit the verification ledger**

```bash
git add CONTINUITY.md
git commit -m "Record landing workflow preview verification"
```
