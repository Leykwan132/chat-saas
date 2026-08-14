import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { UserScheduleCardSkeleton } from './UserScheduleCard';

export function SchedulePageSkeleton({
  hideHeader = false,
  showTeamRoster = true,
}: {
  hideHeader?: boolean;
  showTeamRoster?: boolean;
} = {}) {
  return (
    <div className="flex w-full max-w-5xl flex-col gap-6">
      {!hideHeader && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-40" />
        </div>
      )}

      {showTeamRoster ? (
        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-border bg-card p-4">
          <div className="min-w-[200px] flex-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-2 h-9 w-full" />
          </div>
          <Skeleton className="h-9 w-16" />
        </div>
      ) : null}

      <div
        className={cn(
          'grid gap-3',
          showTeamRoster ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3' : 'max-w-xs grid-cols-1',
        )}
      >
        <UserScheduleCardSkeleton
          isMemberView={!showTeamRoster}
        />
        {showTeamRoster ? (
          <>
            <UserScheduleCardSkeleton />
            <UserScheduleCardSkeleton />
          </>
        ) : null}
      </div>
    </div>
  );
}
