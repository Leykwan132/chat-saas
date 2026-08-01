# Calendar and Inbox Sidebar Titles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fixed boxed Calendar and Inbox sidebar headers with plain normal-weight KiloBot page titles while preserving all sidebar behavior.

**Architecture:** Define one shared sidebar page-title class in `sidebarNavStyles.ts`. Calendar, the expanded Inbox filter sidebar, and its loading skeleton will render unboxed top rows; the collapsed Inbox rail keeps its existing expand button in a compact unboxed row.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, shadcn/ui Button, Vitest

## Global Constraints

- Use Node.js v22 for every script and test command.
- Use `font-title`, `text-3xl`, and `font-normal` for both visible titles.
- Do not change Calendar, Inbox filtering, collapse, permissions, scrolling, or responsive behavior.
- Do not modify or stage unrelated `convex/_generated/api.d.ts` changes.
- Do not add comments or exceed 300 lines in any new code file.

---

### Task 1: Unboxed Sidebar Page Titles

**Files:**
- Create: `src/pages/CalendarInboxSidebarTitles.test.ts`
- Modify: `src/lib/sidebarNavStyles.ts`
- Modify: `src/pages/CalendarPage.tsx`
- Modify: `src/components/inbox/InboxFilterSidebar.tsx`
- Modify: `src/components/inbox/InboxPageSkeleton.tsx`
- Test: `src/pages/CalendarSidebarPadding.test.ts`
- Test: `src/pages/CalendarInboxSidebarTitles.test.ts`

**Interfaces:**
- Consumes: existing `inboxColumnClassName`, `inboxColumnScrollClassName`, Inbox collapse callbacks, and Calendar sidebar controls.
- Produces: `inboxSidebarPageTitleClassName`, a shared string containing `m-0 font-title text-3xl font-normal tracking-tight text-foreground`.

- [ ] **Step 1: Write the failing source-level regression**

Create `src/pages/CalendarInboxSidebarTitles.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

test('uses unboxed KiloBot titles for Calendar and Inbox sidebars', () => {
  const calendar = source('./CalendarPage.tsx');
  const inbox = source('../components/inbox/InboxFilterSidebar.tsx');
  const skeleton = source('../components/inbox/InboxPageSkeleton.tsx');
  const styles = source('../lib/sidebarNavStyles.ts');

  expect(styles).toContain("'m-0 font-title text-3xl font-normal tracking-tight text-foreground'");
  expect(calendar).toContain('<h1 className={inboxSidebarPageTitleClassName}>Calendar</h1>');
  expect(calendar).not.toContain("cn(inboxColumnHeaderClassName, 'px-[0.675rem]')");
  expect(inbox).toContain('<h2 className={inboxSidebarPageTitleClassName}>Inbox</h2>');
  expect(inbox).toContain('aria-label="Collapse filters"');
  expect(inbox).toContain('aria-label="Expand filters"');
  expect(skeleton).not.toContain("cn(inboxColumnHeaderClassName, 'justify-between px-[0.675rem]')");
});
```

- [ ] **Step 2: Run the regression and confirm RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/CalendarInboxSidebarTitles.test.ts
```

Expected: FAIL because `inboxSidebarPageTitleClassName` and the unboxed rows do not exist.

- [ ] **Step 3: Implement the shared title and unboxed rows**

Rename `inboxSidebarHeaderTitleClassName` to `inboxSidebarPageTitleClassName` and set it to:

```ts
export const inboxSidebarPageTitleClassName =
  'm-0 font-title text-3xl font-normal tracking-tight text-foreground';
```

In Calendar, replace the bordered header with:

```tsx
<div className="px-4 pb-2 pt-4">
  <h1 className={inboxSidebarPageTitleClassName}>Calendar</h1>
</div>
```

In the Inbox filter sidebar, render the expanded title and collapse button in an unboxed `flex items-start justify-between px-4 pb-2 pt-4` row. Render the collapsed expand button in an unboxed centered row, preserving both callbacks and accessible labels. Update the loading skeleton to use the expanded row geometry without `inboxColumnHeaderClassName`.

- [ ] **Step 4: Run focused tests and lint**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/CalendarInboxSidebarTitles.test.ts src/pages/CalendarSidebarPadding.test.ts src/pages/ChatsPageHeaderActions.test.ts
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/pages/CalendarInboxSidebarTitles.test.ts src/lib/sidebarNavStyles.ts src/components/inbox/InboxFilterSidebar.tsx src/components/inbox/InboxPageSkeleton.tsx
git diff --check
```

Expected: all focused tests pass, scoped lint exits zero, and whitespace checks pass. CalendarPage legacy lint findings are excluded because this change only replaces its header markup and imports.

- [ ] **Step 5: Record the customer-facing result and commit**

Update `CONTINUITY.md` with the new unboxed sidebar-title behavior, focused verification, and unreleased status. Do not update the production changelog without a confirmed release date.

```bash
git add CONTINUITY.md src/pages/CalendarInboxSidebarTitles.test.ts src/lib/sidebarNavStyles.ts src/pages/CalendarPage.tsx src/components/inbox/InboxFilterSidebar.tsx src/components/inbox/InboxPageSkeleton.tsx
git commit -m "Style Calendar and Inbox sidebar titles"
```
