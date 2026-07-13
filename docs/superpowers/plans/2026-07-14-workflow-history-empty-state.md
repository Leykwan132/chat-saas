# Workflow History Empty State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce the workflow History dialog rounding and give only its empty state a soft neutral inset panel.

**Architecture:** Keep the shared shadcn Dialog and Empty primitives unchanged. Apply local class overrides in `WorkflowAutomationHistoryDialog` so Reminder and Follow-up receive the same refinement while populated history remains untouched.

**Tech Stack:** React 19, TypeScript, shadcn Dialog and Empty, Tailwind CSS, Vitest

## Global Constraints

- Use Node v22 for every script and test command.
- Keep every code file under 300 lines.
- Add no comments unless a non-obvious workaround cannot be expressed clearly in code.
- Use semantic color tokens and existing shadcn components.
- Preserve all query, pagination, scrolling, copy, and populated-history behavior.

---

### Task 1: Refine the shared History dialog empty state

**Files:**
- Modify: `src/components/workflow/WorkflowAutomationHistoryDialog.test.ts`
- Modify: `src/components/workflow/WorkflowAutomationHistoryDialog.tsx`
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: existing `WorkflowAutomationHistoryDialog({ agentId, automationKind })` props and shadcn `DialogContent` and `Empty` class overrides.
- Produces: unchanged component API with local `rounded-2xl` dialog styling and a bordered `rounded-xl bg-muted/60` empty panel.

- [x] **Step 1: Write the failing source assertions**

Add these assertions to the focused History dialog test:

```ts
expect(dialog).toContain('<DialogContent className="sm:max-w-3xl rounded-2xl">');
expect(dialog).toContain('<Empty className="rounded-xl border bg-muted/60 px-8 py-10">');
expect(dialog).toContain('className="flex flex-col gap-2 rounded-xl border p-4"');
```

- [x] **Step 2: Run the focused test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/WorkflowAutomationHistoryDialog.test.ts
```

Expected: FAIL because the dialog and Empty components do not yet contain the approved local classes.

- [x] **Step 3: Apply the local dialog and empty-state classes**

Change only the shared workflow History component:

```tsx
<DialogContent className="sm:max-w-3xl rounded-2xl">
```

```tsx
<Empty className="rounded-xl border bg-muted/60 px-8 py-10">
```

Keep the populated record container unchanged:

```tsx
<div key={item.id} className="flex flex-col gap-2 rounded-xl border p-4">
```

- [x] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/WorkflowAutomationHistoryDialog.test.ts
```

Expected: the focused test passes.

- [x] **Step 5: Run quality checks**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/components/workflow/WorkflowAutomationHistoryDialog.tsx src/components/workflow/WorkflowAutomationHistoryDialog.test.ts
git diff --check
wc -l src/components/workflow/WorkflowAutomationHistoryDialog.tsx src/components/workflow/WorkflowAutomationHistoryDialog.test.ts
```

Expected: ESLint and `git diff --check` exit 0, and both code files remain under 300 lines.

- [x] **Step 6: Record and commit the verified implementation**

Update `CONTINUITY.md` with the completed state and verification receipt, then run:

```bash
git add CONTINUITY.md docs/superpowers/plans/2026-07-14-workflow-history-empty-state.md src/components/workflow/WorkflowAutomationHistoryDialog.tsx src/components/workflow/WorkflowAutomationHistoryDialog.test.ts
git commit -m "Refine workflow History empty state"
```
