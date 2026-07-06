import { useMemo, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { format } from 'date-fns';
import { Filter } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { pricingTableShellClass } from '@/components/pricing/pricingStyles';
import { AdminContactTableSkeleton } from './AdminContactTableSkeleton';
import {
  type ContactStatus,
  type IntentFilter,
  type StatusFilter,
  contactTableGridClass,
  intentFilterLabels,
  intentLabels,
  statusBadgeVariant,
  statusFilterLabels,
  statusLabels,
} from './adminContactModel';
import { toast } from 'sonner';

export function AdminContactRequestsTab({
  sessionToken,
  enabled,
}: {
  sessionToken: string;
  enabled: boolean;
}) {
  const updateContactRequestStatus = useMutation(api.contactAdmin.updateContactRequestStatus);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [intentFilter, setIntentFilter] = useState<IntentFilter>('all');
  const [visibleContactIds, setVisibleContactIds] = useState<Set<Id<'contactRequests'>>>(
    () => new Set(),
  );

  const countsResult = useQuery(
    api.contactAdmin.getContactRequestCounts,
    enabled ? { sessionToken } : 'skip',
  );
  const requests = useQuery(
    api.contactAdmin.listContactRequests,
    enabled
      ? {
          sessionToken,
          status: statusFilter === 'all' ? undefined : statusFilter,
          intent: intentFilter === 'all' ? undefined : intentFilter,
        }
      : 'skip',
  );

  const isTableLoading = !enabled || requests === undefined;
  const hasActiveFilters = statusFilter !== 'all' || intentFilter !== 'all';
  const filteredContactCount = requests?.length ?? 0;

  const filterCounts = useMemo(() => {
    const counts = countsResult?.counts;
    if (!counts) {
      return null;
    }
    return {
      all: countsResult.total,
      unread: counts.unread,
      seen: counts.seen,
      replied: counts.replied,
      closed: counts.closed,
    };
  }, [countsResult]);

  const activeFilterLabel = useMemo(() => {
    const parts: string[] = [];
    if (statusFilter !== 'all') {
      parts.push(statusFilterLabels[statusFilter]);
    }
    if (intentFilter !== 'all') {
      parts.push(intentFilterLabels[intentFilter]);
    }
    return parts.length > 0 ? parts.join(', ') : 'Filter';
  }, [statusFilter, intentFilter]);

  const handleStatusChange = async (
    requestId: Id<'contactRequests'>,
    status: ContactStatus,
  ) => {
    try {
      await updateContactRequestStatus({ sessionToken, requestId, status });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update status.');
    }
  };

  const toggleContactVisibility = (requestId: Id<'contactRequests'>) => {
    setVisibleContactIds((current) => {
      const next = new Set(current);
      if (next.has(requestId)) {
        next.delete(requestId);
      } else {
        next.add(requestId);
      }
      return next;
    });
  };

  return (
    <div>
      <div className="flex items-center gap-3">
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" className="w-fit rounded-lg px-3">
              <Filter data-icon="inline-start" />
              <span>{activeFilterLabel}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto min-w-56 p-4">
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-xs font-medium text-muted-foreground">Status</span>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value as StatusFilter)}
                >
                  <SelectTrigger className="h-9 w-full rounded-lg">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {(Object.keys(statusFilterLabels) as StatusFilter[]).map((filter) => {
                        const count = filterCounts?.[filter];
                        return (
                          <SelectItem key={filter} value={filter}>
                            {statusFilterLabels[filter]}
                            {typeof count === 'number' ? ` (${count})` : ''}
                          </SelectItem>
                        );
                      })}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-xs font-medium text-muted-foreground">Intent</span>
                <Select
                  value={intentFilter}
                  onValueChange={(value) => setIntentFilter(value as IntentFilter)}
                >
                  <SelectTrigger className="h-9 w-full rounded-lg">
                    <SelectValue placeholder="All intents" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {(Object.keys(intentFilterLabels) as IntentFilter[]).map((filter) => (
                        <SelectItem key={filter} value={filter}>
                          {intentFilterLabels[filter]}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </label>
            </div>
          </PopoverContent>
        </Popover>
        <Button
          type="button"
          variant="link"
          className="h-auto px-0 text-muted-foreground"
          disabled={!hasActiveFilters}
          onClick={() => {
            setStatusFilter('all');
            setIntentFilter('all');
          }}
        >
          Reset
        </Button>
      </div>

      <div className={cn(pricingTableShellClass, 'mt-6')}>
        <div className="overflow-x-auto">
          <div className="min-w-[1040px] w-full">
            <div
              className={cn(
                contactTableGridClass,
                'border-b border-border/70 py-5 text-left text-sm font-medium text-muted-foreground',
              )}
            >
              <div>Received</div>
              <div>Intent</div>
              <div>Contact</div>
              <div>Company</div>
              <div>Company size</div>
              <div className="text-center">Status</div>
              <div className="text-center">Actions</div>
            </div>

            {isTableLoading ? (
              <AdminContactTableSkeleton />
            ) : filteredContactCount === 0 ? (
              <div className="px-8 py-10 text-center text-sm text-muted-foreground/45">
                {hasActiveFilters
                  ? 'No contact requests match these filters.'
                  : 'No contact requests yet.'}
              </div>
            ) : (
              (requests ?? []).map((request) => (
                <div key={request._id} className="border-b border-dotted border-border/60">
                  <div className={cn(contactTableGridClass, 'py-4 text-left text-sm text-foreground')}>
                    <div>{format(new Date(request.createdAt), 'MMM d, yyyy h:mm a')}</div>
                    <div>{intentLabels[request.intent]}</div>
                    <div>
                      {visibleContactIds.has(request._id) ? (
                        <div className="mb-2 flex flex-col gap-1">
                          <div>{request.email}</div>
                          {request.contactName ? (
                            <div className="text-xs text-muted-foreground">{request.contactName}</div>
                          ) : null}
                          {request.contactNumber ? (
                            <div className="text-xs text-muted-foreground">{request.contactNumber}</div>
                          ) : null}
                        </div>
                      ) : null}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => toggleContactVisibility(request._id)}
                        className="rounded-lg"
                      >
                        {visibleContactIds.has(request._id) ? 'Hide contact' : 'View contact'}
                      </Button>
                    </div>
                    <div>{request.companyName ?? request.company ?? <span className="text-muted-foreground/45">-</span>}</div>
                    <div>{request.numberOfUsers ?? <span className="text-muted-foreground/45">-</span>}</div>
                    <div className="flex justify-center">
                      <Badge variant={statusBadgeVariant(request.status)}>
                        {statusLabels[request.status]}
                      </Badge>
                    </div>
                    <div className="flex justify-center">
                      <Select
                        value={request.status}
                        onValueChange={(value) =>
                          void handleStatusChange(request._id, value as ContactStatus)
                        }
                      >
                        <SelectTrigger className="h-9 rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {(Object.keys(statusLabels) as ContactStatus[]).map((status) => (
                              <SelectItem key={status} value={status}>
                                {statusLabels[status]}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 px-1">
        {isTableLoading ? (
          <Skeleton className="h-4 w-28" />
        ) : (
          <p className="text-sm text-muted-foreground">
            {filteredContactCount} {filteredContactCount === 1 ? 'contact' : 'contacts'}
          </p>
        )}
      </div>
    </div>
  );
}
