import { useState } from 'react';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { getBroadcastRecipientPagination } from './broadcastRecipientPagination';

export type BroadcastRecipientRow = {
  phone: string;
  name?: string;
  sentAt: number;
  deliveryLabel: string;
  estCostMyr: number;
};

function recipientStatusBadgeClass(label: string): {
  badge: string;
  dot: string;
} {
  const neutralBadge =
    'border-neutral-200 bg-neutral-100/60 text-neutral-600 dark:border-neutral-800 dark:bg-neutral-800/40 dark:text-neutral-300 font-medium';

  if (label === 'Delivered') {
    return { badge: neutralBadge, dot: 'bg-emerald-500' };
  }
  if (label === 'Failed') {
    return { badge: neutralBadge, dot: 'bg-rose-500' };
  }
  if (label === 'Scheduled') {
    return { badge: neutralBadge, dot: 'bg-amber-500' };
  }
  if (label === 'Sending') {
    return { badge: neutralBadge, dot: 'bg-blue-500' };
  }
  if (label === 'Cancelled') {
    return { badge: neutralBadge, dot: 'bg-neutral-400' };
  }
  return { badge: neutralBadge, dot: 'bg-neutral-500' };
}

export function BroadcastRecipientsTable({
  rows,
  totalCostMyr,
}: {
  rows: BroadcastRecipientRow[];
  totalCostMyr: number;
}) {
  const [requestedPage, setRequestedPage] = useState(1);
  const {
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    pages,
    hasPreviousPage,
    hasNextPage,
  } = getBroadcastRecipientPagination({
    rowCount: rows.length,
    currentPage: requestedPage,
  });
  const visibleRows = rows.slice(startIndex, endIndex);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow>
            <TableHead className="px-5 py-3.5 font-semibold text-muted-foreground">
              Recipient
            </TableHead>
            <TableHead className="px-5 py-3.5 font-semibold text-muted-foreground">
              Date &amp; time
            </TableHead>
            <TableHead className="px-5 py-3.5 font-semibold text-muted-foreground">
              Status
            </TableHead>
            <TableHead className="px-5 py-3.5 text-right font-semibold text-muted-foreground">
              Est. cost
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={4}
                className="px-5 py-8 text-center text-muted-foreground"
              >
                No recipients for this broadcast.
              </TableCell>
            </TableRow>
          ) : (
            visibleRows.map((row) => {
              const dateLabel = new Date(row.sentAt).toLocaleString([], {
                dateStyle: 'medium',
                timeStyle: 'short',
              });
              const statusStyle = recipientStatusBadgeClass(row.deliveryLabel);

              return (
                <TableRow key={row.phone} className="hover:bg-muted/20">
                  <TableCell className="px-5 py-3.5">
                    <div className="font-medium text-foreground">
                      {row.name ?? row.phone}
                    </div>
                    {row.name ? (
                      <div className="mt-0.5 font-mono text-xs text-muted-foreground">
                        {row.phone}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell className="px-5 py-3.5 text-foreground tabular-nums">
                    {dateLabel}
                  </TableCell>
                  <TableCell className="px-5 py-3.5">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
                        statusStyle.badge,
                      )}
                    >
                      <span
                        className={cn('size-1.5 rounded-full', statusStyle.dot)}
                      />
                      {row.deliveryLabel}
                    </span>
                  </TableCell>
                  <TableCell className="px-5 py-3.5 text-right font-medium tabular-nums text-foreground">
                    RM {row.estCostMyr.toFixed(2)}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
        {rows.length > 0 ? (
          <TableFooter className="bg-muted/20">
            <TableRow>
              <TableCell
                colSpan={3}
                className="px-5 py-3 text-right font-semibold text-muted-foreground"
              >
                Total ({rows.length} recipients)
              </TableCell>
              <TableCell className="px-5 py-3 text-right font-semibold tabular-nums text-foreground">
                RM {totalCostMyr.toFixed(2)}
              </TableCell>
            </TableRow>
          </TableFooter>
        ) : null}
      </Table>

      {totalPages > 1 ? (
        <div className="flex justify-end border-t border-border px-4 py-3">
          <Pagination className="mx-0 w-auto">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  aria-disabled={!hasPreviousPage}
                  className={cn(
                    !hasPreviousPage && 'pointer-events-none opacity-50',
                  )}
                  onClick={(event) => {
                    event.preventDefault();
                    if (hasPreviousPage) setRequestedPage(currentPage - 1);
                  }}
                />
              </PaginationItem>
              {pages.map((page, index) =>
                page === 'ellipsis' ? (
                  <PaginationItem key={`ellipsis-${index}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={page}>
                    <PaginationLink
                      href="#"
                      isActive={page === currentPage}
                      onClick={(event) => {
                        event.preventDefault();
                        setRequestedPage(page);
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
                  aria-disabled={!hasNextPage}
                  className={cn(
                    !hasNextPage && 'pointer-events-none opacity-50',
                  )}
                  onClick={(event) => {
                    event.preventDefault();
                    if (hasNextPage) setRequestedPage(currentPage + 1);
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      ) : null}
    </div>
  );
}
