# Workflow History Pagination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the shared history Load more button with shadcn Pagination and make each table caption report the exact all-time sent count.

**Architecture:** Keep Convex cursor pagination and the existing 25-item accumulated client result. Slice loaded results into local pages, request another cursor batch only when Next crosses the loaded boundary, and derive the exact sent caption from the existing priced and unpriced cost counters.

**Tech Stack:** React, TypeScript, Convex, shadcn Pagination, Vitest

## Global Constraints

- Node v22 is required for every script and test command.
- Reminder and Follow-up use the same shared dialog and helpers.
- History remains cursor-paginated in batches of 25.
- No code file may exceed 300 lines.
- No new dependency is required.

---

### Task 1: Caption and page model

**Files:**
- Modify: `src/components/workflow/workflowAutomationHistoryCaption.ts`
- Modify: `src/components/workflow/workflowAutomationHistoryCaption.test.ts`
- Create: `src/components/workflow/workflowAutomationHistoryPagination.ts`
- Create: `src/components/workflow/workflowAutomationHistoryPagination.test.ts`

**Interfaces:**
- Produces: `formatWorkflowAutomationHistoryCaption({ automationKind, sentCount })`
- Produces: `getWorkflowAutomationHistoryPageNumbers({ currentPage, totalPages })`

- [ ] **Step 1: Write failing caption and pagination tests**

Cover `1 reminder sent so far.`, plural Reminder and Follow-up captions, pages up to four without ellipses, and larger ranges with bounded ellipses.

- [ ] **Step 2: Verify the tests fail**

Run `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/workflowAutomationHistoryCaption.test.ts src/components/workflow/workflowAutomationHistoryPagination.test.ts` and confirm failures describe the old caption signature and missing pagination helper.

- [ ] **Step 3: Implement the pure helpers**

Use the exact sent count for caption pluralization. Return page numbers and `ellipsis` tokens without reading React or Convex state.

- [ ] **Step 4: Verify the helper tests pass**

Repeat the focused Vitest command and expect all helper tests to pass.

### Task 2: Shared dialog pagination

**Files:**
- Modify: `src/components/workflow/WorkflowAutomationHistoryDialog.tsx`
- Create: `src/components/workflow/WorkflowAutomationHistoryPager.tsx`
- Modify: `src/components/workflow/WorkflowAutomationHistoryDialog.test.ts`
- Modify: `convex/workflowAutomationHistory.ts`
- Modify: `convex/workflowAutomationHistory.test.ts`

**Interfaces:**
- Consumes: the caption and page-number helpers from Task 1
- Consumes: `estimatedTotal.sentCount`, computed from `pricedSentCount + unpricedSentCount`

- [ ] **Step 1: Write failing shared-dialog and backend assertions**

Require shadcn Pagination composition, page slicing, removal of the Load more button, and the exact `sentCount` projection from the existing total.

- [ ] **Step 2: Verify the tests fail**

Run the focused frontend and Convex history tests under Node v22 and confirm they fail for the missing behavior.

- [ ] **Step 3: Implement cursor-backed page navigation**

Render only the active 25-row slice. Previous visits loaded pages without a query. Next calls `loadMore(25)` only at the loaded boundary. Disable unavailable navigation, render the current bounded page links, and use the returned all-time `sentCount` for the caption.

- [ ] **Step 4: Verify the focused tests pass**

Repeat the focused tests and expect all assertions to pass.

### Task 3: Verification and continuity

**Files:**
- Modify: `CONTINUITY.md`

- [ ] **Step 1: Run targeted verification**

Run focused Vitest, targeted ESLint, the production build, `git diff --check`, and touched-code line-count checks under Node v22.

- [ ] **Step 2: Record the durable decision and receipts**

Supersede the loaded-count caption decision with exact all-time sent wording and record shadcn cursor pagination behavior without exceeding ledger section caps.
