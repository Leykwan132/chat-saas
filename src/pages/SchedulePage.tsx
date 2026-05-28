import { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { useMutation, useQuery } from 'convex/react';
import { Search, X, Star } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import type { Doc, Id } from '../../convex/_generated/dataModel';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Toggle } from '@/components/ui/toggle';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/usePermissions';
import { Permission } from '../../shared/permissions';
import { cn } from '@/lib/utils';
import { isCurrentlyOnTimeOff, memberLabel } from '@/lib/scheduleUtils';

type RosterEntry = {
  schedule: Doc<'userSchedules'>;
  shifts: Array<{ dayOfWeek: number; startMinutes: number; endMinutes: number }>;
  timeOff: Array<{ _id: Id<'userTimeOff'>; startAt: number; endAt: number; label?: string }>;
};

export default function SchedulePage({ hideHeader = false }: { hideHeader?: boolean } = {}) {
  const { agentId } = useParams();
  const typedAgentId = agentId as Id<'agents'> | undefined;
  const { can, isLoading: permissionsLoading } = usePermissions();
  const canReadSchedule = can(Permission.SCHEDULE_READ);
  const canManage = can(Permission.ROUTING_MANAGE);
  const showTeamRoster = canManage;

  const roster = useQuery(
    api.leadRouting.schedules.listForAgent,
    typedAgentId ? { agentId: typedAgentId } : 'skip',
  );
  const teamUsers = useQuery(api.users.getUsers, {});
  const currentUser = useQuery(api.users.currentUser);

  const workosUserIdsForLeadCounts = useMemo(() => {
    if (currentUser === undefined) return undefined;
    if (showTeamRoster) {
      return (teamUsers ?? []).map((u) => u.workosUserId);
    }
    return [currentUser.workosUserId];
  }, [showTeamRoster, teamUsers, currentUser]);

  const openLeadCounts = useQuery(
    api.leadRouting.settings.getRosterOpenLeadCounts,
    typedAgentId && workosUserIdsForLeadCounts !== undefined
      ? { agentId: typedAgentId, workosUserIds: workosUserIdsForLeadCounts }
      : 'skip',
  );

  const addUser = useMutation(api.leadRouting.schedules.addUser);
  const updateUser = useMutation(api.leadRouting.schedules.updateUser);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterActiveOnly, setFilterActiveOnly] = useState(false);

  const handleToggleEnabled = async (
    targetUserId: string,
    scheduleId: Id<'userSchedules'>,
    enabled: boolean,
  ) => {
    let activeId = scheduleId;
    const isTemporary = scheduleId.startsWith('temp_');
    if (isTemporary) {
      try {
        activeId = await addUser({ agentId: typedAgentId!, workosUserId: targetUserId });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not initialize schedule');
        return;
      }
    }

    try {
      await updateUser({ userScheduleId: activeId, enabled });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed');
    }
  };

  const sortedTeammates = useMemo(() => {
    if (!teamUsers || !currentUser) return [];
    const teammates = showTeamRoster
      ? teamUsers
      : teamUsers.filter((u) => u.workosUserId === currentUser.workosUserId);
    if (teammates.length === 0) return [];

    return [...teammates].sort((a, b) => {
      if (a.workosUserId === currentUser.workosUserId) return -1;
      if (b.workosUserId === currentUser.workosUserId) return 1;

      const existingA = (roster as RosterEntry[] ?? []).find((r: RosterEntry) => r.schedule.workosUserId === a.workosUserId);
      const isEnabledA = existingA ? existingA.schedule.enabled : false;
      const existingB = (roster as RosterEntry[] ?? []).find((r: RosterEntry) => r.schedule.workosUserId === b.workosUserId);
      const isEnabledB = existingB ? existingB.schedule.enabled : false;

      if (isEnabledA && !isEnabledB) return -1;
      if (!isEnabledA && isEnabledB) return 1;

      return memberLabel(a).localeCompare(memberLabel(b));
    });
  }, [teamUsers, currentUser, roster, showTeamRoster]);

  const filteredTeammates = useMemo(() => {
    let list = sortedTeammates;

    if (filterActiveOnly) {
      list = list.filter((teammate) => {
        const existing = (roster as RosterEntry[] ?? []).find((r: RosterEntry) => r.schedule.workosUserId === teammate.workosUserId);
        return existing ? existing.schedule.enabled === true : false;
      });
    }

    if (!searchQuery) return list;
    const query = searchQuery.toLowerCase().trim();
    return list.filter((teammate) => {
      const label = memberLabel(teammate).toLowerCase();
      const email = teammate.email.toLowerCase();
      return label.includes(query) || email.includes(query);
    });
  }, [sortedTeammates, searchQuery, filterActiveOnly, roster]);

  const displayTeammates = showTeamRoster ? filteredTeammates : sortedTeammates;

  const activeCount = useMemo(() => {
    if (!teamUsers) return 0;
    return teamUsers.filter((teammate: Doc<'users'> & { isAdmin: boolean }) => {
      const existing = (roster as RosterEntry[] ?? []).find((r: RosterEntry) => r.schedule.workosUserId === teammate.workosUserId);
      return existing ? existing.schedule.enabled === true : false;
    }).length;
  }, [teamUsers, roster]);

  if (!typedAgentId) return null;

  if (!permissionsLoading && !canReadSchedule) {
    return <Navigate to={`/dashboard/${typedAgentId}`} replace />;
  }

  const isLoading =
    permissionsLoading ||
    roster === undefined ||
    currentUser === undefined ||
    teamUsers === undefined ||
    openLeadCounts === undefined;

  if (isLoading) {
    return (
      <SchedulePageSkeleton
        hideHeader={hideHeader}
        showReceiveLeadsToggle={canManage}
        showTeamRoster={showTeamRoster}
      />
    );
  }

  return (
    <div className="flex w-full max-w-5xl flex-col gap-6">
      {!hideHeader && (
        <div>
          <h1 className="m-0 text-4xl font-semibold tracking-tight text-foreground">Schedule</h1>
        </div>
      )}

      {sortedTeammates.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {showTeamRoster
            ? 'No team members found in the organization.'
            : 'Your schedule could not be loaded.'}
        </p>
      ) : (
        <>
          {showTeamRoster ? (
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search team members by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 w-full pl-9 pr-9 border-border bg-card focus-visible:ring-foreground"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
              <Toggle
                pressed={filterActiveOnly}
                onPressedChange={setFilterActiveOnly}
                variant="outline"
                className="h-10 text-xs px-4 border border-input text-muted-foreground data-[state=on]:text-foreground data-[state=on]:bg-muted/50"
              >
                <Star className="size-4 text-muted-foreground group-data-[state=on]/toggle:text-foreground group-data-[state=on]/toggle:fill-foreground" />
                Active ({activeCount})
              </Toggle>
            </div>
          ) : null}

          {showTeamRoster && displayTeammates.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-2">
              No team members match your search or filter criteria.
            </p>
          ) : (
            <div
              className={cn(
                'grid gap-3',
                showTeamRoster
                  ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'
                  : 'max-w-xs grid-cols-1',
              )}
            >
              {displayTeammates.map((teammate) => {
                const existing = (roster as RosterEntry[] ?? []).find(
                  (r) => r.schedule.workosUserId === teammate.workosUserId,
                );
                const schedule = existing?.schedule ?? {
                  _id: `temp_${teammate.workosUserId}` as Id<'userSchedules'>,
                  enabled: false,
                  note: '',
                };
                const timeOff = existing?.timeOff ?? [];
                const isSelf = currentUser.workosUserId === teammate.workosUserId;
                const label = memberLabel(teammate) + (isSelf ? ' (You)' : '');

                return (
                  <UserScheduleCard
                    key={teammate.workosUserId}
                    agentId={typedAgentId}
                    workosUserId={teammate.workosUserId}
                    label={label}
                    email={teammate.email}
                    isAdmin={teammate.isAdmin}
                    assignedLeadCount={openLeadCounts[teammate.workosUserId] ?? 0}
                    scheduleEnabled={schedule.enabled}
                    timeOff={timeOff}
                    showReceiveLeadsToggle={canManage}
                    isMemberView={!showTeamRoster}
                    onToggleEnabled={(enabled) =>
                      void handleToggleEnabled(teammate.workosUserId, schedule._id, enabled)
                    }
                  />
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SchedulePageSkeleton({
  hideHeader = false,
  showReceiveLeadsToggle = true,
  showTeamRoster = true,
}: {
  hideHeader?: boolean;
  showReceiveLeadsToggle?: boolean;
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
          showReceiveLeadsToggle={showReceiveLeadsToggle}
          isMemberView={!showTeamRoster}
        />
        {showTeamRoster ? (
          <>
            <UserScheduleCardSkeleton showReceiveLeadsToggle={showReceiveLeadsToggle} />
            <UserScheduleCardSkeleton showReceiveLeadsToggle={showReceiveLeadsToggle} />
          </>
        ) : null}
      </div>
    </div>
  );
}

function UserScheduleCardSkeleton({
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

function UserScheduleCard({
  agentId,
  workosUserId,
  label,
  email,
  isAdmin,
  assignedLeadCount,
  scheduleEnabled,
  timeOff,
  showReceiveLeadsToggle,
  isMemberView = false,
  onToggleEnabled,
}: {
  agentId: Id<'agents'>;
  workosUserId: string;
  label: string;
  email: string;
  isAdmin: boolean;
  assignedLeadCount: number;
  scheduleEnabled: boolean;
  timeOff: Array<{ startAt: number; endAt: number }>;
  showReceiveLeadsToggle: boolean;
  isMemberView?: boolean;
  onToggleEnabled: (enabled: boolean) => void;
}) {
  const isTimeOff = isCurrentlyOnTimeOff(timeOff);
  const isActive = scheduleEnabled && !isTimeOff;

  const statusLabel = !scheduleEnabled ? 'Inactive' : isTimeOff ? 'Away' : 'Active';
  const detailPath = `/dashboard/${agentId}/schedule/${encodeURIComponent(workosUserId)}`;

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
          <div className="flex items-start justify-between gap-2">
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
          <div
            className={cn(
              'flex flex-wrap items-center gap-1.5',
              isMemberView ? 'mt-3' : 'mt-2',
            )}
          >
            <Badge variant="outline" className="text-[11px]">
              {isAdmin ? 'Admin' : 'Member'}
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
        </div>
      </Link>

      {showReceiveLeadsToggle && (
        <div
          className="flex items-center justify-between gap-3 rounded-b-xl border-t border-border/60 px-4 py-3"
          onClick={(e) => e.preventDefault()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <span className="text-sm text-muted-foreground">Receive leads</span>
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
