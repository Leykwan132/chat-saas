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
import { Separator } from '@/components/ui/separator';

type HistoryStatus = 'scheduled' | 'sent' | 'failed' | 'skipped' | 'cancelled';

function statusVariant(status: HistoryStatus) {
  if (status === 'failed') return 'destructive' as const;
  if (status === 'sent') return 'default' as const;
  return 'secondary' as const;
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
            <div className="flex flex-col gap-3 pr-4">
              {results.map((item) => (
                <div key={item.id} className="flex flex-col gap-2 rounded-xl border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-1">
                      <p className="m-0 truncate font-medium">{item.customerName ?? item.customerAddress ?? item.subjectLabel}</p>
                      <p className="m-0 truncate text-sm text-muted-foreground">{item.subjectLabel}</p>
                    </div>
                    <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                  </div>
                  <Separator />
                  <div className="grid gap-1 text-sm sm:grid-cols-2">
                    <span>Template: {item.templateName} ({item.templateLanguage})</span>
                    <span>Attempt: {item.attempt}</span>
                    <span>Scheduled: {new Date(item.scheduledAt).toLocaleString()}</span>
                    <span>Sent: {item.sentAt ? new Date(item.sentAt).toLocaleString() : '—'}</span>
                    <span>Scope: {item.activationScope === 'currentAndFuture' ? 'Current & future' : 'Future only'}</span>
                    <span>Reason: {item.reason ?? '—'}</span>
                  </div>
                </div>
              ))}
            </div>
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
