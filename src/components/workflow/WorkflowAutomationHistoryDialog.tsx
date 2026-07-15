import { useMemo, useState } from 'react';
import { usePaginatedQuery } from 'convex-helpers/react';
import { useQuery } from 'convex/react';
import { History } from 'lucide-react';
import type { Id } from '../../../convex/_generated/dataModel';
import { api } from '../../../convex/_generated/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { WorkflowAutomationHistoryPager } from './WorkflowAutomationHistoryPager';
import { formatWorkflowAutomationHistoryCaption } from './workflowAutomationHistoryCaption';

const PAGE_SIZE = 25;

type HistoryStatus = 'scheduled' | 'sent' | 'failed' | 'skipped' | 'cancelled';

function statusVariant(status: HistoryStatus) {
  if (status === 'failed') return 'destructive' as const;
  if (status === 'sent') return 'default' as const;
  return 'secondary' as const;
}

function showsOperationalReason(status: HistoryStatus) {
  return status === 'failed' || status === 'skipped' || status === 'cancelled';
}

function customerPresentation(item: {
  customerName?: string;
  customerAddress?: string;
  subjectLabel: string;
}) {
  const label = item.customerName ?? item.customerAddress ?? item.subjectLabel;
  const context = [item.customerAddress, item.subjectLabel]
    .find((value) => value && value !== label);
  return { label, context };
}

function formatEstimatedCostMyr(value?: number) {
  if (value === undefined) return '—';
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}

export function WorkflowAutomationHistoryDialog({
  agentId,
  automationKind,
}: {
  agentId: Id<'agents'>;
  automationKind: 'reminder' | 'followUp';
}) {
  const [requestedPage, setRequestedPage] = useState(1);
  const { results, status, loadMore } = usePaginatedQuery(
    api.workflowAutomationHistory.list,
    { agentId, automationKind },
    { initialNumItems: PAGE_SIZE },
  );
  const estimatedTotal = useQuery(api.workflowAutomationHistory.estimatedTotal, {
    agentId,
    automationKind,
  });
  const loadedPageCount = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, loadedPageCount);
  const hasMore = status === 'CanLoadMore' || status === 'LoadingMore';
  const totalPages = hasMore ? loadedPageCount + 1 : loadedPageCount;
  const hasNextPage = currentPage < loadedPageCount || status === 'CanLoadMore';
  const pageRows = useMemo(
    () => results.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [currentPage, results],
  );
  const rangeStart = (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = rangeStart + pageRows.length - 1;
  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || status === 'LoadingMore') return;
    if (page > loadedPageCount) {
      if (status !== 'CanLoadMore') return;
      void loadMore(PAGE_SIZE);
    }
    setRequestedPage(page);
  };
  const title = automationKind === 'reminder' ? 'Reminder history' : 'Follow-up history';
  const tableCaption = formatWorkflowAutomationHistoryCaption({
    automationKind,
    sentCount: estimatedTotal?.sentCount ?? 0,
  });
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="nodrag nopan"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <History data-icon="inline-start" />
          History
        </Button>
      </DialogTrigger>
      <DialogContent className="w-max max-w-none rounded-2xl p-6 sm:max-w-none sm:p-8">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Scheduled and completed automation activity for this agent.
          </DialogDescription>
        </DialogHeader>
        <div className="w-max [&_[data-slot=table-container]]:overflow-visible">
          {results.length === 0 ? (
            <Empty className="rounded-xl border bg-muted/60 px-8 py-10">
              <EmptyHeader>
                <EmptyMedia variant="icon"><History /></EmptyMedia>
                <EmptyTitle>No history yet</EmptyTitle>
                <EmptyDescription>Activity will appear here after this automation schedules work.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table className="w-max">
              <TableCaption>{tableCaption}</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Estimated cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((item) => {
                  const customer = customerPresentation(item);
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex min-w-48 flex-col gap-1">
                          <span className="font-medium">{customer.label}</span>
                          {customer.context && <span className="text-muted-foreground">{customer.context}</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span>{item.templateName}</span>
                          <span className="text-muted-foreground">{item.templateLanguage}</span>
                        </div>
                      </TableCell>
                      <TableCell>{new Date(item.scheduledAt).toLocaleString()}</TableCell>
                      <TableCell>{item.sentAt ? new Date(item.sentAt).toLocaleString() : '—'}</TableCell>
                      <TableCell>
                        <div className="flex max-w-56 flex-col items-start gap-1">
                          <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                          {showsOperationalReason(item.status) && item.reason && (
                            <span className="whitespace-normal text-muted-foreground">{item.reason}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatEstimatedCostMyr(item.estimatedCostMyr)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={5}>
                    <div className="flex flex-col gap-1">
                      <span>Estimated total spent</span>
                      {estimatedTotal && estimatedTotal.unpricedSentCount > 0 && (
                        <span className="font-normal text-muted-foreground">
                          {estimatedTotal.unpricedSentCount} unpriced sent
                          {estimatedTotal.unpricedSentCount === 1 ? ' message' : ' messages'} excluded
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {estimatedTotal === undefined
                      ? '—'
                      : formatEstimatedCostMyr(estimatedTotal.estimatedTotalSpentMyr)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </div>
        {results.length > 0 && (
          <div className="flex items-center justify-between gap-6">
            <p className="text-sm text-muted-foreground">
              Showing {rangeStart.toLocaleString()}–{rangeEnd.toLocaleString()}
              {hasMore ? ' · more available' : null}
            </p>
            <WorkflowAutomationHistoryPager
              currentPage={currentPage}
              totalPages={totalPages}
              hasNextPage={hasNextPage}
              loading={status === 'LoadingMore'}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
