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
  'builds a safe page for %s rows from requested page %s',
  (
    rowCount,
    currentPage,
    expectedPage,
    startIndex,
    endIndex,
    pages,
    hasPreviousPage,
    hasNextPage,
  ) => {
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
