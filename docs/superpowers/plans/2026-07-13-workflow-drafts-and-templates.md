# Workflow Drafts and Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make workflow graph edits local until an explicit Save, provide Reset and navigation protection, and add Q&A, Real Estate, and E-commerce starter templates through the existing Hover Card.

**Architecture:** Represent the editable graph with the existing Convex document shapes plus client-generated draft IDs, and compare it canonically with the last persisted graph. A single authenticated Convex mutation validates and synchronizes retained/new/deleted nodes and all edges in one transaction. Focused modules own draft operations, templates, persistence payloads, and toolbar UI so every code file stays below 300 lines.

**Tech Stack:** React 19, React Router 7, TypeScript 6, XYFlow, shadcn/Radix Hover Card and Dialog, Convex, Vitest.

## Global Constraints

- Use Node v22 for every script and test command.
- Read `convex/_generated/ai/guidelines.md` before Convex edits.
- No code file may exceed 300 lines.
- Do not add comments or fallback graphs.
- Save and Reset match the existing workflow toolbar styling.
- Templates are Q&A, Real Estate, and E-commerce Product and contain no Answer Questions nodes.
- New draft media nodes require the first workflow Save before asset upload because uploads require a persisted node ID.

---

### Task 1: Pure draft graph model and templates

**Files:**
- Create: `src/components/workflow/workflowDraftModel.ts`
- Create: `src/components/workflow/workflowDraftModel.test.ts`
- Create: `src/components/workflow/workflowTemplates.ts`
- Create: `src/components/workflow/workflowTemplates.test.ts`

**Interfaces:**
- Produces: `createWorkflowDraft`, `workflowDraftsEqual`, `addDraftNodeAfter`, `removeDraftNode`, `connectDraftNodes`, `removeDraftEdge`, `updateDraftNode`, `updateDraftEdge`, `arrangeDraftWorkflow`, `isDraftWorkflowNodeId`, and `WORKFLOW_TEMPLATES`.
- Uses `WorkflowGraph` and existing node defaults/layout helpers.

- [ ] Write failing tests proving canonical equality ignores timestamps/order, every edit returns a changed graph, reset cloning is isolated, node removal bridges edges, and all three templates contain send/media/booking/escalation nodes without `answerQuestions`.
- [ ] Run `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/workflowDraftModel.test.ts src/components/workflow/workflowTemplates.test.ts`; expect failures because modules do not exist.
- [ ] Implement immutable graph operations with `draft-node:`/`draft-edge:` IDs and static horizontal template graphs.
- [ ] Re-run the focused tests; expect all pass.

### Task 2: Atomic Convex graph replacement

**Files:**
- Create: `convex/workflowDraftSave.ts`
- Create: `convex/workflowDraftSaveModel.ts`
- Create: `convex/workflowDraftSave.test.ts`
- Modify: `convex/workflowValidators.ts`

**Interfaces:**
- Produces public mutation `api.workflowDraftSave.replaceForAgent`.
- Input: `{ agentId, baselineUpdatedAt, layoutOrientation, nodes, edges }`, where nodes carry `clientId` and optional `persistedNodeId`, and edges reference client IDs.
- Returns `WorkflowGraph`.

- [ ] Write Convex tests for authorization, stale timestamps, structural validation, retained IDs, new-node mapping, deleted-node media cleanup, service ownership, and atomic rollback.
- [ ] Run `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/workflowDraftSave.test.ts`; expect missing API failures.
- [ ] Implement validators and pure payload validation, then synchronize nodes and recreate edges in one mutation; retain existing nodes and queue media cleanup only for deleted media nodes.
- [ ] Re-run the Convex tests; expect all pass.

### Task 3: Draft toolbar and template Hover Card

**Files:**
- Create: `src/components/workflow/WorkflowDraftActions.tsx`
- Create: `src/components/workflow/WorkflowTemplateHoverCard.tsx`
- Create: `src/components/workflow/WorkflowDraftToolbar.test.ts`
- Modify: `src/components/workflow/WorkflowToolbar.tsx`
- Modify: `src/components/workflow/WorkflowCanvas.tsx`

**Interfaces:**
- Canvas consumes `isDirty`, `isSaving`, `onSave`, `onDraftReset`, and `onTemplateApply`.
- Templates trigger `onTemplateApply(templateId)` with `Replace current` copy.

- [ ] Write failing source/behavior tests for top-right toolbar styling, dirty-only Save/Reset, removal of destructive Reset, Templates beside Cleanup, Hover Card top placement, and three `Replace current` actions.
- [ ] Run the focused toolbar test; expect missing components/props.
- [ ] Implement the two focused components and thread props through Canvas/Toolbar.
- [ ] Re-run the focused tests; expect all pass.

### Task 4: Workflow page draft orchestration

**Files:**
- Create: `src/pages/useWorkflowDraft.ts`
- Create: `src/pages/workflowDraftPersistence.ts`
- Create: `src/pages/workflowDraftPersistence.test.ts`
- Modify: `src/pages/WorkflowPage.tsx`
- Modify: `src/pages/WorkflowPage.test.ts`
- Modify: `src/pages/workflowPageArrangement.ts`

**Interfaces:**
- `useWorkflowDraft(persistedGraph)` returns baseline, draft, dirty state, selection-safe operations, reset, and acceptPersistedGraph.
- `toWorkflowDraftSavePayload(draft, baselineUpdatedAt)` feeds the Convex mutation.

- [ ] Write failing tests for payload mapping, local add/remove/connect/move/arrange/edit/template replacement, failed-save preservation, and successful-save baseline promotion.
- [ ] Run the page/draft tests; expect missing hook and old immediate mutations.
- [ ] Replace per-action mutations with draft operations and call only `replaceForAgent` from the page-level Save.
- [ ] Re-run focused tests; expect all pass.

### Task 5: Inspector Apply, unsaved navigation, and draft media boundary

**Files:**
- Modify: `src/components/workflow/WorkflowInspector.tsx`
- Modify: `src/components/workflow/WorkflowInspectorForm.tsx`
- Modify: `src/components/workflow/WorkflowInspectorForm.test.ts`
- Modify: `src/pages/WorkflowPage.tsx`
- Reuse: `src/components/agent-setup/UnsavedChangesDialog.tsx`

**Interfaces:**
- Inspector receives draft documents and an `isPersistedNode` boolean.
- Node form emits Apply values locally; draft media nodes show Save-before-upload guidance instead of querying media APIs.

- [ ] Write failing tests for Apply copy, no direct persistence, media guidance, `useBlocker`, `beforeunload`, Keep Editing, and Discard and Leave.
- [ ] Run focused tests; expect old Save copy and missing navigation guard.
- [ ] Implement inspector and navigation behavior, resetting selection and draft on discard.
- [ ] Re-run focused tests; expect all pass.

### Task 6: Generated API and verification

**Files:**
- Modify generated output only through Convex codegen.
- Update: `CONTINUITY.md`.

- [ ] Run `source ~/.nvm/nvm.sh && nvm use 22 && bunx convex codegen`.
- [ ] Run all focused workflow and Convex tests added or touched by Tasks 1–5.
- [ ] Run targeted ESLint on every touched frontend and Convex source/test file.
- [ ] Run `source ~/.nvm/nvm.sh && nvm use 22 && bunx tsc -b` because this is a planned cross-cutting task.
- [ ] Run `git diff --check` and verify every touched code file is at most 300 lines.
- [ ] Update `CONTINUITY.md` with the final behavior and verification receipts.
