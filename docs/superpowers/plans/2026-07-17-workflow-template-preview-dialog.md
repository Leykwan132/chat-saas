# Workflow Template Preview Dialog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show starter workflow templates in a separate large read-only dialog while the live workflow canvas remains bound to the actual current graph.

**Architecture:** `WorkflowPage` continues owning the client-only preview selection and direct replacement mutation. A new `WorkflowTemplatePreviewDialog` converts the preview graph into a dedicated React Flow instance inside shadcn Dialog. `WorkflowCanvas` returns to live-graph editing only and loses every preview-specific prop and guard.

**Tech Stack:** React 19, TypeScript, shadcn Dialog/Button, Radix Dialog, `@xyflow/react`, Vitest source-contract tests, Tailwind CSS v4.

## Global Constraints

- Run every script with `source ~/.nvm/nvm.sh && nvm use 22` in the same shell.
- Keep every authored code file at or below 300 lines.
- Use the installed shadcn Dialog and Button components; do not add dependencies.
- The dialog uses `calc(100vw - 2rem)` width and `92vh` height, with an explicit responsive max-width override.
- The preview uses minimal fit padding so node content remains readable.
- Skip is a borderless ghost/text action; the existing dialog backdrop remains unchanged.
- The template canvas is read-only and separate from the live workflow canvas.
- Replace Current persists directly; Skip, close, Escape, and outside dismissal never mutate.
- Block dialog dismissal while replacement is pending.
- Preserve dirty Reminder and Follow-up automation drafts.
- Do not stage or modify `docs/kilobot-launch-video-script.md`.

---

### Task 1: Build the isolated read-only preview dialog

**Files:**
- Create: `src/components/workflow/WorkflowTemplatePreviewDialog.tsx`
- Create: `src/components/workflow/WorkflowTemplatePreviewDialog.test.ts`
- Delete: `src/components/workflow/WorkflowTemplatePreviewOverlay.tsx`
- Delete: `src/components/workflow/WorkflowTemplatePreviewOverlay.test.ts`
- Delete: `src/components/workflow/useWorkflowTemplatePreviewEscape.ts`

**Interfaces:**
- Consumes: `WorkflowTemplatePreview`, `workflowGraphToFlow`, `getWorkflowCanvasViewElements`, `workflowCanvasNodeTypes`, `workflowCanvasEdgeTypes`, `WorkflowBackground`.
- Produces:

```ts
type WorkflowTemplatePreviewDialogProps = {
  preview?: WorkflowTemplatePreview;
  isReplacing: boolean;
  onReplace: () => void;
  onSkip: () => void;
};

export function WorkflowTemplatePreviewDialog(
  props: WorkflowTemplatePreviewDialogProps,
): React.JSX.Element;
```

- [ ] **Step 1: Confirm the installed Dialog API**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx --bun shadcn@latest docs dialog button
```

Expected: the command returns official Dialog and Button documentation URLs. Compare the required APIs with `src/components/ui/dialog.tsx`; no component installation or overwrite is needed.

- [ ] **Step 2: Write the failing dialog source-contract test**

Create `src/components/workflow/WorkflowTemplatePreviewDialog.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const source = readFileSync(
  new URL("./WorkflowTemplatePreviewDialog.tsx", import.meta.url),
  "utf8",
);

test("template preview uses a separate read-only dialog canvas", () => {
  expect(source).toContain("<Dialog");
  expect(source).toContain("<DialogTitle>");
  expect(source).toContain("Preview {preview.template.name}");
  expect(source).toContain("<ReactFlowProvider>");
  expect(source).toContain("nodesDraggable={false}");
  expect(source).toContain("nodesConnectable={false}");
  expect(source).toContain("elementsSelectable={false}");
  expect(source).toContain("deleteKeyCode={null}");
  expect(source).toContain("Replace Current");
  expect(source).toContain("Skip");
});

test("replacement pending state blocks every dismissal path", () => {
  expect(source).toContain("if (!open && !isReplacing) onSkip()");
  expect(source).toContain("if (isReplacing) event.preventDefault()");
  expect(source).toContain("showCloseButton={!isReplacing}");
  expect(source).toContain("disabled={isReplacing}");
});
```

- [ ] **Step 3: Run the test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/WorkflowTemplatePreviewDialog.test.ts
```

