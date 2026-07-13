# Workflow Summary History Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move both workflow History actions from setup headers to the corresponding Summary header rows.

**Architecture:** Keep the existing shared dialog and trigger unchanged. Transfer ownership from each setup component to its Summary component, reading the existing `agentId` from workflow automation state and preserving conditional rendering.

**Tech Stack:** React 19, TypeScript, shadcn Button and Dialog, Vitest

## Global Constraints

- Use Node v22 for every script and test command.
- Keep code files under 300 lines.
- Add no comments unless a non-obvious workaround cannot be expressed clearly in code.
- Keep the shared History trigger as `variant="outline"`, `size="sm"`, with icon and text.
- Preserve `nodrag nopan`, propagation guards, dialog content, pagination, and query behavior.
- Apply the change to both Reminder and Follow-up.

---

### Task 1: Relocate History into both Summary headers

**Files:**
- Modify: `src/components/workflow/WorkflowAutomationHistoryDialog.test.ts`
- Modify: `src/components/workflow/WorkflowReminderSetupNode.tsx`
- Modify: `src/components/workflow/WorkflowReminderSummaryNode.tsx`
- Modify: `src/components/workflow/WorkflowFollowupSetupNode.tsx`
- Modify: `src/components/workflow/WorkflowFollowupSummaryNode.tsx`

**Interfaces:**
- Consumes: `WorkflowAutomationHistoryDialog`, `useWorkflowAutomationState`, and the existing Summary node props.
- Produces: unchanged component exports and dialog behavior, with History rendered only in Summary headers when `agentId` exists.

- [x] **Step 1: Update the focused placement test**

Replace the setup-card placement assertions in `WorkflowAutomationHistoryDialog.test.ts` with:

```ts
const reminderSetup = source('./WorkflowReminderSetupNode.tsx');
const followupSetup = source('./WorkflowFollowupSetupNode.tsx');
const reminderSummary = source('./WorkflowReminderSummaryNode.tsx');
const followupSummary = source('./WorkflowFollowupSummaryNode.tsx');

expect(reminderSetup).not.toContain('<WorkflowAutomationHistoryDialog');
expect(followupSetup).not.toContain('<WorkflowAutomationHistoryDialog');
expect(reminderSummary).toContain('<WorkflowAutomationHistoryDialog');
expect(reminderSummary).toContain('automationKind="reminder"');
expect(followupSummary).toContain('<WorkflowAutomationHistoryDialog');
expect(followupSummary).toContain('automationKind="followUp"');
expect(reminderSummary).toContain('className="flex items-center justify-between gap-3"');
expect(followupSummary).toContain('className="flex items-center justify-between gap-3"');
expect(dialog).toContain('variant="outline"');
expect(dialog).toContain('size="sm"');
expect(dialog).toContain('<History data-icon="inline-start" />');
```

- [x] **Step 2: Run the focused test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/WorkflowAutomationHistoryDialog.test.ts
```

Expected: FAIL because History is still rendered in both setup headers and absent from both Summary headers.

- [x] **Step 3: Move the Reminder History action**

Remove the History dialog import and conditional render from `WorkflowReminderSetupNode.tsx`, leaving the switch as the setup header action.

In `WorkflowReminderSummaryNode.tsx`, import `useWorkflowAutomationState` and `WorkflowAutomationHistoryDialog`, read `agentId`, and replace the title with:

```tsx
<div className="flex items-center justify-between gap-3">
  <h3 className="m-0 min-w-0 truncate text-base font-semibold text-foreground">
    {data.title}
  </h3>
  {agentId && (
    <WorkflowAutomationHistoryDialog
      agentId={agentId}
      automationKind="reminder"
    />
  )}
</div>
```

- [x] **Step 4: Move the Follow-up History action**

Remove the History dialog import and conditional render from `WorkflowFollowupSetupNode.tsx`, leaving the switch as the setup header action.

In `WorkflowFollowupSummaryNode.tsx`, import `useWorkflowAutomationState` and `WorkflowAutomationHistoryDialog`, read `agentId`, and replace the title with:

```tsx
<div className="flex items-center justify-between gap-3">
  <h3 className="m-0 min-w-0 truncate text-base font-semibold text-foreground">
    {data.title}
  </h3>
  {agentId && (
    <WorkflowAutomationHistoryDialog
      agentId={agentId}
      automationKind="followUp"
    />
  )}
</div>
```

- [x] **Step 5: Run focused tests and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/WorkflowAutomationHistoryDialog.test.ts src/components/workflow/WorkflowAutomationActivationNodes.test.ts src/components/workflow/WorkflowReminderNoticePlacement.test.ts
```

Expected: all focused tests pass.

- [x] **Step 6: Run quality checks**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/components/workflow/WorkflowAutomationHistoryDialog.test.ts src/components/workflow/WorkflowReminderSetupNode.tsx src/components/workflow/WorkflowReminderSummaryNode.tsx src/components/workflow/WorkflowFollowupSetupNode.tsx src/components/workflow/WorkflowFollowupSummaryNode.tsx
git diff --check
wc -l src/components/workflow/WorkflowReminderSetupNode.tsx src/components/workflow/WorkflowReminderSummaryNode.tsx src/components/workflow/WorkflowFollowupSetupNode.tsx src/components/workflow/WorkflowFollowupSummaryNode.tsx
```

Expected: ESLint exits 0, `git diff --check` exits 0, and every touched code file remains under 300 lines.

- [x] **Step 7: Commit the implementation**

```bash
git add CONTINUITY.md docs/superpowers/plans/2026-07-13-workflow-summary-history-button.md src/components/workflow/WorkflowAutomationHistoryDialog.test.ts src/components/workflow/WorkflowReminderSetupNode.tsx src/components/workflow/WorkflowReminderSummaryNode.tsx src/components/workflow/WorkflowFollowupSetupNode.tsx src/components/workflow/WorkflowFollowupSummaryNode.tsx
git commit -m "Move workflow History into summaries"
```
