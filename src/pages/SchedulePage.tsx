import { useMemo, useState } from 'react';
import { Navigate, useParams } from 'react-router';
import { useQuery } from 'convex/react';
import { Search, X } from 'lucide-react';
import { api } from '../../convex/_generated/api';
import type { Doc, Id } from '../../convex/_generated/dataModel';
import { PageTitleBlock } from '@/components/PageTitleBlock';
import { Input } from '@/components/ui/input';
import { usePermissions } from '@/hooks/usePermissions';
import { useActiveTeam } from '@/hooks/useActiveTeam';
import { Permission } from '../../shared/permissions';
import { canViewAvailabilityRoster } from '@/lib/availabilityWorkspace';
import { cn } from '@/lib/utils';
import { memberLabel } from '@/lib/scheduleUtils';
import { UserScheduleCard } from './UserScheduleCard';
import { SchedulePageSkeleton } from './SchedulePageSkeleton';

type RosterEntry = {
  schedule: Doc<'userSchedules'>;
  shifts: Array<{ dayOfWeek: number; startMinutes: number; endMinutes: number }>;
  timeOff: Array<{ _id: Id<'userTimeOff'>; startAt: number; endAt: number; label?: string }>;
};

export default function SchedulePage({ hideHeader = false }: { hideHeader?: boolean } = {}) {
  const { agentId } = useParams();
  const typedAgentId = agentId as Id<'agents'> | undefined;
  const { can, isLoading: permissionsLoading, role } = usePermissions();
  const { activeTeam } = useActiveTeam();
  const canReadSchedule = can(Permission.AVAILABILITY_READ);
  const showTeamRoster = canViewAvailabilityRoster(activeTeam, role);

  const roster = useQuery(
    api.leadRouting.schedules.listForAgent,
    typedAgentId && showTeamRoster ? { agentId: typedAgentId } : 'skip',
  );
  const teamUsers = useQuery(api.users.getUsers, showTeamRoster ? {} : 'skip');
  const currentUser = useQuery(api.users.currentUser);

  const workosUserIdsForLeadCounts = useMemo(() => {
    if (currentUser === undefined || currentUser === null) return undefined;
    if (!showTeamRoster) return undefined;
    return (teamUsers ?? []).map((u) => u.workosUserId);
  }, [showTeamRoster, teamUsers, currentUser]);

  const openLeadCounts = useQuery(
    api.leadRouting.settings.getRosterOpenLeadCounts,
    typedAgentId && showTeamRoster && workosUserIdsForLeadCounts !== undefined
      ? { agentId: typedAgentId, workosUserIds: workosUserIdsForLeadCounts }
      : 'skip',
  );

  const [searchQuery, setSearchQuery] = useState('');

  const sortedTeammates = useMemo(() => {
    if (!teamUsers || !currentUser) return [];
    const teammates = showTeamRoster
      ? teamUsers
      : teamUsers.filter((u) => u.workosUserId === currentUser.workosUserId);
    if (teammates.length === 0) return [];

    return [...teammates].sort((a, b) => {
      if (a.workosUserId === currentUser.workosUserId) return -1;
      if (b.workosUserId === currentUser.workosUserId) return 1;

      return memberLabel(a).localeCompare(memberLabel(b));
    });
  }, [teamUsers, currentUser, showTeamRoster]);

  const filteredTeammates = useMemo(() => {
    let list = sortedTeammates;

    if (!searchQuery) return list;
    const query = searchQuery.toLowerCase().trim();
    return list.filter((teammate) => {
      const label = memberLabel(teammate).toLowerCase();
      const email = teammate.email.toLowerCase();
      return label.includes(query) || email.includes(query);
    });
  }, [sortedTeammates, searchQuery]);

  const displayTeammates = showTeamRoster ? filteredTeammates : sortedTeammates;

  if (!typedAgentId) return null;

  if (!permissionsLoading && !canReadSchedule) {
    return <Navigate to={`/dashboard/${typedAgentId}`} replace />;
  }

  const isLoading =
    permissionsLoading ||
    activeTeam === undefined ||
    currentUser === undefined ||
    (showTeamRoster &&
      (roster === undefined || teamUsers === undefined || openLeadCounts === undefined));

  if (isLoading) {
    return (
      <SchedulePageSkeleton
        hideHeader={hideHeader}
        showTeamRoster={showTeamRoster}
      />
    );
  }

  if (!showTeamRoster && currentUser) {
    return (
      <Navigate
        to={`/dashboard/${typedAgentId}/availability/${encodeURIComponent(currentUser.workosUserId)}`}
        replace
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
                    role={teammate.role}
                    assignedLeadCount={showTeamRoster && openLeadCounts
                      ? openLeadCounts[teammate.workosUserId] ?? 0
                      : 0}
                    shifts={existing?.shifts ?? []}
                    timeOff={timeOff}
                    isMemberView={!showTeamRoster}
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