Expected: FAIL because `WorkflowTemplatePreviewDialog.tsx` does not exist.

- [ ] **Step 4: Implement the isolated dialog**

Create `src/components/workflow/WorkflowTemplatePreviewDialog.tsx` with this structure:

```tsx
import { useMemo } from "react";
import { Loader2 } from "lucide-react";
import {
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WorkflowBackground } from "./WorkflowBackground";
import {
  workflowCanvasEdgeTypes,
  workflowCanvasNodeTypes,
} from "./workflowCanvasConfig";
import { getWorkflowCanvasViewElements } from "./workflowCanvasViews";
import { workflowGraphToFlow } from "./workflowFlowModel";
import type { WorkflowTemplatePreview } from "./workflowTemplatePreviewModel";

type WorkflowTemplatePreviewDialogProps = {
  preview?: WorkflowTemplatePreview;
  isReplacing: boolean;
  onReplace: () => void;
  onSkip: () => void;
};

function WorkflowTemplatePreviewCanvas({
  preview,
}: {
  preview: WorkflowTemplatePreview;
}) {
  const flow = useMemo(() => {
    const graphFlow = workflowGraphToFlow(
      preview.graph,
      () => undefined,
      () => undefined,
      undefined,
      preview.graph.workflow.layoutOrientation ?? "horizontal",
      true,
    );
    return getWorkflowCanvasViewElements(
      graphFlow.nodes,
      graphFlow.edges,
      "messageHandling",
    );
  }, [preview]);

  return (
    <ReactFlowProvider>
      <ReactFlow
        nodes={flow.nodes}
        edges={flow.edges}
        nodeTypes={workflowCanvasNodeTypes}
        edgeTypes={workflowCanvasEdgeTypes}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.35}
        maxZoom={1.6}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        deleteKeyCode={null}
        connectOnClick={false}
        panOnDrag
        zoomOnScroll
        proOptions={{ hideAttribution: true }}
      >
        <WorkflowBackground />
      </ReactFlow>
    </ReactFlowProvider>
  );
}

export function WorkflowTemplatePreviewDialog({
  preview,
  isReplacing,
  onReplace,
  onSkip,
}: WorkflowTemplatePreviewDialogProps) {
  return (
    <Dialog
      open={preview !== undefined}
      onOpenChange={(open) => {
        if (!open && !isReplacing) onSkip();
      }}
    >
      <DialogContent
        className="flex h-[80vh] w-[90vw] max-w-[90vw] flex-col gap-0 overflow-hidden p-0"
        showCloseButton={!isReplacing}
        onEscapeKeyDown={(event) => {
          if (isReplacing) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (isReplacing) event.preventDefault();
        }}
      >
        <DialogHeader className="shrink-0 border-b p-6">
          <DialogTitle>
            Preview {preview?.template.name ?? "workflow template"}
          </DialogTitle>
          <DialogDescription>
            Review this read-only workflow before replacing your current map.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 bg-muted/35">
          {preview ? <WorkflowTemplatePreviewCanvas preview={preview} /> : null}
        </div>
        <DialogFooter className="shrink-0 border-t p-4">
          <Button
            type="button"
            variant="outline"
            disabled={isReplacing}
            onClick={onSkip}
          >
            Skip
          </Button>
          <Button
            type="button"
            disabled={isReplacing}
            onClick={onReplace}
          >
            {isReplacing ? (
              <Loader2 className="animate-spin" data-icon="inline-start" />
            ) : null}
            Replace Current
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

Delete the old overlay component, its test, and the custom Escape hook because Radix Dialog owns those dismissal paths.

- [ ] **Step 5: Run the dialog tests and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/WorkflowTemplatePreviewDialog.test.ts
```

Expected: 2 tests pass.

- [ ] **Step 6: Commit the isolated dialog**

```bash
git add src/components/workflow/WorkflowTemplatePreviewDialog.tsx src/components/workflow/WorkflowTemplatePreviewDialog.test.ts src/components/workflow/WorkflowTemplatePreviewOverlay.tsx src/components/workflow/WorkflowTemplatePreviewOverlay.test.ts src/components/workflow/useWorkflowTemplatePreviewEscape.ts
git commit -m "Add workflow template preview dialog"
```

---

