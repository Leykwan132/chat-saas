export const BROADCAST_HISTORY_PAGE_SIZE = 10;

export type BroadcastHistoryQueryStatus =
  | 'LoadingFirstPage'
  | 'CanLoadMore'
  | 'LoadingMore'
  | 'Exhausted';

export type BroadcastHistoryPage = number | 'ellipsis';

function pageNumbers(
  currentPage: number,
  totalPages: number,
): BroadcastHistoryPage[] {
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

export function getBroadcastHistoryPagination({
  rowCount,
  requestedPage,
  status,
}: {
  rowCount: number;
  requestedPage: number;
  status: BroadcastHistoryQueryStatus;
}) {
  const loadedPageCount = Math.max(
    1,
    Math.ceil(rowCount / BROADCAST_HISTORY_PAGE_SIZE),
  );
  const currentPage = Math.min(
    Math.max(1, requestedPage),
    loadedPageCount,
  );
  const hasUnloadedPage =
    status === 'CanLoadMore' || status === 'LoadingMore';
  const totalPages = loadedPageCount + (hasUnloadedPage ? 1 : 0);
  const startIndex =
    rowCount === 0
      ? 0
      : (currentPage - 1) * BROADCAST_HISTORY_PAGE_SIZE;
  const endIndex = Math.min(
    startIndex + BROADCAST_HISTORY_PAGE_SIZE,
    rowCount,
  );

  return {
    currentPage,
    loadedPageCount,
    totalPages,
    startIndex,
    endIndex,
    pages: rowCount === 0 ? [] : pageNumbers(currentPage, totalPages),
    hasPreviousPage: currentPage > 1,
    canAdvance:
      status !== 'LoadingMore' &&
      (currentPage < loadedPageCount || status === 'CanLoadMore'),
    loadingMore: status === 'LoadingMore',
  };
}
