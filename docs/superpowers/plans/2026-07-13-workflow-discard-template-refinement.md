# Workflow Discard and Template Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the Discard changes background while adding a pointer cursor, remove forced send-message actions from starter templates, and space applied template nodes with the standard workflow layout.

**Architecture:** Add one reusable semantic Button variant for a red destructive action with no background utilities. Keep template behavior inside `workflowTemplates.ts`, remove all `sendText` actions, and run generated template graphs through the existing horizontal Cleanup layout before exposing them.

**Tech Stack:** React, TypeScript, shadcn/ui Button variants, Dagre workflow layout, Vitest

## Global Constraints

- Use Node.js v22 for every script and test command.
- Keep every code file below 300 lines.
- Do not add comments.
- Preserve existing uncommitted work and do not commit overlapping implementation files.
- Keep Discard changes text and trash icon red with no background in idle, hover, active, or dark mode, and show a pointer cursor while enabled.
- Templates contain no `sendText` or `answerQuestions` actions.
- Applying a template remains draft-only until Save and continues to fit the graph to the screen.

---

### Task 1: Background-Free Destructive Ghost Button

**Files:**
- Create: `src/components/ui/button.test.ts`
- Modify: `src/components/ui/button.tsx`
- Modify: `src/components/workflow/WorkflowDraftToolbar.test.ts`
- Modify: `src/components/workflow/WorkflowDraftActions.tsx`

**Interfaces:**
- Consumes: `buttonVariants` and the existing `onReset: () => void` workflow callback.
- Produces: `variant="destructiveGhost"`, a red foreground/focus treatment with a pointer cursor and no background-color utility.

- [ ] **Step 1: Write the failing shared variant test**

```ts
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const source = readFileSync(new URL('./button.tsx', import.meta.url), 'utf8');

test('destructive ghost buttons stay red without a background', () => {
  const variant = source.match(/destructiveGhost:\s*\n?\s*"([^"]+)"/);
  expect(variant).toBeTruthy();
  const classes = variant?.[1].split(/\s+/) ?? [];
  expect(classes).toContain('text-destructive');
  expect(classes).toContain('hover:text-destructive');
  expect(classes).toContain('cursor-pointer');
  expect(classes).toContain('focus-visible:ring-destructive/20');
  expect(classes.some((className) => /^(?:hover:|active:|dark:)*bg-(?!clip-padding)/.test(className))).toBe(false);
});
```

- [ ] **Step 2: Update the toolbar source assertion**

```ts
expect(actionsSource).toContain('variant="destructiveGhost"');
expect(actionsSource).not.toContain('variant="destructive"');
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/ui/button.test.ts src/components/workflow/WorkflowDraftToolbar.test.ts`

Expected: FAIL because `destructiveGhost` is not a Button variant and the workflow still uses `destructive`.

- [ ] **Step 4: Add the semantic variant and use it**

Add this Button variant:

```ts
destructiveGhost:
  "cursor-pointer text-destructive hover:text-destructive focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
```

Update the workflow action:

```tsx
<Button type="button" variant="destructiveGhost" size="sm" disabled={isSaving} onClick={onReset}>
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/ui/button.test.ts src/components/workflow/WorkflowDraftToolbar.test.ts src/pages/WorkflowPage.test.ts`

Expected: PASS.

### Task 2: Remove Forced Send-Message Template Actions

**Files:**
- Modify: `src/components/workflow/workflowTemplates.test.ts`
- Modify: `src/components/workflow/workflowTemplates.ts`

**Interfaces:**
- Consumes: existing `WORKFLOW_TEMPLATES` definitions.
- Produces: Q&A with file/booking/escalation actions; Real Estate and E-commerce with image/file/booking/escalation actions.

- [ ] **Step 1: Write the failing action and condition assertions**

```ts
for (const template of WORKFLOW_TEMPLATES) {
  const kinds = template.graph.nodes.map((node) => node.kind);
  expect(kinds).not.toContain('sendText');
  expect(kinds).not.toContain('answerQuestions');
}
expect(WORKFLOW_TEMPLATES.map((template) => template.graph.edges.map((edge) => edge.label))).toEqual([
  ['Needs supporting material', 'Ready to book', 'Needs human help'],
  ['Requests property photos', 'Requests property documents', 'Ready to view', 'Needs a property agent'],
  ['Requests product images', 'Requests a product guide', 'Wants a consultation', 'Needs sales help'],
]);
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/workflowTemplates.test.ts`

