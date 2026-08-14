import { Link } from 'react-router';
import { Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
  isMemberView = false,
}: {
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
  shifts,
  timeOff,
  isMemberView = false,
}: {
  agentId: Id<'agents'>;
  workosUserId: string;
  label: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  assignedLeadCount: number;
  shifts: ScheduleShift[];
  timeOff: Array<{ startAt: number; endAt: number }>;
  isMemberView?: boolean;
}) {
  const isTimeOff = isCurrentlyOnTimeOff(timeOff);
  const availabilityLines =
    shifts.length > 0 ? describeWeeklyAvailabilityLines(shifts) : ['No available hours'];
  const detailPath = `/dashboard/${agentId}/availability/${encodeURIComponent(workosUserId)}`;

  return (
    <div
      className="w-full rounded-xl border bg-card text-left"
    >
      <Link
        to={detailPath}
        className={cn(
          'block text-left transition-colors',
          isMemberView ? 'px-5 py-6' : 'p-4',
          'hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'rounded-xl',
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
    </div>
  );
}
