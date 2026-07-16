# Broadcast History Convex Pagination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Broadcast History's native table and bounded query with a shadcn Table backed by Convex cursor pagination in fixed 10-record numbered pages.

**Architecture:** Keep `api.whatsappBroadcast.listSchedulesForAgent` as the public entrypoint but return Convex's paginated result. `BroadcastPage` owns the query and mutations, while focused broadcast components own table/pager presentation, guide-card presentation, and calculator presentation. A pure pagination model translates accumulated Convex results and query status into safe numbered-page state.

**Tech Stack:** React 19, TypeScript 6, Convex 1.36, `usePaginatedQuery` from `convex/react`, shadcn Table/Pagination, Vitest, convex-test, Tailwind CSS.

## Global Constraints

- Work directly on `main` and preserve unrelated dirty-worktree changes.
- Run every script and test under Node v22 in the same shell execution sequence.
- Use `paginationOptsValidator` and `.paginate(args.paginationOpts)` according to `convex/_generated/ai/guidelines.md`.
- The initial query and every subsequent load request exactly 10 records.
- Preserve newest-first ordering, permissions, row navigation, action propagation, statuses, delete animation, confirmation copy, and mutation toasts.
- Do not add dependencies or comments.
- Every touched code file must contain at most 300 lines.

---

### Task 1: Convert the Broadcast schedule query to cursor pagination

**Files:**
- Modify: `convex/whatsappBroadcast.ts:1-10,284-296`
- Modify: `convex/personalWorkspace.test.ts:187-194`
- Create: `convex/whatsappBroadcastPagination.test.ts`

**Interfaces:**
- Consumes: `paginationOptsValidator` from `convex/server` and the existing `by_agentId_and_scheduledAt` index.
- Produces: `api.whatsappBroadcast.listSchedulesForAgent({ agentId, paginationOpts })`, returning `{ page, isDone, continueCursor }`.

- [ ] **Step 1: Update the existing personal-workspace test so its query call uses the future contract**

```ts
const schedulesList = await testWithAuth.query(api.whatsappBroadcast.listSchedulesForAgent, {
  agentId,
  paginationOpts: { numItems: 10, cursor: null },
});
expect(schedulesList.page).toHaveLength(1);
expect(schedulesList.page[0]._id).toBe(scheduleId);
expect(schedulesList.isDone).toBe(true);
```

- [ ] **Step 2: Add a focused failing pagination test**

```ts
/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { expect, test } from 'vitest';
import { api } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

test('paginates broadcast schedules newest first without overlap', async () => {
  const t = convexTest(schema, modules);
  const fixture = await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert('users', {
      workosUserId: 'broadcast-pagination-owner',
      email: 'broadcast-pagination@example.com',
      createdAt: now,
      updatedAt: now,
    });
    const teamId = await ctx.db.insert('teams', {
      type: 'personal',
      name: 'Personal Workspace',
      ownerId: userId,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(userId, { activeTeamId: teamId, updatedAt: now });
    const agentId = await ctx.db.insert('agents', {
      name: 'Broadcast Pagination Agent',
      provider: 'openrouter',
      model: 'deepseek/deepseek-v4-flash',
      systemPrompt: 'Test',
      templateKey: 'blank',
      fileSize: 0,
      userId: 'broadcast-pagination-owner',
      orgId: '',
      createdAt: now,
      updatedAt: now,
    });
    const channelId = await ctx.db.insert('channels', {
      orgId: '',
      service: 'whatsapp',
      wabaId: 'broadcast-pagination-waba',
      phoneNumberId: 'broadcast-pagination-phone',
      accessToken: 'test-token',
      status: 'connected',
      connectedByUserId: 'broadcast-pagination-owner',
      createdAt: now,
      updatedAt: now,
    });
    for (let index = 0; index < 12; index += 1) {
      await ctx.db.insert('whatsappBroadcastSchedules', {
        agentId,
        orgId: '',
        channelId,
        templateName: `campaign-${index}`,
        templateLanguage: 'en',
        scheduledAt: now + index,
        status: 'completed',
        createdBy: 'broadcast-pagination-owner',
        createdAt: now + index,
        totalCount: 1,
        okCount: 1,
        failCount: 0,
      });
    }
    return { agentId };
  });
  const authed = t.withIdentity({ subject: 'broadcast-pagination-owner' });
const firstPage = await authed.query(api.whatsappBroadcast.listSchedulesForAgent, {
  agentId: fixture.agentId,
  paginationOpts: { numItems: 10, cursor: null },
});
expect(firstPage.page).toHaveLength(10);
expect(firstPage.page.map((item) => item.templateName)).toEqual([
  'campaign-11', 'campaign-10', 'campaign-9', 'campaign-8', 'campaign-7',
  'campaign-6', 'campaign-5', 'campaign-4', 'campaign-3', 'campaign-2',
]);
expect(firstPage.isDone).toBe(false);

const secondPage = await authed.query(api.whatsappBroadcast.listSchedulesForAgent, {
  agentId: fixture.agentId,
  paginationOpts: { numItems: 10, cursor: firstPage.continueCursor },
});
expect(secondPage.page.map((item) => item.templateName)).toEqual([
  'campaign-1', 'campaign-0',
]);
expect(secondPage.isDone).toBe(true);
expect(new Set([...firstPage.page, ...secondPage.page].map((item) => item._id)).size).toBe(12);
});
```

