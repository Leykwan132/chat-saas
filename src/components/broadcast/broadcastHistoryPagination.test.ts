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
  (
    rowCount,
    requestedPage,
    status,
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    pages,
    canAdvance,
  ) => {
    expect(
      getBroadcastHistoryPagination({ rowCount, requestedPage, status }),
    ).toMatchObject({
      currentPage,
      totalPages,
      startIndex,
      endIndex,
      pages,
      canAdvance,
    });
  },
);
