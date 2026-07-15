import { expect, test } from 'vitest';
import { getWorkflowAutomationHistoryPageNumbers } from './workflowAutomationHistoryPagination';

test.each([
  [1, 1, [1]],
  [2, 4, [1, 2, 3, 4]],
  [1, 8, [1, 2, 3, 'ellipsis', 8]],
  [4, 8, [1, 'ellipsis', 4, 'ellipsis', 8]],
  [7, 8, [1, 'ellipsis', 6, 7, 8]],
] as const)('returns bounded page links for page %s of %s', (currentPage, totalPages, expected) => {
  expect(getWorkflowAutomationHistoryPageNumbers({ currentPage, totalPages }))
    .toEqual(expected);
});