- [ ] **Step 3: Run the two tests and verify the contract fails before implementation**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/personalWorkspace.test.ts convex/whatsappBroadcastPagination.test.ts
```

Expected: FAIL because `listSchedulesForAgent` rejects `paginationOpts` and still returns an array.

- [ ] **Step 4: Implement the paginated query**

```ts
import { paginationOptsValidator } from 'convex/server';

export const listSchedulesForAgent = query({
  args: {
    agentId: v.id('agents'),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const { orgId, userId } = await getAuthContext(ctx);
    await assertAgentInOrg(ctx, args.agentId, orgId, userId);

    return await ctx.db
      .query('whatsappBroadcastSchedules')
      .withIndex('by_agentId_and_scheduledAt', (q) => q.eq('agentId', args.agentId))
      .order('desc')
      .paginate(args.paginationOpts);
  },
});
```

- [ ] **Step 5: Run the focused Convex tests and verify they pass**

Run the Step 3 command.

Expected: 2 test files pass; the first page contains 10 newest records and the cursor returns the final two without overlap.

- [ ] **Step 6: Commit the backend contract**

```bash
git add convex/whatsappBroadcast.ts convex/personalWorkspace.test.ts convex/whatsappBroadcastPagination.test.ts
git commit -m "Paginate broadcast schedule history"
```

### Task 2: Build the pure Broadcast History pagination model

**Files:**
- Create: `src/components/broadcast/broadcastHistoryPagination.ts`
- Create: `src/components/broadcast/broadcastHistoryPagination.test.ts`

**Interfaces:**
- Consumes: accumulated result count, requested page, and the four standard `usePaginatedQuery` statuses.
- Produces: `getBroadcastHistoryPagination(input)` with safe page indices, bounded page links, loading state, and forward-navigation state.

- [ ] **Step 1: Write failing table-driven tests**

```ts
import { expect, test } from 'vitest';
import {
  BROADCAST_HISTORY_PAGE_SIZE,
  getBroadcastHistoryPagination,
} from './broadcastHistoryPagination';

test('uses 10 schedules per history page', () => {
  expect(BROADCAST_HISTORY_PAGE_SIZE).toBe(10);
});

test.each([
  [0, 1, 'LoadingFirstPage', 1, 1, 0, 0, [], false],
  [10, 1, 'CanLoadMore', 1, 2, 0, 10, [1, 2], true],
  [20, 2, 'CanLoadMore', 2, 3, 10, 20, [1, 2, 3], true],
  [12, 2, 'Exhausted', 2, 2, 10, 12, [1, 2], false],
  [10, 3, 'LoadingMore', 1, 2, 0, 10, [1, 2], false],
] as const)(
  'models %s loaded rows on requested page %s with %s',
  (rowCount, requestedPage, status, currentPage, totalPages, startIndex, endIndex, pages, canAdvance) => {
    expect(getBroadcastHistoryPagination({ rowCount, requestedPage, status })).toMatchObject({
      currentPage,
      totalPages,
      startIndex,
      endIndex,
      pages,
      canAdvance,
    });
  },
);
```

- [ ] **Step 2: Run the model test and verify it fails**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/broadcast/broadcastHistoryPagination.test.ts
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the model**

```ts
export const BROADCAST_HISTORY_PAGE_SIZE = 10;

export type BroadcastHistoryQueryStatus =
  | 'LoadingFirstPage'
  | 'CanLoadMore'
  | 'LoadingMore'
  | 'Exhausted';

