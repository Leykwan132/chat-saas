# Reminder Notice Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Summary reminder notice white in light mode with the semantic `bg-background` token.

**Architecture:** Extend the existing source-level notice regression test, then replace only the callout background utility. Keep the component structure, theme tokens, content, and behavior otherwise unchanged.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Vitest

## Global Constraints

- Use Node v22 for every script and test command.
- Keep code files under 300 lines.
- Add no comments unless a non-obvious workaround cannot be expressed clearly in code.
- Keep the notice border, radius, spacing, icon, text, copy, and placement unchanged.
- Use semantic `bg-background`; do not use literal `bg-white` or a manual dark-mode override.

---

### Task 1: Apply the theme-aware white notice background

**Files:**
- Modify: `src/components/workflow/WorkflowReminderNoticePlacement.test.ts`
- Modify: `src/components/workflow/WorkflowReminderSummaryNode.tsx`

**Interfaces:**
- Consumes: the existing `WorkflowReminderSummaryNode` markup and placement regression test.
- Produces: unchanged component exports with a semantic background token on the notice callout.

- [x] **Step 1: Write the failing background assertion**

Add these assertions to the existing placement test:

```ts
expect(summarySource).toContain(
  'rounded-md border border-dashed border-border/80 bg-background px-3 py-3',
);
expect(summarySource).not.toContain('bg-muted/50');
```

- [x] **Step 2: Run the focused test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/WorkflowReminderNoticePlacement.test.ts
```

Expected: FAIL because the notice still contains `bg-muted/50` and does not contain `bg-background`.

- [x] **Step 3: Implement the minimal class change**

Change the notice wrapper in `WorkflowReminderSummaryNode.tsx` from:

```tsx
<div className="flex items-start gap-3 rounded-md border border-dashed border-border/80 bg-muted/50 px-3 py-3">
```

to:

```tsx
<div className="flex items-start gap-3 rounded-md border border-dashed border-border/80 bg-background px-3 py-3">
```

- [x] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/WorkflowReminderNoticePlacement.test.ts
```

Expected: 1 test passes.

- [x] **Step 5: Run focused quality checks**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/WorkflowReminderNoticePlacement.test.ts
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/components/workflow/WorkflowReminderSummaryNode.tsx src/components/workflow/WorkflowReminderNoticePlacement.test.ts
git diff --check
wc -l src/components/workflow/WorkflowReminderSummaryNode.tsx src/components/workflow/WorkflowReminderNoticePlacement.test.ts
```

Expected: the focused test passes, ESLint exits 0, `git diff --check` exits 0, and both code files remain under 300 lines.

- [x] **Step 6: Commit the implementation**

```bash
git add CONTINUITY.md docs/superpowers/plans/2026-07-13-reminder-notice-background.md src/components/workflow/WorkflowReminderNoticePlacement.test.ts src/components/workflow/WorkflowReminderSummaryNode.tsx
git commit -m "Use white reminder notice background"
```
