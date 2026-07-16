# Broadcast Recipient Table Pagination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Broadcast detail recipient list with the shared shadcn Table and fixed 10-row numbered pagination while preserving all-recipient totals.

**Architecture:** Keep the existing bounded Convex recipient query and paginate its reactive result in the browser. Isolate pure page calculations, the recipients table, and the existing overview so the route page remains an orchestration component and every touched code file is below 300 lines.

**Tech Stack:** React 19, TypeScript, Convex React, shadcn Table and Pagination, Tailwind CSS, Vitest.

## Global Constraints

- Use Node v22 for every script and test command.
- Keep every code file below 300 lines.
- Do not add comments to code.
- Use a fixed page size of exactly 10 recipients.
- Keep footer count and estimated cost based on all recipients.
- Do not change Convex schema, queries, indexes, or generated APIs.
- Preserve the current columns, status pills, empty state, ordering, and responsive horizontal overflow.

---

### Task 1: Pure recipient pagination model

**Files:**
- Create: `src/components/broadcast/broadcastRecipientPagination.ts`
- Test: `src/components/broadcast/broadcastRecipientPagination.test.ts`

**Interfaces:**
- Produces: `BROADCAST_RECIPIENT_PAGE_SIZE`, `BroadcastRecipientPage`, `getBroadcastRecipientPagination({ rowCount, currentPage })`.
- Returns: `{ currentPage, totalPages, startIndex, endIndex, pages, hasPreviousPage, hasNextPage }`.

- [x] **Step 1: Write the failing pagination tests**

```ts
import { expect, test } from 'vitest';
import {
  BROADCAST_RECIPIENT_PAGE_SIZE,
  getBroadcastRecipientPagination,
} from './broadcastRecipientPagination';

test('uses a fixed page size of 10 recipients', () => {
  expect(BROADCAST_RECIPIENT_PAGE_SIZE).toBe(10);
});

test.each([
  [0, 1, 1, 0, 0, [], false, false],
  [10, 1, 1, 0, 10, [1], false, false],
  [11, 2, 2, 10, 11, [1, 2], true, false],
  [50, 3, 3, 20, 30, [1, 'ellipsis', 3, 'ellipsis', 5], true, true],
  [20, 8, 2, 10, 20, [1, 2], true, false],
] as const)(
  'builds page %s for %s rows',
  (rowCount, currentPage, expectedPage, startIndex, endIndex, pages, hasPreviousPage, hasNextPage) => {
    expect(getBroadcastRecipientPagination({ rowCount, currentPage })).toEqual({
      currentPage: expectedPage,
      totalPages: Math.max(1, Math.ceil(rowCount / 10)),
      startIndex,
      endIndex,
      pages,
      hasPreviousPage,
      hasNextPage,
    });
  },
);
```

- [x] **Step 2: Run the focused test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/broadcast/broadcastRecipientPagination.test.ts
```

Expected: FAIL because `broadcastRecipientPagination.ts` does not exist.

- [x] **Step 3: Implement the minimal pure model**

```ts
export const BROADCAST_RECIPIENT_PAGE_SIZE = 10;

export type BroadcastRecipientPage = number | 'ellipsis';

