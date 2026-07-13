# Workflow Reset Fit View Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fit the restored saved workflow to the available canvas after the user clicks Reset.

**Architecture:** Keep Reset responsible for restoring the persisted draft and clearing transient selection/template state. Reuse the existing `arrangeFocusRequest` signal so `WorkflowCanvas` performs the established animated `fitView` after React renders the restored graph.

**Tech Stack:** React, TypeScript, React Flow, Vitest

---

### Task 1: Fit the restored workflow after Reset

**Files:**
- Modify: `src/pages/WorkflowPage.test.ts`
- Modify: `src/pages/WorkflowPage.tsx`

**Step 1: Write the failing test**

Add a source-level regression test that extracts `handleReset` and expects it to restore the draft and increment `arrangeFocusRequest`.

**Step 2: Run the focused test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/WorkflowPage.test.ts`

Expected: FAIL because `handleReset` does not yet call `setArrangeFocusRequest`.

**Step 3: Write the minimal implementation**

Increment `arrangeFocusRequest` inside `handleReset` after restoring the draft and clearing transient state.

**Step 4: Run focused workflow tests**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/WorkflowPage.test.ts src/components/workflow/WorkflowCanvas.test.ts src/components/workflow/useWorkflowCanvasView.test.ts`

Expected: PASS.

**Step 5: Run targeted quality checks**

Run targeted ESLint for the two modified TypeScript files, run `git diff --check`, and verify both code files remain below 300 lines.

Expected: all checks pass.
