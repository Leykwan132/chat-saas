import { useState } from 'react';
import { useNavigate } from 'react-router';
import type { Doc, Id } from '../../../convex/_generated/dataModel';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  BROADCAST_HISTORY_PAGE_SIZE,
  getBroadcastHistoryPagination,
  type BroadcastHistoryQueryStatus,
} from './broadcastHistoryPagination';
import { BroadcastHistoryRow } from './BroadcastHistoryRow';

type BroadcastSchedule = Doc<'whatsappBroadcastSchedules'>;

export function BroadcastHistoryTable({
  agentId,
  schedules,
  status,
  loadMore,
  canManage,
  deletingIds,
  onDeleteRequest,
}: {
  agentId: Id<'agents'>;
  schedules: BroadcastSchedule[];
  status: BroadcastHistoryQueryStatus;
  loadMore: (numItems: number) => void;
  canManage: boolean;
  deletingIds: Id<'whatsappBroadcastSchedules'>[];
  onDeleteRequest: (schedule: {
    id: Id<'whatsappBroadcastSchedules'>;
    isPending: boolean;
  }) => void;
}) {
  const navigate = useNavigate();
  const [requestedPage, setRequestedPage] = useState(1);
  const pagination = getBroadcastHistoryPagination({
    rowCount: schedules.length,
    requestedPage,
    status,
  });
  const visibleSchedules = schedules.slice(
    pagination.startIndex,
    pagination.endIndex,
  );

  const handlePageChange = (page: number) => {
    if (
      page < 1 ||
      page > pagination.totalPages ||
      pagination.loadingMore
    ) {
      return;
    }
    if (page > pagination.loadedPageCount) {
      if (status !== 'CanLoadMore') return;
      void loadMore(BROADCAST_HISTORY_PAGE_SIZE);
    }
    setRequestedPage(page);
  };

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Broadcast History
        </h2>
        <Separator className="mt-3" />
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="px-5 py-3.5 font-semibold text-muted-foreground">
                Campaign Name
              </TableHead>
              <TableHead className="px-5 py-3.5 text-center font-semibold text-muted-foreground">
                Scheduled Time
              </TableHead>
              <TableHead className="px-5 py-3.5 text-center font-semibold text-muted-foreground">
                Recipients
              </TableHead>
              <TableHead className="px-5 py-3.5 text-center font-semibold text-muted-foreground">
                Status
              </TableHead>
              <TableHead className="px-5 py-3.5 text-center font-semibold text-muted-foreground">
                Reply rate
              </TableHead>
              <TableHead className="px-5 py-3.5 text-center font-semibold text-muted-foreground">
                Est. Cost
              </TableHead>
              <TableHead className="px-5 py-3.5 text-center font-semibold text-muted-foreground">
                Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {status === 'LoadingFirstPage' ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="px-5 py-8 text-center text-muted-foreground"
                >
                  <span className="inline-flex items-center gap-2">
                    <Spinner />
                    Loading schedules...
                  </span>
                </TableCell>
              </TableRow>
            ) : schedules.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="px-5 py-8 text-center text-muted-foreground"
                >
                  No broadcast campaigns found.
                </TableCell>
              </TableRow>
            ) : (
              visibleSchedules.map((schedule) => (
                <BroadcastHistoryRow
                  key={schedule._id}
                  schedule={schedule}
                  canManage={canManage}
                  deleting={deletingIds.includes(schedule._id)}
                  onOpen={() =>
                    navigate(`/dashboard/${agentId}/broadcast/${schedule._id}`)
                  }
                  onDeleteRequest={onDeleteRequest}
                />
              ))
            )}
          </TableBody>
        </Table>
        {schedules.length > 0 ? (
          <div className="flex justify-end border-t border-border px-4 py-3">
            <Pagination className="mx-0 w-auto">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    aria-disabled={
                      !pagination.hasPreviousPage || pagination.loadingMore
                    }
                    className={cn(
                      (!pagination.hasPreviousPage || pagination.loadingMore) &&
                        'pointer-events-none opacity-50',
                    )}
                    onClick={(event) => {
                      event.preventDefault();
                      handlePageChange(pagination.currentPage - 1);
                    }}
                  />
                </PaginationItem>
                {pagination.pages.map((page, index) =>
                  page === 'ellipsis' ? (
                    <PaginationItem key={`ellipsis-${index}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={page}>
                      <PaginationLink
                        href="#"
                        isActive={page === pagination.currentPage}
                        aria-disabled={pagination.loadingMore}
                        className={cn(
                          pagination.loadingMore &&
                            'pointer-events-none opacity-50',
                        )}
                        onClick={(event) => {
                          event.preventDefault();
                          handlePageChange(page);
                        }}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ),
                )}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    aria-disabled={!pagination.canAdvance}
                    className={cn(
                      !pagination.canAdvance &&
                        'pointer-events-none opacity-50',
                    )}
                    onClick={(event) => {
                      event.preventDefault();
                      handlePageChange(pagination.currentPage + 1);
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        ) : null}
      </div>
    </section>
  );
}