function getPageNumbers(currentPage: number, totalPages: number): BroadcastRecipientPage[] {
  if (totalPages <= 4) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  if (currentPage <= 2) {
    return [1, 2, 3, 'ellipsis', totalPages];
  }
  if (currentPage >= totalPages - 1) {
    return [1, 'ellipsis', totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, 'ellipsis', currentPage, 'ellipsis', totalPages];
}

export function getBroadcastRecipientPagination({
  rowCount,
  currentPage,
}: {
  rowCount: number;
  currentPage: number;
}) {
  const totalPages = Math.max(1, Math.ceil(rowCount / BROADCAST_RECIPIENT_PAGE_SIZE));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = rowCount === 0 ? 0 : (safeCurrentPage - 1) * BROADCAST_RECIPIENT_PAGE_SIZE;
  const endIndex = Math.min(startIndex + BROADCAST_RECIPIENT_PAGE_SIZE, rowCount);

  return {
    currentPage: safeCurrentPage,
    totalPages,
    startIndex,
    endIndex,
    pages: rowCount === 0 ? [] : getPageNumbers(safeCurrentPage, totalPages),
    hasPreviousPage: safeCurrentPage > 1,
    hasNextPage: safeCurrentPage < totalPages,
  };
}
```

- [x] **Step 4: Run the focused test and verify GREEN**

Run the Step 2 command. Expected: all five cases PASS.

---

### Task 2: Shadcn recipients table and pager

**Files:**
- Create: `src/components/broadcast/BroadcastRecipientsTable.tsx`
- Test: `src/components/broadcast/BroadcastRecipientsTable.test.ts`
- Uses: `src/components/ui/table.tsx`, `src/components/ui/pagination.tsx`

**Interfaces:**
- Consumes: `getBroadcastRecipientPagination` from Task 1.
- Produces: `BroadcastRecipientRow` and `BroadcastRecipientsTable({ rows, totalCostMyr })`.

```ts
export type BroadcastRecipientRow = {
  phone: string;
  name?: string;
  sentAt: number;
  deliveryLabel: string;
  estCostMyr: number;
};
```

- [x] **Step 1: Write the failing component contract test**

```ts
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const source = readFileSync(
  new URL('./BroadcastRecipientsTable.tsx', import.meta.url),
  'utf8',
);

test('uses shared shadcn table and pagination composition', () => {
  for (const component of [
    'Table',
    'TableHeader',
    'TableBody',
    'TableFooter',
    'TableRow',
    'TableHead',
    'TableCell',
    'Pagination',
    'PaginationPrevious',
    'PaginationNext',
    'PaginationLink',
    'PaginationEllipsis',
  ]) {
    expect(source).toContain(`<${component}`);
  }
  expect(source).not.toContain('<table');
});

test('slices visible recipients without changing all-recipient totals', () => {
  expect(source).toContain('rows.slice(startIndex, endIndex)');
  expect(source).toContain('Total ({rows.length} recipients)');
  expect(source).toContain('RM {totalCostMyr.toFixed(2)}');
});
```

- [x] **Step 2: Run the focused component test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/broadcast/BroadcastRecipientsTable.test.ts
```

Expected: FAIL because `BroadcastRecipientsTable.tsx` does not exist.

- [x] **Step 3: Implement the table component**

Create a component that:

```tsx
const [requestedPage, setRequestedPage] = useState(1);
const {
  currentPage,
  totalPages,
  startIndex,
  endIndex,
  pages,
  hasPreviousPage,
  hasNextPage,
} = getBroadcastRecipientPagination({ rowCount: rows.length, currentPage: requestedPage });
const visibleRows = rows.slice(startIndex, endIndex);
```

Render the columns through the exact shared primitives below:

```tsx
<Table>
  <TableHeader className="bg-muted/30">
    <TableRow>
      <TableHead className="px-5 py-3.5 text-muted-foreground">Recipient</TableHead>
      <TableHead className="px-5 py-3.5 text-muted-foreground">Date &amp; time</TableHead>
      <TableHead className="px-5 py-3.5 text-muted-foreground">Status</TableHead>
      <TableHead className="px-5 py-3.5 text-right text-muted-foreground">Est. cost</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {rows.length === 0 ? (
      <TableRow>
        <TableCell colSpan={4} className="px-5 py-8 text-center text-muted-foreground">
          No recipients for this broadcast.
        </TableCell>
      </TableRow>
    ) : visibleRows.map((row) => {
      const dateLabel = new Date(row.sentAt).toLocaleString([], {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
      const statusStyle = recipientStatusBadgeClass(row.deliveryLabel);
      return (
        <TableRow key={row.phone} className="hover:bg-muted/20">
          <TableCell className="px-5 py-3.5">
            <div className="font-medium text-foreground">{row.name ?? row.phone}</div>
            {row.name ? (
              <div className="mt-0.5 font-mono text-xs text-muted-foreground">{row.phone}</div>
            ) : null}
          </TableCell>
          <TableCell className="px-5 py-3.5 text-foreground tabular-nums">{dateLabel}</TableCell>
          <TableCell className="px-5 py-3.5">
            <span className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
              statusStyle.badge,
            )}>
              <span className={cn('size-1.5 rounded-full', statusStyle.dot)} />
              {row.deliveryLabel}
            </span>
          </TableCell>
          <TableCell className="px-5 py-3.5 text-right font-medium tabular-nums text-foreground">
            RM {row.estCostMyr.toFixed(2)}
          </TableCell>
        </TableRow>
      );
    })
  </TableBody>
  {rows.length > 0 ? (
    <TableFooter className="bg-muted/20">
      <TableRow>
        <TableCell colSpan={3} className="px-5 py-3 text-right font-semibold text-muted-foreground">
          Total ({rows.length} recipients)
        </TableCell>
        <TableCell className="px-5 py-3 text-right font-semibold tabular-nums text-foreground">
          RM {totalCostMyr.toFixed(2)}
        </TableCell>
      </TableRow>
    </TableFooter>
  ) : null}
</Table>
```

Move `recipientStatusBadgeClass` unchanged into this component. Format `sentAt` with the existing `dateStyle: 'medium'` and `timeStyle: 'short'`. Render pagination only when `totalPages > 1`; use `aria-disabled` plus `pointer-events-none opacity-50` on unavailable Previous and Next links, prevent default anchor navigation, and set requested page from each numbered link.

- [x] **Step 4: Run both focused tests and verify GREEN**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/broadcast/broadcastRecipientPagination.test.ts src/components/broadcast/BroadcastRecipientsTable.test.ts
```

Expected: both test files PASS.

---

### Task 3: Extract overview and integrate the route page

**Files:**
- Create: `src/components/broadcast/BroadcastDetailOverview.tsx`
- Modify: `src/pages/BroadcastDetailPage.tsx`
- Test: `src/pages/BroadcastDetailPageStructure.test.ts`

**Interfaces:**
- Produces: `BroadcastDetailOverview` with primitive display props and a `preview: ReactNode` slot.
- Consumes: `BroadcastDetailOverview` and `BroadcastRecipientsTable` from the route page.

```ts
type BroadcastDetailOverviewProps = {
  totalRecipients: number;
  sentCount?: number;
  deliveredPercent?: number;
  costRm: number;
  channelLabel: string;
  templateName: string;
  templateLanguage: string;
  scheduledLabel: string;
  deliverySummary: string;
  status: string;
  errorMessage?: string;
  preview: ReactNode;
};
```

- [x] **Step 1: Write the failing route-structure test**

```ts
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const pageSource = readFileSync(new URL('./BroadcastDetailPage.tsx', import.meta.url), 'utf8');

test('delegates overview and recipients rendering to focused components', () => {
  expect(pageSource).toContain('<BroadcastDetailOverview');
  expect(pageSource).toContain('<BroadcastRecipientsTable');
  expect(pageSource).not.toContain('<table');
});

test('keeps the route page below the code file limit', () => {
  expect(pageSource.trimEnd().split('\n').length).toBeLessThanOrEqual(300);
});
```

- [x] **Step 2: Run the route-structure test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/BroadcastDetailPageStructure.test.ts
```

Expected: FAIL because the page still contains the native table and exceeds 300 lines.

- [x] **Step 3: Move the existing overview JSX without behavior changes**

Move the current overview markup from `src/pages/BroadcastDetailPage.tsx:283-384` into `BroadcastDetailOverview.tsx`, replace its schedule/channel reads with the explicit props above, retain the exact Tailwind classes and copy, and remove the existing JSX comments. The dynamic expressions must be:

```tsx
{sentCount !== undefined ? sentCount.toLocaleString() : totalRecipients.toLocaleString()}
{deliveredPercent !== undefined ? `${deliveredPercent}%` : '—'}
RM {costRm.toFixed(2)}
{channelLabel}
{templateName}
({templateLanguage})
{scheduledLabel}
{deliverySummary}
{status}
{errorMessage}
{preview}
```

- [x] **Step 4: Replace inline sections in `BroadcastDetailPage.tsx`**

Remove `Separator`, `Label`, `SiWhatsapp`, and `cn` imports plus `recipientStatusBadgeClass`. Add imports for the two focused components. Replace the overview block with:

```tsx
<BroadcastDetailOverview
  totalRecipients={totalRecipients}
  sentCount={sentCount}
  deliveredPercent={
    schedule.status === 'completed' && totalRecipients > 0
      ? Math.round(((schedule.okCount ?? 0) / totalRecipients) * 100)
      : undefined
  }
  costRm={costRm}
  channelLabel={channel ? channelLabel(channel) : '—'}
  templateName={schedule.templateName}
  templateLanguage={schedule.templateLanguage}
  scheduledLabel={scheduledLabel}
  deliverySummary={
    schedule.status === 'completed'
      ? `${schedule.okCount ?? 0} sent · ${schedule.failCount ?? 0} failed`
      : `${totalRecipients} planned`
  }
  status={schedule.status}
  errorMessage={schedule.errorMessage}
  preview={whatsAppPreview}
/>
```

Replace the recipients block with:

```tsx
<BroadcastRecipientsTable rows={recipientRows ?? []} totalCostMyr={costRm} />
```

- [x] **Step 5: Run focused tests and verify GREEN**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/broadcast/broadcastRecipientPagination.test.ts src/components/broadcast/BroadcastRecipientsTable.test.ts src/pages/BroadcastDetailPageStructure.test.ts
```

Expected: all focused tests PASS.

---

### Task 4: Verification and handoff

**Files:**
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: all completed implementation tasks.
- Produces: verified code and compaction-safe receipts.

- [x] **Step 1: Run targeted lint**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/pages/BroadcastDetailPage.tsx src/pages/BroadcastDetailPageStructure.test.ts src/components/broadcast/BroadcastDetailOverview.tsx src/components/broadcast/BroadcastRecipientsTable.tsx src/components/broadcast/BroadcastRecipientsTable.test.ts src/components/broadcast/broadcastRecipientPagination.ts src/components/broadcast/broadcastRecipientPagination.test.ts
```

Expected: exit code 0 with no errors.

- [x] **Step 2: Run the production build**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bun run build
```

Expected: TypeScript and Vite build exit code 0.

- [x] **Step 3: Run repository checks**

```bash
git diff --check
wc -l src/pages/BroadcastDetailPage.tsx src/components/broadcast/BroadcastDetailOverview.tsx src/components/broadcast/BroadcastRecipientsTable.tsx src/components/broadcast/broadcastRecipientPagination.ts
```

Expected: no whitespace errors and every listed code file is at most 300 lines.

- [x] **Step 4: Update continuity facts and receipts**

Record the completed behavior, touched files, focused test count, lint result, build result, diff check, and line-count result with dated provenance tags while keeping the ledger within its section caps.