### Task 2: Keep the live workflow canvas separate from preview state

**Files:**
- Modify: `src/pages/WorkflowPage.tsx`
- Modify: `src/pages/WorkflowPage.test.ts`
- Modify: `src/components/workflow/WorkflowCanvas.tsx`
- Modify: `src/components/workflow/WorkflowCanvas.test.ts`

**Interfaces:**
- Consumes: `WorkflowTemplatePreviewDialog` from Task 1.
- Produces: a `WorkflowPage` that always derives `flow` from `latestGraph`, passes no preview state into `WorkflowCanvas`, and renders the preview dialog as a sibling.

- [ ] **Step 1: Replace the old page and canvas assertions with failing separation assertions**

Update the preview test in `src/pages/WorkflowPage.test.ts`:

```ts
test("workflow page previews templates in a dialog separate from the live canvas", () => {
  expect(source).toContain("createWorkflowTemplatePreview(");
  expect(source).toContain("<WorkflowTemplatePreviewDialog");
  expect(source).toContain("preview={templatePreview}");
  expect(source).toContain("workflowGraphToFlow(");
  expect(source).toContain("latestGraph,");
  expect(source).not.toContain("displayedGraph");
  expect(source).not.toContain("templatePreview={");
  expect(source).toContain("await messageActions.replaceTemplate(");
  expect(source).toContain("setTemplatePreview(undefined)");
});
```

Replace the preview-specific test in `src/components/workflow/WorkflowCanvas.test.ts`:

```ts
test("workflow canvas contains no template preview presentation", () => {
  expect(source).not.toContain("templatePreview");
  expect(source).not.toContain("isPreviewing");
  expect(source).not.toContain("WorkflowTemplatePreviewOverlay");
  expect(source).not.toContain("useWorkflowTemplatePreviewEscape");
  expect(source).toContain("nodesDraggable");
  expect(source).toContain("nodesConnectable");
  expect(source).toContain("elementsSelectable");
});
```

- [ ] **Step 2: Run the page and canvas tests and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/WorkflowPage.test.ts src/components/workflow/WorkflowCanvas.test.ts
```

Expected: FAIL because the page still swaps `displayedGraph` and the live canvas still owns preview behavior.

- [ ] **Step 3: Simplify `WorkflowCanvas` to live editing only**

In `src/components/workflow/WorkflowCanvas.tsx`:

- remove `WorkflowTemplatePreviewOverlay` and `useWorkflowTemplatePreviewEscape` imports;
- remove `templatePreview` from props and destructuring;
- remove `WorkflowTemplatePreviewProps` and `isPreviewing`;
- remove preview guards from connect, edge delete, edge click, and node click;
- restore `nodesDraggable`, `nodesConnectable`, `elementsSelectable`, and `deleteKeyCode={['Backspace', 'Delete']}`;
- remove the preview background class and wrapper overlay;
- pass `handleViewChange` directly to `WorkflowToolbar`;
- stop mixing preview state into Cleanup, Arrange, and template-control disabled props.

The resulting React Flow configuration must contain:

```tsx
<ReactFlow
  nodes={localNodes}
  edges={renderedEdges}
  nodeTypes={workflowCanvasNodeTypes}
  edgeTypes={workflowCanvasEdgeTypes}
  fitView
  fitViewOptions={{ padding: automationView ? 0.45 : 0.25 }}
  minZoom={0.35}
  maxZoom={automationView ? 1.35 : 1.6}
  nodesDraggable
  nodesConnectable
  deleteKeyCode={["Backspace", "Delete"]}
  connectOnClick={false}
  connectionRadius={120}
  elevateNodesOnSelect={false}
  elementsSelectable
/>
```

- [ ] **Step 4: Bind the live flow only to `latestGraph`**

In `src/pages/WorkflowPage.tsx`, import the dialog:

```ts
import { WorkflowTemplatePreviewDialog } from "@/components/workflow/WorkflowTemplatePreviewDialog";
```

Remove `displayedGraph`. Derive layout and flow from the current persisted graph only:

```ts
const layoutOrientation =
  latestGraph.workflow.layoutOrientation ?? "horizontal";
