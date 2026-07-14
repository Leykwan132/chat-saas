# Workflow History Responsive Dialog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the shared Reminder and Follow-up History dialog fit its table content with comfortable padding while containing overflow on narrower screens.

**Architecture:** Change only the layout contract on the shared `WorkflowAutomationHistoryDialog`. Use content-fit dialog sizing with a viewport-safe maximum, responsive padding, and a shrinkable scroll-region grid item so the existing Table overflow container remains inside the dialog.

**Tech Stack:** React 19, TypeScript, shadcn Dialog, Radix ScrollArea, Tailwind CSS v4, Vitest, ESLint

## Global Constraints

- Apply one shared change to both Reminder and Follow-up History.
- Use content-fit width instead of a fixed width token.
- Preserve the existing small-screen viewport margin.
- Use `sm:p-8` desktop padding and `min-w-0` on the scroll region.
- Do not change table columns, data, pagination, or empty-state behavior.
- Run every script under Node 22.
- Keep every code file below 300 lines and add no comments.

---

### Task 1: Content-Fit History Dialog

**Files:**
- Modify: `src/components/workflow/WorkflowAutomationHistoryDialog.test.ts`
- Modify: `src/components/workflow/WorkflowAutomationHistoryDialog.tsx`

**Interfaces:**
- Consumes: Existing `DialogContent`, `ScrollArea`, and Table composition in `WorkflowAutomationHistoryDialog`.
- Produces: A shared content-fit dialog with viewport-safe containment for both automation kinds.

- [x] **Step 1: Write the failing layout contract**

Replace the old fixed-width assertion in `WorkflowAutomationHistoryDialog.test.ts` with:

```ts
expect(dialog).toContain('<DialogContent className="w-fit rounded-2xl p-6 sm:max-w-[calc(100%-4rem)] sm:p-8">');
expect(dialog).toContain('<ScrollArea className="min-w-0 max-h-[60vh]">');
expect(dialog).not.toContain('sm:max-w-3xl');
```

- [x] **Step 2: Run the focused test to verify it fails**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/WorkflowAutomationHistoryDialog.test.ts
```

Expected: FAIL because the dialog still uses `sm:max-w-3xl` and the scroll region lacks `min-w-0`.

- [x] **Step 3: Implement the shared responsive layout**

Update the two shared layout elements in `WorkflowAutomationHistoryDialog.tsx`:

```tsx
<DialogContent className="w-fit rounded-2xl p-6 sm:max-w-[calc(100%-4rem)] sm:p-8">
```

```tsx
<ScrollArea className="min-w-0 max-h-[60vh]">
```

- [x] **Step 4: Run focused verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/WorkflowAutomationHistoryDialog.test.ts
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/components/workflow/WorkflowAutomationHistoryDialog.tsx src/components/workflow/WorkflowAutomationHistoryDialog.test.ts
git diff --check
wc -l src/components/workflow/WorkflowAutomationHistoryDialog.tsx src/components/workflow/WorkflowAutomationHistoryDialog.test.ts
```

Expected: the focused test and targeted lint pass, the diff has no whitespace errors, and both code files remain below 300 lines.

- [x] **Step 5: Commit the responsive dialog**

```bash
git add src/components/workflow/WorkflowAutomationHistoryDialog.tsx src/components/workflow/WorkflowAutomationHistoryDialog.test.ts docs/superpowers/plans/2026-07-14-workflow-history-responsive-dialog.md
git commit -m "Fit workflow history dialog to table"
```
