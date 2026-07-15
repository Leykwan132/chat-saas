# Workflow History Estimated Spend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-message estimated MYR cost and a true all-time estimated-spend footer to Reminder and Follow-up history.

**Architecture:** Save idempotent cost-accounting state on each sent run and maintain one total document per agent and automation kind in the same Convex transaction. Backfill existing sent runs with the migrations component, expose row and total estimates through the existing history query, and render both through the shared shadcn table.

**Tech Stack:** Convex, `@convex-dev/migrations`, React, TypeScript, shadcn Table, Vitest

## Global Constraints

- Node v22 is required for every script and test command.
- Code files stay below 300 lines and contain no new comments.
- Unknown WhatsApp categories must not use a fallback estimate.
- Reminder and Follow-up continue sharing one history query and dialog.
- Work directly on `main` as explicitly approved by the user.

---

### Task 1: Cost accounting and migration

**Files:**
- Create: `shared/whatsappTemplatePricing.ts`
- Create: `convex/workflowAutomationCost.ts`
- Create: `convex/workflowAutomationCostMigration.ts`
- Modify: `convex/workflowAutomationSchema.ts`
- Modify: `convex/schema.ts`
- Modify: `convex/workflowReminderWorker.ts`
- Modify: `convex/workflowFollowUpWorker.ts`
- Test: `convex/workflowAutomationCost.test.ts`

**Interfaces:**
- Produces: `recordWorkflowAutomationSentCost(ctx, run)` and `getWorkflowAutomationCostTotal(ctx, agentId, automationKind)`.
- Produces: optional run fields `estimatedCostMyr` and `costAccountingStatus`, plus one total row per agent/kind.

- [ ] Write tests for known rates, unknown categories, idempotent accounting, and separate totals.
- [ ] Run the focused test and verify it fails because accounting is absent.
- [ ] Add optional run accounting fields, the totals table, shared exact pricing, and atomic accounting helper.
- [ ] Call accounting from both successful Workpool completion paths.
- [ ] Add a bounded migration runner for existing sent runs.
- [ ] Run the focused test and verify it passes.

### Task 2: Query and shared table footer

**Files:**
- Modify: `convex/workflowAutomationHistory.ts`
- Modify: `convex/workflowAutomationHistory.test.ts`
- Modify: `src/components/workflow/WorkflowAutomationHistoryDialog.tsx`
- Modify: `src/components/workflow/WorkflowAutomationHistoryDialog.test.ts`

**Interfaces:**
- Consumes: saved run `estimatedCostMyr` and the all-time total helper.
- Produces: history response field `estimatedTotalSpentMyr` and an `Estimated cost` column with `Estimated total spent` footer.

- [ ] Extend backend and UI tests with row-cost and all-time-total expectations.
- [ ] Run focused tests and verify they fail on the missing response/footer.
- [ ] Return the total beside the paginated page and render the cost column and `TableFooter`.
- [ ] Run focused tests and verify they pass.

### Task 3: Verification and continuity

**Files:**
- Modify: `CONTINUITY.md`

- [ ] Run focused backend and UI tests on Node v22.
- [ ] Run focused lint and inspect the final diff and code-file line counts.
- [ ] Record the decision, implementation state, migration command, and verification receipts in the continuity ledger.