Expected: FAIL because each template still contains one `sendText` action and its matching condition.

- [ ] **Step 3: Remove the three sendText actions**

Delete the `message` action from Q&A, Real Estate, and E-commerce. Update the Q&A description to:

```ts
'Share a helpful file, offer booking, and escalate when needed.'
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/workflowTemplates.test.ts`

Expected: PASS.

### Task 3: Apply Standard Horizontal Template Layout

**Files:**
- Modify: `src/components/workflow/workflowTemplates.test.ts`
- Modify: `src/components/workflow/workflowTemplates.ts`

**Interfaces:**
- Consumes: `getWorkflowCleanupPositions(graph, 'horizontal')` from `workflowLayout.ts`.
- Produces: `layoutTemplateGraph(graph: WorkflowGraph): WorkflowGraph`, returning the same graph with calculated node coordinates.

- [ ] **Step 1: Write the failing layout assertion**

```ts
for (const template of WORKFLOW_TEMPLATES) {
  const actionYPositions = template.graph.nodes
    .filter((node) => node.kind !== 'start')
    .map((node) => node.positionY)
    .sort((a, b) => a - b);
  for (let index = 1; index < actionYPositions.length; index += 1) {
    expect(actionYPositions[index] - actionYPositions[index - 1]).toBeGreaterThanOrEqual(200);
  }
}
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/workflowTemplates.test.ts`

Expected: FAIL because template actions still use fixed 145px vertical spacing.

- [ ] **Step 3: Add the standard layout helper**

```ts
import { getWorkflowCleanupPositions } from './workflowLayout';

function layoutTemplateGraph(graph: WorkflowGraph): WorkflowGraph {
  const positionByNodeId = new Map(
    getWorkflowCleanupPositions(graph, 'horizontal').map(({ nodeId, position }) => [nodeId, position]),
  );
  return {
    ...graph,
    nodes: graph.nodes.map((node) => {
      const position = positionByNodeId.get(node._id);
      if (!position) throw new Error(`Missing template layout position for ${node._id}`);
      return { ...node, positionX: position.x, positionY: position.y };
    }),
  };
}
```

Build the graph with neutral initial coordinates and return:

```ts
return { id, name, description, graph: layoutTemplateGraph(graph) };
```

- [ ] **Step 4: Run the complete focused workflow suite**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/ui/button.test.ts src/components/workflow/WorkflowDraftToolbar.test.ts src/components/workflow/workflowTemplates.test.ts src/pages/WorkflowPage.test.ts src/components/workflow/WorkflowCanvas.test.ts src/components/workflow/useWorkflowCanvasView.test.ts src/components/workflow/WorkflowToolbar.test.ts`

Expected: PASS.

### Task 4: Final Quality Verification

**Files:**
- Modify: `CONTINUITY.md`
- Verify: all files changed by Tasks 1–3

**Interfaces:**
- Consumes: completed button and template refinements.
- Produces: fresh verification evidence and an updated continuity ledger.

- [ ] **Step 1: Run targeted lint**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/components/ui/button.tsx src/components/ui/button.test.ts src/components/workflow/WorkflowDraftActions.tsx src/components/workflow/WorkflowDraftToolbar.test.ts src/components/workflow/workflowTemplates.ts src/components/workflow/workflowTemplates.test.ts`

Expected: exit 0.

- [ ] **Step 2: Verify diff integrity and file sizes**

Run: `git diff --check && wc -l src/components/ui/button.tsx src/components/ui/button.test.ts src/components/workflow/WorkflowDraftActions.tsx src/components/workflow/WorkflowDraftToolbar.test.ts src/components/workflow/workflowTemplates.ts src/components/workflow/workflowTemplates.test.ts`

Expected: no diff errors and every code file below 300 lines.

- [ ] **Step 3: Update the continuity ledger**

Record the background-free pointer-enabled red action, removal of all forced send-message template actions, standard automatic template layout, and final verification evidence.
