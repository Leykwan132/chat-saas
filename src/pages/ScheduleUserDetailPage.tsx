import { Link, Navigate, useParams } from 'react-router';
import { useQuery } from 'convex/react';
import { ArrowLeft } from 'lucide-react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { ScheduleAvailabilityEditor } from '@/components/schedule/ScheduleAvailabilityEditor';
import { ScheduleTimeOffSection } from '@/components/schedule/ScheduleTimeOffSection';
import { ScheduleUserDetailHeader } from '@/components/schedule/ScheduleUserDetailHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { useActiveTeam } from '@/hooks/useActiveTeam';
import { usePermissions } from '@/hooks/usePermissions';
import {
  availabilityBackPath,
  canViewAvailabilityRoster,
} from '@/lib/availabilityWorkspace';
import { memberLabel } from '@/lib/scheduleUtils';
import { Permission } from '../../shared/permissions';

export default function ScheduleUserDetailPage() {
  const { agentId, workosUserId: workosUserIdParam } = useParams();
  const typedAgentId = agentId as Id<'agents'> | undefined;
  const decodedWorkosUserId = workosUserIdParam
    ? decodeURIComponent(workosUserIdParam)
    : undefined;
  const { can, isLoading: permissionsLoading, role } = usePermissions();
  const { activeTeam } = useActiveTeam();
  const canReadSchedule = can(Permission.AVAILABILITY_READ);
  const canManage = can(Permission.ROUTING_MANAGE);
  const showTeamRoster = canViewAvailabilityRoster(activeTeam, role);
  const detail = useQuery(
    api.leadRouting.schedules.getForAgentUser,
    typedAgentId && decodedWorkosUserId
      ? { agentId: typedAgentId, workosUserId: decodedWorkosUserId }
      : 'skip',
  );
  const currentUser = useQuery(api.users.currentUser);

  if (!typedAgentId || !decodedWorkosUserId) return null;

  if (!permissionsLoading && !canReadSchedule) {
    return <Navigate to={`/dashboard/${typedAgentId}`} replace />;
  }

  const isLoading =
    permissionsLoading ||
    activeTeam === undefined ||
    detail === undefined ||
    currentUser === undefined;

  if (isLoading) {
    return (
      <ScheduleUserDetailSkeleton
        isPersonalAvailabilityView={activeTeam?.type === 'personal'}
        isDirectAvailabilityView={activeTeam !== undefined && !showTeamRoster}
      />
    );
  }

  const isOwnProfile = decodedWorkosUserId === currentUser.workosUserId;
  if (!canManage && !isOwnProfile) {
    return <Navigate to={`/dashboard/${typedAgentId}/availability`} replace />;
  }

  const isDirectAvailabilityView = !showTeamRoster;
  const isPersonalAvailabilityView = activeTeam?.type === 'personal';
  const rosterPath = availabilityBackPath(typedAgentId, showTeamRoster);

  if (detail === null) {
    return (
      <div className="flex w-full max-w-3xl flex-col gap-4">
        {showTeamRoster ? (
          <Link
            to={rosterPath}
            className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back
          </Link>
        ) : null}
        <p className="text-sm text-muted-foreground">Team member not found.</p>
      </div>
    );
  }

  const displayName =
    memberLabel(detail.user) + (isOwnProfile ? ' (You)' : '');

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      {isPersonalAvailabilityView || isDirectAvailabilityView ? (
        <div className="space-y-1.5">
          <h1 className="m-0 font-title text-3xl font-normal tracking-tight text-foreground">
            Availability
          </h1>
          <p className="text-sm text-muted-foreground">
            Set when you’re available to receive leads and bookings.
          </p>
        </div>
      ) : (
        <Link
          to={rosterPath}
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>
      )}

      {!isPersonalAvailabilityView && !isDirectAvailabilityView ? (
        <ScheduleUserDetailHeader
          displayName={displayName}
          email={detail.user.email}
          headingAs={isDirectAvailabilityView ? 'h2' : 'h1'}
          role={detail.user.role}
        />
      ) : null}

      <section className="space-y-3">
        <ScheduleAvailabilityEditor
          agentId={typedAgentId}
          workosUserId={decodedWorkosUserId}
        />
      </section>

      <ScheduleTimeOffSection
        agentId={typedAgentId}
        workosUserId={decodedWorkosUserId}
        scheduleId={detail.schedule?._id}
        timeOff={detail.timeOff}
      />

    </div>
  );
}

function ScheduleUserDetailSkeleton({
  isPersonalAvailabilityView,
  isDirectAvailabilityView,
}: {
  isPersonalAvailabilityView: boolean;
  isDirectAvailabilityView: boolean;
}) {
  if (isPersonalAvailabilityView || isDirectAvailabilityView) {
    return (
      <div className="flex w-full max-w-3xl flex-col gap-6">
        <div className="space-y-1.5">
          <h1 className="m-0 font-title text-3xl font-normal tracking-tight text-foreground">
            Availability
          </h1>
          <p className="text-sm text-muted-foreground">
            Set when you’re available to receive leads and bookings.
          </p>
        </div>
        <Skeleton className="h-72 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-3xl flex-col gap-8">
      <div className="space-y-4">
        <Skeleton className="h-9 w-48" />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex gap-2">
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-9 w-36" />
        </div>
      </div>
      <Skeleton className="h-72 w-full rounded-xl" />
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-28 w-full rounded-xl" />
    </div>
  );
}
