# Workflow History Operational Table Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace populated Reminder and Follow-up History cards with one shared five-column operational table.

**Architecture:** Keep `WorkflowAutomationHistoryDialog` as the only renderer for both automation kinds and consume its existing paginated query result unchanged. Compose the installed shadcn Table primitives in the populated state, with small local helpers for distinct customer context and operational reason visibility.

**Tech Stack:** React 19, TypeScript, shadcn Table and Badge, Convex paginated queries, Vitest, ESLint

## Global Constraints

- Columns must be ordered Customer, Template, Scheduled, Sent, Status.
- Scope and Attempt must not appear in the operations table.
- Reasons appear only for failed, skipped, or cancelled records.
- Preserve the dialog, empty state, 25-row pagination, and Load more behavior.
- Apply the change to both Reminder and Follow-up through the shared dialog.
- Run every script under Node 22.
- Keep every code file below 300 lines and add no comments.

---

### Task 1: Shared Operational History Table

**Files:**
- Create: `src/components/ui/table.tsx`
- Modify: `src/components/workflow/WorkflowAutomationHistoryDialog.test.ts`
- Modify: `src/components/workflow/WorkflowAutomationHistoryDialog.tsx`

**Interfaces:**
- Consumes: Existing history items with `customerName`, `customerAddress`, `subjectLabel`, `templateName`, `templateLanguage`, `scheduledAt`, `sentAt`, `status`, and `reason`.
- Produces: One shared table used by both `automationKind="reminder"` and `automationKind="followUp"` dialog instances.

- [x] **Step 1: Write the failing source contract**

Replace the populated-card assertion and add the operational table assertions in `src/components/workflow/WorkflowAutomationHistoryDialog.test.ts`:

```ts
expect(dialog).toContain("from '@/components/ui/table'");
expect(dialog).toContain('<Table>');
expect(dialog).toContain('<TableHeader>');
expect(dialog).toContain('<TableBody>');
expect(dialog).toContain('<TableHead>Customer</TableHead>');
expect(dialog).toContain('<TableHead>Template</TableHead>');
expect(dialog).toContain('<TableHead>Scheduled</TableHead>');
expect(dialog).toContain('<TableHead>Sent</TableHead>');
expect(dialog).toContain('<TableHead>Status</TableHead>');
expect(dialog).toContain('showsOperationalReason(item.status) && item.reason');
expect(dialog).not.toContain('Scope:');
expect(dialog).not.toContain('Attempt:');
expect(dialog).not.toContain('className="flex flex-col gap-2 rounded-xl border p-4"');
```

- [x] **Step 2: Run the focused test to verify it fails**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/WorkflowAutomationHistoryDialog.test.ts
```

Expected: FAIL because populated history still renders cards and does not import the Table primitives.

- [x] **Step 3: Render the shared table**

Import the Table primitives in `src/components/workflow/WorkflowAutomationHistoryDialog.tsx`:

```ts
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
```

Add these local helpers:

```ts
function showsOperationalReason(status: HistoryStatus) {
  return status === 'failed' || status === 'skipped' || status === 'cancelled';
}

function customerPresentation(item: {
  customerName?: string;
  customerAddress?: string;
  subjectLabel: string;
}) {
  const label = item.customerName ?? item.customerAddress ?? item.subjectLabel;
  const context = [item.customerAddress, item.subjectLabel]
    .find((value) => value && value !== label);
  return { label, context };
}
```

Replace the populated card list with:

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Customer</TableHead>
      <TableHead>Template</TableHead>
      <TableHead>Scheduled</TableHead>
      <TableHead>Sent</TableHead>
      <TableHead>Status</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {results.map((item) => {
      const customer = customerPresentation(item);
      return (
        <TableRow key={item.id}>
          <TableCell>
            <div className="flex min-w-48 flex-col gap-1">
              <span className="font-medium">{customer.label}</span>
              {customer.context && <span className="text-muted-foreground">{customer.context}</span>}
            </div>
          </TableCell>
          <TableCell>
            <div className="flex flex-col gap-1">
              <span>{item.templateName}</span>
              <span className="text-muted-foreground">{item.templateLanguage}</span>
            </div>
          </TableCell>
          <TableCell>{new Date(item.scheduledAt).toLocaleString()}</TableCell>
          <TableCell>{item.sentAt ? new Date(item.sentAt).toLocaleString() : '—'}</TableCell>
          <TableCell>
            <div className="flex max-w-56 flex-col items-start gap-1">
              <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
              {showsOperationalReason(item.status) && item.reason && (
                <span className="whitespace-normal text-muted-foreground">{item.reason}</span>
              )}
            </div>
          </TableCell>
        </TableRow>
      );
    })}
  </TableBody>
</Table>
```

Remove the unused `Separator` import.

- [x] **Step 4: Run focused verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/WorkflowAutomationHistoryDialog.test.ts
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/components/ui/table.tsx src/components/workflow/WorkflowAutomationHistoryDialog.tsx src/components/workflow/WorkflowAutomationHistoryDialog.test.ts
git diff --check
wc -l src/components/ui/table.tsx src/components/workflow/WorkflowAutomationHistoryDialog.tsx src/components/workflow/WorkflowAutomationHistoryDialog.test.ts
```

Expected: the focused test and targeted lint pass, the diff has no whitespace errors, and every code file remains below 300 lines.

- [x] **Step 5: Commit the operational table**

```bash
git add src/components/ui/table.tsx src/components/workflow/WorkflowAutomationHistoryDialog.tsx src/components/workflow/WorkflowAutomationHistoryDialog.test.ts docs/superpowers/plans/2026-07-14-workflow-history-operational-table.md
git commit -m "Use table for workflow automation history"
```