export type BroadcastHistoryPage = number | 'ellipsis';

function pageNumbers(currentPage: number, totalPages: number): BroadcastHistoryPage[] {
  if (totalPages <= 4) return Array.from({ length: totalPages }, (_, index) => index + 1);
  if (currentPage <= 2) return [1, 2, 3, 'ellipsis', totalPages];
  if (currentPage >= totalPages - 1) {
    return [1, 'ellipsis', totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, 'ellipsis', currentPage, 'ellipsis', totalPages];
}

export function getBroadcastHistoryPagination({
  rowCount,
  requestedPage,
  status,
}: {
  rowCount: number;
  requestedPage: number;
  status: BroadcastHistoryQueryStatus;
}) {
  const loadedPageCount = Math.max(1, Math.ceil(rowCount / BROADCAST_HISTORY_PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, requestedPage), loadedPageCount);
  const hasUnloadedPage = status === 'CanLoadMore' || status === 'LoadingMore';
  const totalPages = loadedPageCount + (hasUnloadedPage ? 1 : 0);
  const startIndex = rowCount === 0 ? 0 : (currentPage - 1) * BROADCAST_HISTORY_PAGE_SIZE;
  const endIndex = Math.min(startIndex + BROADCAST_HISTORY_PAGE_SIZE, rowCount);

  return {
    currentPage,
    loadedPageCount,
    totalPages,
    startIndex,
    endIndex,
    pages: rowCount === 0 ? [] : pageNumbers(currentPage, totalPages),
    hasPreviousPage: currentPage > 1,
    canAdvance: status !== 'LoadingMore'
      && (currentPage < loadedPageCount || status === 'CanLoadMore'),
    loadingMore: status === 'LoadingMore',
  };
}
```

- [ ] **Step 4: Run the model test and verify it passes**

Run the Step 2 command.

Expected: all pagination-model cases pass.

- [ ] **Step 5: Commit the pure model**

```bash
git add src/components/broadcast/broadcastHistoryPagination.ts src/components/broadcast/broadcastHistoryPagination.test.ts
git commit -m "Model broadcast history pagination"
```

### Task 3: Extract and render the paginated shadcn history table

**Files:**
- Create: `src/components/broadcast/BroadcastHistoryTable.tsx`
- Create: `src/components/broadcast/BroadcastHistoryTable.test.ts`
- Modify: `src/pages/BroadcastPage.tsx:1-376`

**Interfaces:**
- Consumes: `Doc<'whatsappBroadcastSchedules'>[]`, query status, `loadMore`, `agentId`, permission state, deleting IDs, and delete-request callback.
- Produces: `<BroadcastHistoryTable>` using shared Table/Pagination components and no native table markup.

- [ ] **Step 1: Write a failing structure and contract test**

```ts
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

test('uses a Convex-paginated shadcn Broadcast History table', () => {
  const page = source('../../pages/BroadcastPage.tsx');
  const table = source('./BroadcastHistoryTable.tsx');
  expect(page).toContain("usePaginatedQuery(");
  expect(page).toContain("from 'convex/react'");
  expect(page).toContain('{ initialNumItems: BROADCAST_HISTORY_PAGE_SIZE }');
  expect(page).toContain('<BroadcastHistoryTable');
  expect(page).not.toContain('<table');
  expect(table).toContain("from '@/components/ui/table'");
  expect(table).toContain("from '@/components/ui/pagination'");
  expect(table).toContain('<Table>');
  expect(table).toContain('<TableHeader');
  expect(table).toContain('<TableBody>');
  expect(table).toContain('<PaginationPrevious');
  expect(table).toContain('<PaginationLink');
  expect(table).toContain('<PaginationEllipsis');
  expect(table).toContain('<PaginationNext');
  expect(table).toContain('void loadMore(BROADCAST_HISTORY_PAGE_SIZE)');
});
```

- [ ] **Step 2: Run the component test and verify it fails**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/broadcast/BroadcastHistoryTable.test.ts
```

Expected: FAIL because `BroadcastHistoryTable.tsx` does not exist and the route still uses `useQuery` plus a native table.

- [ ] **Step 3: Create `BroadcastHistoryTable` with the existing seven columns and row behavior**

Use `useState(1)` for `requestedPage`, call `getBroadcastHistoryPagination`, and slice `schedules` with its indices. The page-change handler must be:

```ts
const handlePageChange = (page: number) => {
  if (page < 1 || page > pagination.totalPages || pagination.loadingMore) return;
  if (page > pagination.loadedPageCount) {
    if (status !== 'CanLoadMore') return;
    void loadMore(BROADCAST_HISTORY_PAGE_SIZE);
  }
  setRequestedPage(page);
};
```

Render initial loading when `status === 'LoadingFirstPage'`, the existing empty copy when exhausted with no rows, and the existing campaign fields for each sliced schedule. Keep `event.stopPropagation()` on the Action cell and call `onDeleteRequest({ id: schedule._id, isPending: schedule.status === 'pending' })` from the destructive menu item. Render the Pagination only when schedules exist; disable all links while loading more, and disable Next when `pagination.canAdvance` is false.

- [ ] **Step 4: Integrate `usePaginatedQuery` in `BroadcastPage`**

```ts
import { useMutation, usePaginatedQuery } from 'convex/react';
import type { Id } from '../../convex/_generated/dataModel';
import { BROADCAST_HISTORY_PAGE_SIZE } from '@/components/broadcast/broadcastHistoryPagination';
import { BroadcastHistoryTable } from '@/components/broadcast/BroadcastHistoryTable';

const { results: schedules, status, loadMore } = usePaginatedQuery(
  api.whatsappBroadcast.listSchedulesForAgent,
  { agentId: agentId as Id<'agents'> },
  { initialNumItems: BROADCAST_HISTORY_PAGE_SIZE },
);
```

Replace the native history section with:

```tsx
<BroadcastHistoryTable
  agentId={agentId as Id<'agents'>}
  schedules={schedules}
  status={status}
  loadMore={loadMore}
  canManage={canManage}
  deletingIds={deletingIds}
  onDeleteRequest={(schedule) => {
    setTargetSchedule(schedule);
    setConfirmDialogOpen(true);
  }}
/>
```

- [ ] **Step 5: Run focused frontend and Convex tests**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/broadcast/BroadcastHistoryTable.test.ts src/components/broadcast/broadcastHistoryPagination.test.ts convex/personalWorkspace.test.ts convex/whatsappBroadcastPagination.test.ts
```

Expected: all focused tests pass.

- [ ] **Step 6: Commit the table integration**

```bash
git add src/pages/BroadcastPage.tsx src/components/broadcast/BroadcastHistoryTable.tsx src/components/broadcast/BroadcastHistoryTable.test.ts
git commit -m "Use paginated table for broadcast history"
```

### Task 4: Modularize the remaining oversized Broadcast page

**Files:**
- Create: `src/components/broadcast/BroadcastGuideCard.tsx`
- Create: `src/components/broadcast/BroadcastCostCalculatorDialog.tsx`
- Modify: `src/pages/BroadcastPage.tsx`
- Create: `src/pages/BroadcastPageStructure.test.ts`

**Interfaces:**
- Consumes: existing guide metadata, calculator open state, `agentId`, and `canManage`.
- Produces: a route component below 300 lines without changing presentation or behavior.

- [ ] **Step 1: Write a failing modularity test**

```ts
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const pageUrl = new URL('./BroadcastPage.tsx', import.meta.url);
const page = readFileSync(pageUrl, 'utf8');

test('keeps Broadcast page modular after history pagination', () => {
  expect(page.split('\n').length).toBeLessThanOrEqual(300);
  expect(page).toContain('<BroadcastGuideCard');
  expect(page).toContain('<BroadcastCostCalculatorDialog');
  expect(page).toContain('<BroadcastHistoryTable');
  expect(page).not.toContain('function BookCard');
  expect(page).not.toContain('<Slider');
});
```

- [ ] **Step 2: Run the modularity test and verify it fails**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/BroadcastPageStructure.test.ts
```

Expected: FAIL because the route is over 300 lines and still owns the guide-card and calculator markup.

- [ ] **Step 3: Extract `BroadcastGuideCard`**

Move the existing `BookCardProps`, front-cover markup, link behavior, disabled behavior, and dark variant into `BroadcastGuideCard.tsx`. Export it as `BroadcastGuideCard` and replace all three route usages. Remove comments while preserving the existing classes, image, tag, title, hover animation, and optional `to` behavior.

- [ ] **Step 4: Extract `BroadcastCostCalculatorDialog`**

Move `MARKETING_RATE_MYR`, `CUSTOMER_STEPS`, slider index state, price calculation, and the entire existing calculator dialog into a component with this interface:

```ts
export function BroadcastCostCalculatorDialog({
  open,
  onOpenChange,
  agentId,
  canManage,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: Id<'agents'>;
  canManage: boolean;
})
```

The route replacement is:

```tsx
<BroadcastCostCalculatorDialog
  open={isCalculatorOpen}
  onOpenChange={setIsCalculatorOpen}
  agentId={agentId as Id<'agents'>}
  canManage={canManage}
/>
```

- [ ] **Step 5: Remove obsolete route imports, constants, helpers, comments, and blank lines**

Keep the confirmation dialog and delete mutation orchestration in `BroadcastPage`. Confirm the page and each extracted component are at most 300 lines.

- [ ] **Step 6: Run structure and focused behavior tests**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/BroadcastPageStructure.test.ts src/components/broadcast/BroadcastHistoryTable.test.ts src/components/broadcast/broadcastHistoryPagination.test.ts src/indexScrollLock.test.ts
```

Expected: all tests pass, including the existing Broadcast scrollbar contract.

- [ ] **Step 7: Commit the modular extraction**

```bash
git add src/pages/BroadcastPage.tsx src/pages/BroadcastPageStructure.test.ts src/components/broadcast/BroadcastGuideCard.tsx src/components/broadcast/BroadcastCostCalculatorDialog.tsx
git commit -m "Modularize broadcast page presentation"
```

### Task 5: Verify the complete change

**Files:**
- Verify only; update implementation files only if verification exposes a defect.

**Interfaces:**
- Consumes: all prior task outputs.
- Produces: verified build and test evidence without unrelated workspace mutations.

- [ ] **Step 1: Run all focused tests**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/personalWorkspace.test.ts convex/whatsappBroadcastPagination.test.ts src/components/broadcast/BroadcastHistoryTable.test.ts src/components/broadcast/broadcastHistoryPagination.test.ts src/pages/BroadcastPageStructure.test.ts src/indexScrollLock.test.ts
```

Expected: all focused files pass.

- [ ] **Step 2: Run targeted ESLint**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint convex/whatsappBroadcast.ts convex/personalWorkspace.test.ts convex/whatsappBroadcastPagination.test.ts src/pages/BroadcastPage.tsx src/pages/BroadcastPageStructure.test.ts src/components/broadcast/BroadcastHistoryTable.tsx src/components/broadcast/BroadcastHistoryTable.test.ts src/components/broadcast/broadcastHistoryPagination.ts src/components/broadcast/broadcastHistoryPagination.test.ts src/components/broadcast/BroadcastGuideCard.tsx src/components/broadcast/BroadcastCostCalculatorDialog.tsx
```

Expected: exit code 0.

- [ ] **Step 3: Run the production build**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bun run build
```

Expected: TypeScript and Vite build succeed; the existing chunk-size warning is acceptable.

- [ ] **Step 4: Run the complete test suite**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run
```

Expected: every test file passes.

- [ ] **Step 5: Check formatting, line limits, and final scope**

```bash
git diff --check
wc -l convex/whatsappBroadcastPagination.test.ts src/pages/BroadcastPage.tsx src/components/broadcast/BroadcastHistoryTable.tsx src/components/broadcast/broadcastHistoryPagination.ts src/components/broadcast/BroadcastGuideCard.tsx src/components/broadcast/BroadcastCostCalculatorDialog.tsx
git status --short
```

Expected: no whitespace errors; every code file is at most 300 lines; only intended Broadcast History files plus pre-existing unrelated changes are present.

- [ ] **Step 6: Commit any verification-only corrections**

If and only if verification required corrections:

Stage only corrected paths from this plan, using this explicit allowlist:

```bash
git add convex/whatsappBroadcast.ts convex/personalWorkspace.test.ts convex/whatsappBroadcastPagination.test.ts src/pages/BroadcastPage.tsx src/pages/BroadcastPageStructure.test.ts src/components/broadcast/BroadcastHistoryTable.tsx src/components/broadcast/BroadcastHistoryTable.test.ts src/components/broadcast/broadcastHistoryPagination.ts src/components/broadcast/broadcastHistoryPagination.test.ts src/components/broadcast/BroadcastGuideCard.tsx src/components/broadcast/BroadcastCostCalculatorDialog.tsx
git commit -m "Verify broadcast history pagination"
```
