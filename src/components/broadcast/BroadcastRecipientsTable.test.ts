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
