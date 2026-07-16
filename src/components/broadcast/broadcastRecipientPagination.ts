export const BROADCAST_RECIPIENT_PAGE_SIZE = 10;

export type BroadcastRecipientPage = number | 'ellipsis';

function getPageNumbers(
  currentPage: number,
  totalPages: number,
): BroadcastRecipientPage[] {
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
  const totalPages = Math.max(
    1,
    Math.ceil(rowCount / BROADCAST_RECIPIENT_PAGE_SIZE),
  );
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex =
    rowCount === 0
      ? 0
      : (safeCurrentPage - 1) * BROADCAST_RECIPIENT_PAGE_SIZE;
  const endIndex = Math.min(
    startIndex + BROADCAST_RECIPIENT_PAGE_SIZE,
    rowCount,
  );

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