const flow = useMemo(
  () =>
    workflowGraphToFlow(
      latestGraph,
      (nodeId, kind) => void messageActions.addNode(nodeId, kind),
      (nodeId) => void messageActions.removeNode(nodeId),
      selectedNodeId,
      layoutOrientation,
      messageActions.isGraphMutating,
    ),
  [
    latestGraph,
    layoutOrientation,
    messageActions,
    selectedNodeId,
  ],
);
```

Remove the `templatePreview` prop from `<WorkflowCanvas>`. Add the dialog as its sibling:

```tsx
<WorkflowTemplatePreviewDialog
  preview={templatePreview}
  isReplacing={messageActions.isGraphMutating}
  onReplace={() => void handleTemplateReplace()}
  onSkip={() => setTemplatePreview(undefined)}
/>
```

Keep `handleTemplateReplace` unchanged so failure retains preview and success clears it.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/WorkflowPage.test.ts src/components/workflow/WorkflowCanvas.test.ts src/components/workflow/WorkflowTemplatePreviewDialog.test.ts src/components/workflow/workflowTemplatePreviewModel.test.ts src/pages/workflowTemplateReplacementPersistence.test.ts
```

Expected: 5 files pass with no failures.

- [ ] **Step 6: Commit the live/preview separation**

```bash
git add src/pages/WorkflowPage.tsx src/pages/WorkflowPage.test.ts src/components/workflow/WorkflowCanvas.tsx src/components/workflow/WorkflowCanvas.test.ts
git commit -m "Separate workflow preview from live canvas"
```

---

### Task 3: Verify behavior, modularity, and continuity

**Files:**
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: completed dialog and live-canvas separation.
- Produces: verified implementation evidence and bounded continuity state.

- [ ] **Step 1: Run the focused workflow suite**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/WorkflowPage.test.ts src/pages/workflowMessageActions.test.ts src/pages/workflowTemplateReplacementPersistence.test.ts src/components/workflow
```

Expected: all workflow files and tests pass.

- [ ] **Step 2: Run targeted ESLint**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/pages/WorkflowPage.tsx src/pages/WorkflowPage.test.ts src/components/workflow/WorkflowCanvas.tsx src/components/workflow/WorkflowCanvas.test.ts src/components/workflow/WorkflowTemplatePreviewDialog.tsx src/components/workflow/WorkflowTemplatePreviewDialog.test.ts
```

Expected: exit code 0 with no warnings or errors.

- [ ] **Step 3: Run the complete app suite**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run --exclude 'kilobot-docs/**'
```

Expected: every app test passes. The separate `kilobot-docs` `node:test` files remain outside Vitest discovery.

- [ ] **Step 4: Run the docs native suite**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bun test kilobot-docs/tests/help-center-brand.test.mjs kilobot-docs/tests/help-center-structure.test.mjs
```

Expected: 17 tests pass.

