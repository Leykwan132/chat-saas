import { useMemo, useState } from 'react';
import { Navigate, useParams } from 'react-router';
import { useMutation, useQuery } from 'convex/react';
import { Search, X, Star } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import type { Doc, Id } from '../../convex/_generated/dataModel';
import { PageTitleBlock } from '@/components/PageTitleBlock';
import { Input } from '@/components/ui/input';
import { Toggle } from '@/components/ui/toggle';
import { usePermissions } from '@/hooks/usePermissions';
import { Permission } from '../../shared/permissions';
import { cn } from '@/lib/utils';
import { memberLabel } from '@/lib/scheduleUtils';
import { UserScheduleCard } from './UserScheduleCard';
import { SchedulePageSkeleton } from './SchedulePageSkeleton';

type RosterEntry = {
  schedule: Doc<'userSchedules'>;
  shifts: Array<{ dayOfWeek: number; startMinutes: number; endMinutes: number }>;
  timeOff: Array<{ _id: Id<'userTimeOff'>; startAt: number; endAt: number; label?: string }>;
};

type TeamUser = Doc<'users'> & {
  isAdmin: boolean;
  role: Doc<'teamMemberships'>['role'];
};

export default function SchedulePage({ hideHeader = false }: { hideHeader?: boolean } = {}) {
  const { agentId } = useParams();
  const typedAgentId = agentId as Id<'agents'> | undefined;
  const { can, isLoading: permissionsLoading } = usePermissions();
  const canReadSchedule = can(Permission.AVAILABILITY_READ);
  const canManage = can(Permission.ROUTING_MANAGE);
  const showTeamRoster = canManage;

  const roster = useQuery(
    api.leadRouting.schedules.listForAgent,
    typedAgentId ? { agentId: typedAgentId } : 'skip',
  );
  const teamUsers = useQuery(api.users.getUsers, {});
  const currentUser = useQuery(api.users.currentUser);

  const workosUserIdsForLeadCounts = useMemo(() => {
    if (currentUser === undefined || currentUser === null) return undefined;
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
    const toastId = toast.loading(enabled ? 'Turning on availability…' : 'Turning off availability…');
    let activeId = scheduleId;
    const isTemporary = scheduleId.startsWith('temp_');
    if (isTemporary) {
      try {
        activeId = await addUser({ agentId: typedAgentId!, workosUserId: targetUserId });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not initialize schedule', {
          id: toastId,
        });
        return;
      }
    }

    try {
      await updateUser({ userScheduleId: activeId, enabled });
      toast.success(enabled ? 'Availability turned on' : 'Availability turned off', {
        id: toastId,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed', {
        id: toastId,
      });
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
    return (teamUsers as TeamUser[]).filter((teammate) => {
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
        <PageTitleBlock
          title="Availability"
          description="Set when your team is available for bookings and lead assignment."
        />
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
                const isSelf = currentUser?.workosUserId === teammate.workosUserId;
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
                    shifts={existing?.shifts ?? []}
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
