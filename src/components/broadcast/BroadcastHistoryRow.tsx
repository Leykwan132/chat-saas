import { MoreHorizontal, Trash2 } from 'lucide-react';
import type { Doc, Id } from '../../../convex/_generated/dataModel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TableCell, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

type BroadcastSchedule = Doc<'whatsappBroadcastSchedules'>;

function statusDotClass(status: BroadcastSchedule['status']) {
  if (status === 'completed') return 'bg-emerald-500';
  if (status === 'processing') return 'bg-blue-500';
  if (status === 'pending') return 'bg-amber-500';
  if (status === 'failed') return 'bg-rose-500';
  return 'bg-neutral-400';
}

function formatReplyRate(schedule: BroadcastSchedule) {
  if (schedule.status !== 'completed' || !schedule.okCount) return '—';
  return '0.0%';
}

export function BroadcastHistoryRow({
  schedule,
  canManage,
  deleting,
  onOpen,
  onDeleteRequest,
}: {
  schedule: BroadcastSchedule;
  canManage: boolean;
  deleting: boolean;
  onOpen: () => void;
  onDeleteRequest: (schedule: {
    id: Id<'whatsappBroadcastSchedules'>;
    isPending: boolean;
  }) => void;
}) {
  const dateFormatted = new Date(schedule.scheduledAt).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const statusLabel =
    schedule.status.charAt(0).toUpperCase() + schedule.status.slice(1);

  return (
    <TableRow
      onClick={onOpen}
      className={cn(
        'cursor-pointer transition-colors hover:bg-muted/10',
        deleting && 'animate-row-delete pointer-events-none',
      )}
    >
      <TableCell className="max-w-[200px] truncate px-5 py-4 font-semibold text-foreground">
        {schedule.templateName}
      </TableCell>
      <TableCell className="px-5 py-4 text-center text-muted-foreground">
        {dateFormatted}
      </TableCell>
      <TableCell className="px-5 py-4 text-center text-foreground">
        {schedule.status === 'completed'
          ? `${schedule.okCount ?? 0} / ${schedule.totalCount}`
          : schedule.totalCount}
      </TableCell>
      <TableCell className="px-5 py-4 text-center">
        <Badge variant="outline" className="gap-1.5 bg-muted text-foreground">
          <span
            className={cn(
              'size-1.5 rounded-full',
              statusDotClass(schedule.status),
            )}
          />
          {statusLabel}
        </Badge>
      </TableCell>
      <TableCell className="px-5 py-4 text-center font-medium text-foreground">
        {formatReplyRate(schedule)}
      </TableCell>
      <TableCell className="px-5 py-4 text-center font-medium tabular-nums text-foreground">
        RM {(schedule.totalCount * 0.3467).toFixed(2)}
      </TableCell>
      <TableCell
        className="px-5 py-4 text-center"
        onClick={(event) => event.stopPropagation()}
      >
        {canManage ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground"
                title="Actions"
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() =>
                    onDeleteRequest({
                      id: schedule._id,
                      isPending: schedule.status === 'pending',
                    })
                  }
                >
                  <Trash2 data-icon="inline-start" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </TableCell>
    </TableRow>
  );
}
