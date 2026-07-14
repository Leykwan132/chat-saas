import { usePaginatedQuery } from 'convex-helpers/react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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

export function WorkflowAutomationHistoryDialog({
  agentId,
  automationKind,
}: {
  agentId: Id<'agents'>;
  automationKind: 'reminder' | 'followUp';
}) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.workflowAutomationHistory.list,
    { agentId, automationKind },
    { initialNumItems: 25 },
  );
  const title = automationKind === 'reminder' ? 'Reminder history' : 'Follow-up history';
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
      <DialogContent className="sm:max-w-3xl rounded-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Scheduled and completed automation activity for this agent.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          {results.length === 0 ? (
            <Empty className="rounded-xl border bg-muted/60 px-8 py-10">
              <EmptyHeader>
                <EmptyMedia variant="icon"><History /></EmptyMedia>
                <EmptyTitle>No history yet</EmptyTitle>
                <EmptyDescription>Activity will appear here after this automation schedules work.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((item) => {
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
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
        {status === 'CanLoadMore' && (
          <Button type="button" variant="outline" onClick={() => loadMore(25)}>
            Load more
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
