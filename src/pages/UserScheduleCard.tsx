import { Link } from 'react-router';
import { Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import type { Id } from '../../convex/_generated/dataModel';
import {
  describeWeeklyAvailabilityLines,
  isCurrentlyOnTimeOff,
} from '@/lib/scheduleUtils';
import { cn } from '@/lib/utils';

type ScheduleShift = {
  dayOfWeek: number;
  startMinutes: number;
  endMinutes: number;
};

export function UserScheduleCardSkeleton({
  showReceiveLeadsToggle = true,
  isMemberView = false,
}: {
  showReceiveLeadsToggle?: boolean;
  isMemberView?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card',
        isMemberView ? 'px-5 py-6' : 'p-4',
      )}
    >
      <div className={cn(isMemberView ? 'space-y-3' : 'space-y-2')}>
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
        <Skeleton className="h-3 w-36" />
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </div>
      {showReceiveLeadsToggle && (
        <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-9 rounded-full" />
        </div>
      )}
    </div>
  );
}

export function UserScheduleCard({
  agentId,
  workosUserId,
  label,
  email,
  role,
  assignedLeadCount,
  scheduleEnabled,
  shifts,
  timeOff,
  showReceiveLeadsToggle,
  isMemberView = false,
  onToggleEnabled,
}: {
  agentId: Id<'agents'>;
  workosUserId: string;
  label: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  assignedLeadCount: number;
  scheduleEnabled: boolean;
  shifts: ScheduleShift[];
  timeOff: Array<{ startAt: number; endAt: number }>;
  showReceiveLeadsToggle: boolean;
  isMemberView?: boolean;
  onToggleEnabled: (enabled: boolean) => void;
}) {
  const isTimeOff = isCurrentlyOnTimeOff(timeOff);
  const isActive = scheduleEnabled && !isTimeOff;
  const availabilityLines =
    shifts.length > 0 ? describeWeeklyAvailabilityLines(shifts) : ['No available hours'];
  const statusLabel = !scheduleEnabled ? 'Inactive' : isTimeOff ? 'Away' : 'Active';
  const detailPath = `/dashboard/${agentId}/availability/${encodeURIComponent(workosUserId)}`;

  return (
    <div
      className={cn(
        'w-full rounded-xl border bg-card text-left',
        !scheduleEnabled && 'opacity-75',
      )}
    >
      <Link
        to={detailPath}
        className={cn(
          'block text-left transition-colors',
          isMemberView ? 'px-5 py-6' : 'p-4',
          'hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          showReceiveLeadsToggle ? 'rounded-t-xl' : 'rounded-xl',
        )}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="text-[11px]">
              {role === 'owner' ? 'Owner' : role === 'admin' ? 'Admin' : 'Member'}
            </Badge>
            {isTimeOff && (
              <Badge
                variant="outline"
                className="text-[11px] border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400"
              >
                Away
              </Badge>
            )}
            <Badge variant="secondary" className="text-[11px]">
              {assignedLeadCount === 1 ? '1 lead' : `${assignedLeadCount} leads`}
            </Badge>
          </div>
          <div className="mt-2 flex items-start justify-between gap-2">
            <span
              className={cn(
                'truncate font-semibold text-foreground',
                isMemberView ? 'text-base' : 'text-sm',
              )}
              title={label}
            >
              {label}
            </span>
            <Badge
              variant={isActive ? 'outline' : 'secondary'}
              className={cn(
                'shrink-0 text-[11px]',
                isActive &&
                  'border-emerald-800 bg-emerald-800 text-white hover:bg-emerald-800',
                isTimeOff &&
                  scheduleEnabled &&
                  'border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400',
              )}
            >
              {statusLabel}
            </Badge>
          </div>
          <p
            className={cn(
              'truncate text-muted-foreground',
              isMemberView ? 'mt-1 text-sm' : 'mt-0.5 text-xs',
            )}
            title={email}
          >
            {email}
          </p>
          <div className="mt-2 space-y-1">
            {availabilityLines.map((line) => (
              <div key={line} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="size-3 shrink-0" aria-hidden />
                <span>{line}</span>
              </div>
            ))}
          </div>
        </div>
      </Link>

      {showReceiveLeadsToggle && (
        <div
          className="flex items-center justify-between gap-3 rounded-b-xl border-t border-border/60 px-4 py-3"
          onClick={(e) => e.preventDefault()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <span className="text-sm text-muted-foreground">Accepting leads</span>
          <Switch
            checked={scheduleEnabled}
            onCheckedChange={onToggleEnabled}
            className="data-[state=checked]:bg-emerald-600"
          />
        </div>
      )}
    </div>
  );
}
