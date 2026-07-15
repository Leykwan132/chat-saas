# Workflow Template Preview Modal Sizing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enlarge both Workflow message-selection dialogs by 30% on sufficiently large screens so more of the existing WhatsApp template preview is visible.

**Architecture:** Keep each dialog's existing shadcn `DialogContent` shell and viewport-safe constraints. Change only the desktop width and height targets in the Reminder and Follow-up dialog components, with source-level regressions in their existing focused test files.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, shadcn/ui Dialog, Vitest, ESLint, Vite

## Global Constraints

- Use Node v22 for every script and test command.
- Keep the existing `calc(100vw - 2rem)` and `calc(100vh - 2rem)` viewport boundaries.
- Set the desktop width target for both dialogs to 1,274px.
- Set the Reminder desktop height target to 936px.
- Set the Follow-up desktop height target to 988px.
- Do not change the reusable WhatsApp preview scale, internal scrolling, selection behavior, or confirmation behavior.
- Do not modify or stage unrelated dirty-worktree changes.

---

### Task 1: Enlarge both Workflow template-selection dialogs

**Files:**
- Modify: `src/components/workflow/WorkflowReminderMessageDialog.test.ts`
- Modify: `src/components/workflow/WorkflowFollowupMessageDialog.test.ts`
- Modify: `src/components/workflow/WorkflowReminderMessageDialog.tsx`
- Modify: `src/components/workflow/WorkflowFollowupMessageDialog.tsx`

**Interfaces:**
- Consumes: the existing `DialogContent` `className` contract and viewport-safe Tailwind arbitrary values.
- Produces: Reminder desktop dimensions of 1,274px by 936px and Follow-up desktop dimensions of 1,274px by 988px, both capped to a 2rem viewport margin.

- [x] **Step 1: Add failing Reminder sizing assertions**

Append this test to `WorkflowReminderMessageDialog.test.ts`:

```ts
test('reminder message dialog uses the enlarged viewport-safe preview layout', () => {
  expect(source).toContain('h-[936px]');
  expect(source).toContain('max-h-[calc(100vh-2rem)]');
  expect(source).toContain('w-[calc(100vw-2rem)]');
  expect(source).toContain('max-w-[1274px]');
  expect(source).toContain('sm:max-w-[1274px]');
  expect(source).not.toContain('h-[720px]');
  expect(source).not.toContain('max-w-[980px]');
});
```

- [x] **Step 2: Add failing Follow-up sizing assertions**

Append this test to `WorkflowFollowupMessageDialog.test.ts`:

```ts
test('follow-up message dialog uses the enlarged viewport-safe preview layout', () => {
  expect(source).toContain('h-[988px]');
  expect(source).toContain('max-h-[calc(100vh-2rem)]');
  expect(source).toContain('w-[calc(100vw-2rem)]');
  expect(source).toContain('max-w-[1274px]');
  expect(source).toContain('sm:max-w-[1274px]');
  expect(source).not.toContain('h-[760px]');
  expect(source).not.toContain('max-w-[980px]');
});
```

- [x] **Step 3: Run the focused tests and verify the new assertions fail**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/WorkflowReminderMessageDialog.test.ts src/components/workflow/WorkflowFollowupMessageDialog.test.ts
```

Expected: both new sizing tests fail because the components still contain 980px width caps and 720px/760px height targets.

- [x] **Step 4: Enlarge the Reminder dialog**

Replace the `WorkflowReminderMessageDialog` `DialogContent` class with:

```tsx
className="flex h-[936px] max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-[1274px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[1274px]"
```

- [x] **Step 5: Enlarge the Follow-up dialog**

Replace the `WorkflowFollowupMessageDialog` `DialogContent` class with:

```tsx
className="flex h-[988px] max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-[1274px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[1274px]"
```

- [x] **Step 6: Run the focused tests and verify they pass**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/workflow/WorkflowReminderMessageDialog.test.ts src/components/workflow/WorkflowFollowupMessageDialog.test.ts
```

Expected: all tests in both files pass.

- [x] **Step 7: Run targeted lint and repository verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/components/workflow/WorkflowReminderMessageDialog.tsx src/components/workflow/WorkflowReminderMessageDialog.test.ts src/components/workflow/WorkflowFollowupMessageDialog.tsx src/components/workflow/WorkflowFollowupMessageDialog.test.ts
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run
source ~/.nvm/nvm.sh && nvm use 22 && bun run build
git diff --check
wc -l src/components/workflow/WorkflowReminderMessageDialog.tsx src/components/workflow/WorkflowReminderMessageDialog.test.ts src/components/workflow/WorkflowFollowupMessageDialog.tsx src/components/workflow/WorkflowFollowupMessageDialog.test.ts
```

Expected: ESLint exits without errors, the complete test suite passes, the production build succeeds, `git diff --check` emits no output, and every touched code file remains below 300 lines.

- [x] **Step 8: Commit only the modal sizing implementation**

```bash
git add src/components/workflow/WorkflowReminderMessageDialog.tsx src/components/workflow/WorkflowReminderMessageDialog.test.ts src/components/workflow/WorkflowFollowupMessageDialog.tsx src/components/workflow/WorkflowFollowupMessageDialog.test.ts docs/superpowers/plans/2026-07-15-workflow-template-preview-modal-sizing.md CONTINUITY.md
git commit -m "Enlarge workflow template preview dialogs"
```
