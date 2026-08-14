import { Badge } from '@/components/ui/badge';

type ScheduleRole = 'owner' | 'admin' | 'member';

type ScheduleUserDetailHeaderProps = {
  displayName: string;
  email: string;
  headingAs: 'h1' | 'h2';
  role: ScheduleRole;
};

export function ScheduleUserDetailHeader({
  displayName,
  email,
  headingAs: Heading,
  role,
}: ScheduleUserDetailHeaderProps) {
  return (
    <div className="min-w-0 space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className="text-[12px]">
          {role === 'owner' ? 'Owner' : role === 'admin' ? 'Admin' : 'Member'}
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