- [ ] **Step 5: Run TypeScript and the production build**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bun run build
```

Expected: TypeScript and Vite build exit 0; the existing large-chunk warning may remain.

- [ ] **Step 6: Check source contracts, whitespace, and line limits**

Run:

```bash
rg -n "WorkflowTemplatePreviewOverlay|useWorkflowTemplatePreviewEscape|templatePreview\\?:|isPreviewing|displayedGraph" src/pages/WorkflowPage.tsx src/components/workflow/WorkflowCanvas.tsx
git diff --check -- . ':(exclude)docs/kilobot-launch-video-script.md'
wc -l src/pages/WorkflowPage.tsx src/components/workflow/WorkflowCanvas.tsx src/components/workflow/WorkflowTemplatePreviewDialog.tsx
```

Expected: the source scan returns no matches, `git diff --check` exits 0, and every authored code file is at or below 300 lines.

- [ ] **Step 7: Update continuity**

Update `CONTINUITY.md` with:

- the dialog preview as implemented code in Snapshot;
- D389 remaining active;
- the dialog component in Working set;
- fresh verification counts in Receipts;
- no more than 25 Snapshot lines, 7 Done bullets, 12 Working set paths, and 20 Receipts.

- [ ] **Step 8: Commit verified implementation state**

```bash
git add CONTINUITY.md
git commit -m "Document workflow preview dialog verification"
```

Do not stage `docs/kilobot-launch-video-script.md`.

---

### Task 4: Expand the preview for readable node content

Tasks 1–3 were completed in commits `6823dabd`, `07140e8e`, and `7384cd0b`. This task supersedes only their dialog sizing, graph-fit padding, and Skip-button styling.

**Files:**
- Modify: `src/components/workflow/WorkflowTemplatePreviewDialog.test.ts`
- Modify: `src/components/workflow/WorkflowTemplatePreviewDialog.tsx`

**Interfaces:**
- Keeps the existing `WorkflowTemplatePreviewDialogProps` contract unchanged.
- Produces a near-full-viewport preview with readable node content and a text-style Skip action.

- [ ] **Step 1: Write the failing sizing and readability contract**

Add this test to `src/components/workflow/WorkflowTemplatePreviewDialog.test.ts`:

```ts
test("preview uses nearly the full viewport and keeps node content readable", () => {
  expect(source).toContain("fitViewOptions={{ padding: 0.08 }}");
  expect(source).toContain("h-[92vh]");
  expect(source).toContain("w-[calc(100vw-2rem)]");
  expect(source).toContain("sm:!max-w-[calc(100vw-2rem)]");
  expect(source).toContain('variant="ghost"');
  expect(source).not.toContain('variant="outline"');
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/WorkflowTemplatePreviewDialog.test.ts
```

Expected: FAIL because the current dialog still uses `0.25` fit padding, `80vh`, `90vw`, and an outlined Skip button.

- [ ] **Step 3: Implement the approved viewport sizing**

In `src/components/workflow/WorkflowTemplatePreviewDialog.tsx`:

- change `fitViewOptions` to `{ padding: 0.08 }`;
- set `DialogContent` to:

```tsx
className="flex h-[92vh] w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden p-0 sm:!max-w-[calc(100vw-2rem)]"
```

- change the Skip button from `variant="outline"` to `variant="ghost"`;
- leave the dialog backdrop and every dismissal/replacement behavior unchanged.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/WorkflowTemplatePreviewDialog.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 5: Run focused workflow verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/WorkflowPage.test.ts src/pages/workflowMessageActions.test.ts src/pages/workflowTemplateReplacementPersistence.test.ts src/components/workflow
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/components/workflow/WorkflowTemplatePreviewDialog.tsx src/components/workflow/WorkflowTemplatePreviewDialog.test.ts
```

Expected: all focused workflow tests pass and ESLint exits 0.

- [ ] **Step 6: Commit the readable preview**

```bash
git add src/components/workflow/WorkflowTemplatePreviewDialog.tsx src/components/workflow/WorkflowTemplatePreviewDialog.test.ts
git commit -m "Make workflow preview nodes readable"
```

---

### Task 5: Verify the sizing amendment and continuity

**Files:**
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: the completed sizing amendment.
- Produces: full verification evidence and bounded continuity state.

- [ ] **Step 1: Run the complete app and docs test suites**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run --exclude 'kilobot-docs/**' --reporter=dot
source ~/.nvm/nvm.sh && nvm use 22 && bun test kilobot-docs/tests/help-center-brand.test.mjs kilobot-docs/tests/help-center-structure.test.mjs
```

Expected: every app test and all 17 docs tests pass.

- [ ] **Step 2: Run the production build**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bun run build
```

Expected: TypeScript and Vite build exit 0; the existing large-chunk warning may remain.

- [ ] **Step 3: Check the final source and workspace**

Run:

```bash
rg -n "fitViewOptions|h-\[92vh\]|w-\[calc\(100vw-2rem\)\]|sm:!max-w|variant=\"ghost\"" src/components/workflow/WorkflowTemplatePreviewDialog.tsx
git diff --check -- . ':(exclude)docs/kilobot-launch-video-script.md'
wc -l src/components/workflow/WorkflowTemplatePreviewDialog.tsx src/components/workflow/WorkflowTemplatePreviewDialog.test.ts
git status --short
```

Expected: the source contains every approved contract, the scoped diff check passes, both files remain at or below 300 lines, and the unrelated video-script edit remains unstaged.

- [ ] **Step 4: Update and commit continuity**

Update `CONTINUITY.md` with the implemented near-full-viewport preview and fresh verification counts while preserving its section limits.

```bash
git add CONTINUITY.md
git commit -m "Document readable workflow preview verification"
```

Do not stage `docs/kilobot-launch-video-script.md`.
