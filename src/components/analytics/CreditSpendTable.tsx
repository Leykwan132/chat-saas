import { useEffect, useMemo, useState } from 'react';
import { usePaginatedQuery } from 'convex-helpers/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { AnalyticsDataTable } from '@/components/analytics/AnalyticsUi';
import { pricingSectionBorderClass, pricingTableShellClass } from '@/components/pricing/pricingStyles';
import { cn } from '@/lib/utils';
import type { CreditTimeRange } from '@/components/analytics/CreditUsagePanel';

const PAGE_SIZE = 50;
const TABLE_MIN_HEIGHT = 480;

function formatDateTime(ms: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(ms));
}

export function CreditSpendTable({
  agentId,
  timeRange,
}: {
  agentId: Id<'agents'>;
  timeRange: CreditTimeRange;
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const { results, status, loadMore } = usePaginatedQuery(
    api.creditUsageAnalytics.getAgentCreditSpendHistory,
    { agentId, timeRange },
    { initialNumItems: PAGE_SIZE },
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [agentId, timeRange]);

  const loadedPageCount = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const hasNextPage =
    status === 'CanLoadMore' || currentPage * PAGE_SIZE < results.length;
  const totalPages =
    status === 'CanLoadMore'
      ? Math.max(loadedPageCount, currentPage + 1)
      : loadedPageCount;

  const pageRows = useMemo(
    () => results.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [results, currentPage],
  );

  const handleNextPage = () => {
    if (!hasNextPage) {
      return;
    }

    const nextIndex = currentPage * PAGE_SIZE;
    if (nextIndex >= results.length && status === 'CanLoadMore') {
      void loadMore(PAGE_SIZE);
    }
    setCurrentPage((prev) => prev + 1);
  };

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const isLoadingFirstPage = status === 'LoadingFirstPage';
  const rangeStart = (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = rangeStart + pageRows.length - 1;
  const showRangeSummary = !isLoadingFirstPage && pageRows.length > 0;

  return (
    <Card className="overflow-hidden rounded-xl py-0 shadow-none ring-1 ring-border/70">
      <CardContent className="p-0">
        {isLoadingFirstPage ? (
          <div className="px-6 py-8 sm:px-8 sm:py-10">
            <Skeleton className="w-full rounded-xl" style={{ height: TABLE_MIN_HEIGHT }} />
          </div>
        ) : (
          <div
            className={cn(
              pricingTableShellClass,
              'min-h-[480px] rounded-none border-0 shadow-none ring-0 text-sm',
              '[&_th]:px-6 [&_th]:py-4 [&_td]:px-6 [&_td]:py-3.5 [&_td]:!text-sm',
            )}
            style={{ minHeight: TABLE_MIN_HEIGHT }}
          >
            <AnalyticsDataTable
              minWidth="640px"
              emptyMessage="No credit spend recorded for this range."
              defaultSort={{ key: 'date', direction: 'desc' }}
              rowKey={(entry) => entry.id}
              rows={pageRows}
              columns={[
                {
                  key: 'date',
                  header: 'Date',
                  sortValue: (entry) => entry.createdAt,
                  cell: (entry) => (
                    <span className="whitespace-nowrap text-muted-foreground">
                      {formatDateTime(entry.createdAt)}
                    </span>
                  ),
                },
                {
                  key: 'agent',
                  header: 'Agent',
                  sortValue: (entry) => entry.agentName.toLowerCase(),
                  cell: (entry) => (
                    <span className="font-medium">{entry.agentName}</span>
                  ),
                },
                {
                  key: 'model',
                  header: 'Model',
                  sortValue: (entry) => entry.modelLabel.toLowerCase(),
                  cell: (entry) => entry.modelLabel,
                },
                {
                  key: 'creditSpent',
                  header: 'Credit Spent',
                  align: 'right',
                  sortValue: (entry) => entry.credits,
                  cell: (entry) => (
                    <span className="tabular-nums">{entry.credits.toLocaleString()}</span>
                  ),
                },
              ]}
            />

            {results.length > 0 || status === 'CanLoadMore' ? (
              <div
                className={cn(
                  'flex flex-col gap-3 border-t px-6 py-5 sm:flex-row sm:items-center sm:justify-between',
                  pricingSectionBorderClass(),
                )}
              >
                <p className="text-sm text-muted-foreground">
                  {showRangeSummary
                    ? `Showing ${rangeStart.toLocaleString()}–${rangeEnd.toLocaleString()}`
                    : 'No entries on this page'}
                  {status === 'CanLoadMore' ? ' · more available' : null}
                </p>
                <Pagination className="mx-0 w-auto justify-end">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(event) => {
                          event.preventDefault();
                          if (currentPage > 1) {
                            handlePrevPage();
                          }
                        }}
                        className={cn(currentPage === 1 && 'pointer-events-none opacity-50')}
                      />
                    </PaginationItem>

                    {Array.from({ length: totalPages }).map((_, index) => {
                      const pageNumber = index + 1;
                      return (
                        <PaginationItem key={pageNumber}>
                          <PaginationLink
                            href="#"
                            onClick={(event) => {
                              event.preventDefault();
                              if (pageNumber > currentPage) {
                                const nextIndex = pageNumber * PAGE_SIZE;
                                if (
                                  nextIndex > results.length &&
                                  status === 'CanLoadMore'
                                ) {
                                  void loadMore(PAGE_SIZE);
                                }
                              }
                              setCurrentPage(pageNumber);
                            }}
                            isActive={currentPage === pageNumber}
                          >
                            {pageNumber}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}

                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(event) => {
                          event.preventDefault();
                          if (hasNextPage) {
                            handleNextPage();
                          }
                        }}
                        className={cn(!hasNextPage && 'pointer-events-none opacity-50')}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function CreditSpendTableSkeleton() {
  return (
    <Card className={cn('overflow-hidden rounded-xl py-0 shadow-none ring-1 ring-border/70')}>
      <CardContent className="px-6 py-8 sm:px-8 sm:py-10">
        <Skeleton className="w-full rounded-xl" style={{ height: TABLE_MIN_HEIGHT }} />
      </CardContent>
    </Card>
  );
}
