# Calendar and Inbox Sidebar Titles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Use plain normal-weight KiloBot sidebar titles with compact following space and update the main Inbox and Services navigation icons while preserving all behavior.

**Architecture:** Keep title typography and compact following space in the shared `SidebarPageTitleRow`. Calendar and expanded Inbox consume it, the loading skeleton mirrors its geometry, and the main navigation data selects Lucide's `MessagesSquare` and `ShoppingCart` icons for Inbox and Services.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, shadcn/ui Button, Vitest

## Global Constraints

- Use Node.js v22 for every script and test command.
- Use `font-title`, `text-3xl`, and `font-normal` for both visible titles.
- Do not change Calendar, Inbox filtering, collapse, permissions, scrolling, or responsive behavior.
- Do not modify or stage unrelated `convex/_generated/api.d.ts` changes.
- Do not add comments or exceed 300 lines in any new code file.
- Limit icon replacements to the main Inbox and Services navigation entries.

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

---

### Task 2: Compact Title Spacing and Navigation Icons

**Files:**
- Modify: `src/components/SidebarPageTitleRow.tsx`
- Modify: `src/components/SidebarPageTitleRow.test.tsx`
- Modify: `src/pages/CalendarPage.tsx`
- Modify: `src/pages/CalendarSidebarPadding.test.ts`
- Modify: `src/components/inbox/InboxPageSkeleton.tsx`
- Modify: `src/components/app-sidebar-nav.ts`
- Modify: `src/components/AppSidebarFeatureFlag.test.ts`

**Interfaces:**
- Consumes: `SidebarPageTitleRow({ title, action })` and `getNavItems(agentId, featureOptions)`.
- Produces: a title row with `pb-0`, a Calendar New Booking button without `mt-2`, and navigation items whose `icon` references are `MessagesSquare` for Inbox and `ShoppingCart` for Services.

- [ ] **Step 1: Write failing spacing and icon regressions**

Extend `SidebarPageTitleRow.test.tsx`:

```ts
expect(markup).toContain('pb-0');
expect(markup).not.toContain('pb-2');
```

Extend `CalendarSidebarPadding.test.ts`:

```ts
expect(source).toContain('className="h-11 w-full gap-2 px-5 py-3"');
expect(source).not.toContain('className="mt-2 h-11 w-full gap-2 px-5 py-3"');
```

Extend `AppSidebarFeatureFlag.test.ts` with real icon references:

```ts
import { MessagesSquare, ShoppingCart } from 'lucide-react';

test('uses the approved Inbox and Services navigation icons', () => {
  const navigation = getNavItems('agent-id', {
    showSavedReplies: false,
    enableAvatarFeature: false,
  });

  expect(navigation.engagement.find((item) => item.label === 'Inbox')?.icon).toBe(
    MessagesSquare,
  );
  expect(navigation.bookings.find((item) => item.label === 'Services')?.icon).toBe(
    ShoppingCart,
  );
});
```

- [ ] **Step 2: Run the regressions and confirm RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/SidebarPageTitleRow.test.tsx src/pages/CalendarSidebarPadding.test.ts src/components/AppSidebarFeatureFlag.test.ts
```

Expected: FAIL because the title row still uses `pb-2`, Calendar still uses `mt-2`, and the navigation still returns `MessageSquare` and `CalendarCheck`.

- [ ] **Step 3: Implement the compact gap and icon replacements**

Change the shared title row and matching skeleton from `pb-2` to `pb-0`. Remove only `mt-2` from Calendar's New Booking button. In `app-sidebar-nav.ts`, replace the `MessageSquare` and `CalendarCheck` imports and mappings:

```ts
import { MessagesSquare, ShoppingCart } from 'lucide-react';

{ to: `/dashboard/${agentId}/inbox`, icon: MessagesSquare, label: 'Inbox', end: true, requiredPermission: Permission.CHATS_READ }
{ to: `/dashboard/${agentId}/services`, icon: ShoppingCart, label: 'Services', end: true, requiredPermission: Permission.AUTOMATION_READ }
```

- [ ] **Step 4: Run focused verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/SidebarPageTitleRow.test.tsx src/pages/CalendarSidebarPadding.test.ts src/components/AppSidebarFeatureFlag.test.ts src/pages/ChatsPageHeaderActions.test.ts
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/components/SidebarPageTitleRow.tsx src/components/SidebarPageTitleRow.test.tsx src/pages/CalendarSidebarPadding.test.ts src/components/inbox/InboxPageSkeleton.tsx src/components/app-sidebar-nav.ts src/components/AppSidebarFeatureFlag.test.ts
git diff --check
```

Expected: all focused tests, scoped lint, and whitespace checks pass.

- [ ] **Step 5: Record and commit**

Update `CONTINUITY.md` with the compact spacing, approved icons, focused verification, and unreleased status. Do not update the changelog without a confirmed production date.

```bash
git add CONTINUITY.md docs/superpowers/plans/2026-08-02-calendar-inbox-sidebar-titles.md src/components/SidebarPageTitleRow.tsx src/components/SidebarPageTitleRow.test.tsx src/pages/CalendarPage.tsx src/pages/CalendarSidebarPadding.test.ts src/components/inbox/InboxPageSkeleton.tsx src/components/app-sidebar-nav.ts src/components/AppSidebarFeatureFlag.test.ts
git commit -m "Refine sidebar title spacing and icons"
```
