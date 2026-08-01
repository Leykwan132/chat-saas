# Calendar and Inbox Sidebar Titles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fixed boxed Calendar and Inbox sidebar headers with plain normal-weight KiloBot page titles while preserving all sidebar behavior.

**Architecture:** Define one small shared `SidebarPageTitleRow` component that owns the unboxed row and title typography. Calendar and the expanded Inbox filter sidebar consume it, the loading skeleton mirrors its geometry, and the collapsed Inbox rail keeps its existing expand button in a compact unboxed row.

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
- Create: `src/components/SidebarPageTitleRow.tsx`
- Create: `src/components/SidebarPageTitleRow.test.tsx`
- Modify: `src/pages/CalendarPage.tsx`
- Modify: `src/components/inbox/InboxFilterSidebar.tsx`
- Modify: `src/components/inbox/InboxPageSkeleton.tsx`
- Test: `src/pages/CalendarSidebarPadding.test.ts`
- Test: `src/components/SidebarPageTitleRow.test.tsx`

**Interfaces:**
- Consumes: existing `inboxColumnClassName`, `inboxColumnScrollClassName`, Inbox collapse callbacks, and Calendar sidebar controls.
- Produces: `SidebarPageTitleRow({ title, action })`, which renders a plain `h1` with `font-title text-3xl font-normal` and an optional right-side action.

- [x] **Step 1: Write the failing rendered regression**

Create `src/components/SidebarPageTitleRow.test.tsx`:

```ts
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { SidebarPageTitleRow } from './SidebarPageTitleRow';

test('renders an unboxed normal-weight KiloBot sidebar title with an action', () => {
  const markup = renderToStaticMarkup(
    <SidebarPageTitleRow title="Inbox" action={<button type="button">Collapse</button>} />,
  );

  expect(markup).toContain('<h1');
  expect(markup).toContain('font-title');
  expect(markup).toContain('text-3xl');
  expect(markup).toContain('font-normal');
  expect(markup).toContain('Inbox');
  expect(markup).toContain('Collapse');
  expect(markup).not.toContain('border-b');
});
```

- [x] **Step 2: Run the regression and confirm RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/SidebarPageTitleRow.test.tsx
```

Expected: FAIL because `SidebarPageTitleRow` does not exist.

- [x] **Step 3: Implement the shared title and unboxed rows**

Create the shared component:

```tsx
import type { ReactNode } from 'react';

export function SidebarPageTitleRow({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between px-4 pb-2 pt-4">
      <h1 className="m-0 font-title text-3xl font-normal tracking-tight text-foreground">
        {title}
      </h1>
      {action}
    </div>
  );
}
```

In Calendar, replace the bordered header with:

```tsx
<SidebarPageTitleRow title="Calendar" />
```

In the Inbox filter sidebar, pass the existing collapse button as the shared row's `action` when expanded. Render the collapsed expand button in an unboxed centered row, preserving both callbacks and accessible labels. Remove the unused legacy sidebar-title constant and update the loading skeleton to use the expanded row geometry without `inboxColumnHeaderClassName`.

- [x] **Step 4: Run focused tests and lint**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/SidebarPageTitleRow.test.tsx src/pages/CalendarSidebarPadding.test.ts src/pages/ChatsPageHeaderActions.test.ts
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/components/SidebarPageTitleRow.tsx src/components/SidebarPageTitleRow.test.tsx src/lib/sidebarNavStyles.ts src/components/inbox/InboxFilterSidebar.tsx src/components/inbox/InboxPageSkeleton.tsx
git diff --check
```

Expected: all focused tests pass, scoped lint exits zero, and whitespace checks pass. CalendarPage legacy lint findings are excluded because this change only replaces its header markup and imports.

- [x] **Step 5: Record the customer-facing result and commit**

Update `CONTINUITY.md` with the new unboxed sidebar-title behavior, focused verification, and unreleased status. Do not update the production changelog without a confirmed release date.

```bash
git add CONTINUITY.md docs/superpowers/plans/2026-08-02-calendar-inbox-sidebar-titles.md src/components/SidebarPageTitleRow.tsx src/components/SidebarPageTitleRow.test.tsx src/lib/sidebarNavStyles.ts src/pages/CalendarPage.tsx src/components/inbox/InboxFilterSidebar.tsx src/components/inbox/InboxPageSkeleton.tsx
git commit -m "Style Calendar and Inbox sidebar titles"
```
