import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type ScheduleRole = 'owner' | 'admin' | 'member';

type ScheduleUserDetailHeaderProps = {
  displayName: string;
  email: string;
  headingAs: 'h1' | 'h2';
  role: ScheduleRole;
  statusLabel: string;
  isActive: boolean;
  isTimeOff: boolean;
  scheduleEnabled: boolean;
};

export function ScheduleUserDetailHeader({
  displayName,
  email,
  headingAs: Heading,
  role,
  statusLabel,
  isActive,
  isTimeOff,
  scheduleEnabled,
}: ScheduleUserDetailHeaderProps) {
  return (
    <div className="min-w-0 space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className="text-[12px]">
          {role === 'owner' ? 'Owner' : role === 'admin' ? 'Admin' : 'Member'}
        </Badge>
        <Badge
          variant={isActive ? 'outline' : 'secondary'}
          className={cn(
            'text-[12px]',
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
      <div className="flex flex-col gap-1">
        <Heading className="m-0 font-title text-3xl font-normal tracking-tight text-foreground">
          {displayName}
        </Heading>
        <p className="text-sm text-muted-foreground">{email}</p>
      </div>
    </div>
  );
}
