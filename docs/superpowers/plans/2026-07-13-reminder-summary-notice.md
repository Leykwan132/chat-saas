# Reminder Summary Notice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the reminder eligibility notice from the setup card to directly below the Summary description and use Lucide's `Info` icon.

**Architecture:** Keep the notice as presentational markup owned by the reminder Summary component. Remove its duplicate setup-card markup without changing reminder state, persistence, or backend behavior.

**Tech Stack:** React 19, TypeScript, Lucide React, Tailwind CSS, Vitest

## Global Constraints

- Use Node v22 for every script and test command.
- Keep code files under 300 lines.
- Add no comments unless a non-obvious workaround cannot be expressed clearly in code.
- Preserve the exact copy: `Reminders will only be sent to customers with booked appointments.`
- Preserve the existing callout layout and semantic styling.

---

### Task 1: Relocate the reminder eligibility notice

**Files:**
- Create: `src/components/workflow/WorkflowReminderNoticePlacement.test.ts`
- Modify: `src/components/workflow/WorkflowReminderSetupNode.tsx`
- Modify: `src/components/workflow/WorkflowReminderSummaryNode.tsx`

**Interfaces:**
- Consumes: existing reminder setup and summary React components.
- Produces: unchanged component exports with the notice rendered only by `WorkflowReminderSummaryNode`.

- [x] **Step 1: Write the failing placement test**

```ts
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

test('places the booked-appointments notice below the reminder summary description', () => {
  const setupSource = source('./WorkflowReminderSetupNode.tsx');
  const summarySource = source('./WorkflowReminderSummaryNode.tsx');
  const descriptionEnd = summarySource.indexOf('</p>');
  const noticeCopyIndex = summarySource.indexOf(
    'Reminders will only be sent to customers with booked appointments.',
  );
  const separatorIndex = summarySource.indexOf('<Separator />');

  expect(setupSource).not.toContain(
    'Reminders will only be sent to customers with booked appointments.',
  );
  expect(summarySource).toContain("import { ArrowRight, Info } from 'lucide-react'");
  expect(summarySource).toContain('<Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />');
  expect(noticeCopyIndex).toBeGreaterThan(descriptionEnd);
  expect(separatorIndex).toBeGreaterThan(noticeCopyIndex);
});
```

- [x] **Step 2: Run the focused test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/WorkflowReminderNoticePlacement.test.ts
```

Expected: FAIL because the setup component still owns the notice and the Summary component has no `Info` notice.

- [x] **Step 3: Implement the minimal component change**

In `WorkflowReminderSetupNode.tsx`, remove the dashed notice callout that appears between the first `Separator` and the setup sections.

In `WorkflowReminderSummaryNode.tsx`, import `Info` beside `ArrowRight` and insert this markup immediately after the description paragraph:

```tsx
<div className="flex items-start gap-3 rounded-md border border-dashed border-border/80 bg-muted/50 px-3 py-3">
  <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
  <p className="m-0 text-[13px] leading-relaxed text-muted-foreground">
    Reminders will only be sent to customers with booked appointments.
  </p>
</div>
```

- [x] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/WorkflowReminderNoticePlacement.test.ts
```

Expected: 1 test passes.

- [x] **Step 5: Run focused regression and quality checks**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/WorkflowReminderNoticePlacement.test.ts src/components/workflow/WorkflowAutomationActivationNodes.test.ts src/components/workflow/WorkflowAutomationScope.test.ts
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/components/workflow/WorkflowReminderSetupNode.tsx src/components/workflow/WorkflowReminderSummaryNode.tsx src/components/workflow/WorkflowReminderNoticePlacement.test.ts
git diff --check
wc -l src/components/workflow/WorkflowReminderSetupNode.tsx src/components/workflow/WorkflowReminderSummaryNode.tsx src/components/workflow/WorkflowReminderNoticePlacement.test.ts
```

Expected: all focused tests pass, ESLint exits 0, `git diff --check` exits 0, and every code file remains under 300 lines.

- [x] **Step 6: Commit the implementation**

```bash
git add docs/superpowers/plans/2026-07-13-reminder-summary-notice.md src/components/workflow/WorkflowReminderNoticePlacement.test.ts src/components/workflow/WorkflowReminderSetupNode.tsx src/components/workflow/WorkflowReminderSummaryNode.tsx CONTINUITY.md
git commit -m "Move reminder notice into summary"
```
