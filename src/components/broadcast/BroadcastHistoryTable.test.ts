import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

test('uses a Convex-paginated shadcn Broadcast History table', () => {
  const page = source('../../pages/BroadcastPage.tsx');
  const table = source('./BroadcastHistoryTable.tsx');
  expect(page).toContain('usePaginatedQuery(');
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
