export type WorkflowAutomationHistoryPage = number | 'ellipsis';

export function getWorkflowAutomationHistoryPageNumbers({
  currentPage,
  totalPages,
}: {
  currentPage: number;
  totalPages: number;
}): WorkflowAutomationHistoryPage[] {
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
