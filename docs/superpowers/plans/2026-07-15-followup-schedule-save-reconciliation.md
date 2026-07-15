# Follow-up Schedule Save and Reconciliation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist canonical Follow-up schedule values and reconcile active pending Follow-up work after enabled configuration changes.

**Architecture:** Add shared pure schedule-selection helpers used by the frontend state provider, then extend the existing Convex save-effect calculation to enqueue Follow-up reconciliation when an already-enabled configuration revision changes. Reuse the current reconciliation worker and runtime replacement behavior.

**Tech Stack:** TypeScript, React, Convex, Vitest, convex-test

## Global Constraints

- Node v22 is required for every script and test command.
- Read `convex/_generated/ai/guidelines.md` before Convex changes.
- Keep code files under 300 lines and avoid comments unless unavoidable.
- Do not add fallback behavior for invalid schedule option IDs.

---

### Task 1: Atomic Follow-up schedule selection

**Files:**
- Modify: `shared/workflowAutomations.ts`
- Modify: `src/components/workflow/workflowAutomationState.tsx`
- Test: `src/components/workflow/workflowFollowupStartAfterOptions.test.ts`

**Interfaces:**
- Produces: `applyWorkflowFollowupScheduleSelection(followUp, stepKey, optionId): WorkflowFollowUpAutomationConfig`
- Supports: `stepKey` values `interval` and `maxAttempts`

- [ ] **Step 1: Write failing tests**

Test that `interval48h` produces `intervalHours: 48`, `maxAttempts1` produces `maxAttempts: 1`, each preserves unrelated state, and malformed IDs throw.

- [ ] **Step 2: Verify red**

Run `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/workflowFollowupStartAfterOptions.test.ts` and confirm failure because the helper is missing.

- [ ] **Step 3: Implement minimally**

Parse only the two stable option ID formats in the shared helper and call it from `setSelection` for Follow-up interval/max-attempt changes.

- [ ] **Step 4: Verify green**

Run the focused test and confirm all assertions pass.

### Task 2: Reconcile changed enabled Follow-up configurations

**Files:**
- Modify: `convex/workflowAutomationConfig.ts`
- Test: `convex/workflowAutomationConfig.test.ts`

**Interfaces:**
- Consumes: current and next `WorkflowAutomationConfigs`
- Produces: `getWorkflowAutomationSaveEffects` with `followUp` reconciliation for an enabled revision change

- [ ] **Step 1: Write failing tests**

Test that an enabled Follow-up revision change reconciles, an unchanged enabled save does not, initial future-only activation does not, and disabling still cancels without reconciliation.

- [ ] **Step 2: Verify red**

Run `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/workflowAutomationConfig.test.ts` and confirm the revision-change test fails with an empty reconciliation list.

- [ ] **Step 3: Implement minimally**

Add the already-enabled revision-change condition to the existing save-effect calculation without changing reminder behavior.

- [ ] **Step 4: Verify green**

Run the focused test and confirm all save-effect cases pass.

### Task 3: Integrated verification and continuity

**Files:**
- Modify: `CONTINUITY.md`

- [ ] **Step 1: Run focused related tests**

Run the schedule helper, automation config, lifecycle, reconciliation, draft-save, and Follow-up runtime/worker tests under Node 22.

- [ ] **Step 2: Run proportional static verification**

Run targeted ESLint, Convex TypeScript checking, `git diff --check`, and touched-code LOC checks under Node 22.

- [ ] **Step 3: Run the complete test suite**

Run `source ~/.nvm/nvm.sh && nvm use 22 && bun test` and require zero failures.

- [ ] **Step 4: Update the ledger**

Replace the diagnostic snapshot with the implemented behavior and add a fresh verification receipt.

