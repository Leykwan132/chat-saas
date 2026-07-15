import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { cn } from '@/lib/utils';
import { getWorkflowAutomationHistoryPageNumbers } from './workflowAutomationHistoryPagination';

export function WorkflowAutomationHistoryPager({
  currentPage,
  totalPages,
  hasNextPage,
  loading,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  loading: boolean;
  onPageChange: (page: number) => void;
}) {
  const pages = getWorkflowAutomationHistoryPageNumbers({ currentPage, totalPages });
  return (
    <Pagination className="mx-0 w-auto justify-end">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            aria-disabled={currentPage === 1 || loading}
            className={cn((currentPage === 1 || loading) && 'pointer-events-none opacity-50')}
            onClick={(event) => {
              event.preventDefault();
              onPageChange(currentPage - 1);
            }}
          />
        </PaginationItem>
        {pages.map((page, index) => page === 'ellipsis' ? (
          <PaginationItem key={`ellipsis-${index}`}>
            <PaginationEllipsis />
          </PaginationItem>
        ) : (
          <PaginationItem key={page}>
            <PaginationLink
              href="#"
              isActive={page === currentPage}
              aria-disabled={loading}
              className={cn(loading && 'pointer-events-none opacity-50')}
              onClick={(event) => {
                event.preventDefault();
                onPageChange(page);
              }}
            >
              {page}
            </PaginationLink>
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext
            href="#"
            aria-disabled={!hasNextPage || loading}
            className={cn((!hasNextPage || loading) && 'pointer-events-none opacity-50')}
            onClick={(event) => {
              event.preventDefault();
              onPageChange(currentPage + 1);
            }}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
