import { Link, Navigate, useParams } from 'react-router';
import { useMutation, useQuery } from 'convex/react';
import { ArrowLeft, ChevronRight, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { ScheduleAvailabilityEditor } from '@/components/schedule/ScheduleAvailabilityEditor';
import { ScheduleTimeOffSection } from '@/components/schedule/ScheduleTimeOffSection';
import { ScheduleUserDetailHeader } from '@/components/schedule/ScheduleUserDetailHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useActiveTeam } from '@/hooks/useActiveTeam';
import { usePermissions } from '@/hooks/usePermissions';
import {
  availabilityBackPath,
  canViewAvailabilityRoster,
} from '@/lib/availabilityWorkspace';
import { formatTimeZoneDisplayLabel } from '@/lib/calendarTimeUtils';
import {
  describeWeeklyAvailabilityLines,
  isCurrentlyOnTimeOff,
  memberLabel,
  resolveScheduleTimezone,
  SCHEDULE_TIMEZONE_OPTIONS,
  shiftsForDisplay,
} from '@/lib/scheduleUtils';
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
  const addUser = useMutation(api.leadRouting.schedules.addUser);
  const updateUser = useMutation(api.leadRouting.schedules.updateUser);

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
    return <ScheduleUserDetailSkeleton showStatusSection={canManage} />;
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

  const scheduleEnabled = detail.schedule?.enabled ?? false;
  const isTimeOff = isCurrentlyOnTimeOff(detail.timeOff);
  const isActive = scheduleEnabled && !isTimeOff;
  const statusLabel = !scheduleEnabled ? 'Inactive' : isTimeOff ? 'Away' : 'Active';
  const availabilityLines = describeWeeklyAvailabilityLines(shiftsForDisplay(detail.shifts));
  const timezone = resolveScheduleTimezone(detail.schedule?.timezone);
  const timezoneLabel =
    SCHEDULE_TIMEZONE_OPTIONS.find((option) => option.value === timezone)?.label
    ?? formatTimeZoneDisplayLabel(timezone);
  const displayName =
    memberLabel(detail.user) + (isOwnProfile ? ' (You)' : '');
  const availabilityPath = `/dashboard/${typedAgentId}/availability/${encodeURIComponent(decodedWorkosUserId)}/edit`;

  const handleToggleEnabled = async (enabled: boolean) => {
    const toastId = toast.loading(enabled ? 'Turning on availability…' : 'Turning off availability…');
    try {
      const userScheduleId = detail.schedule?._id ?? await addUser({
        agentId: typedAgentId,
        workosUserId: decodedWorkosUserId,
        timezone,
      });
      await updateUser({ userScheduleId, enabled });
      toast.success(enabled ? 'Availability turned on' : 'Availability turned off', {
        id: toastId,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed', { id: toastId });
    }
  };

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      {isPersonalAvailabilityView ? (
        <div className="space-y-1.5">
          <h1 className="m-0 font-title text-3xl font-normal tracking-tight text-foreground">
            Availability
          </h1>
          <p className="text-sm text-muted-foreground">
            Set when you’re available to receive leads and bookings.
          </p>
        </div>
      ) : isDirectAvailabilityView ? (
        <h1 className="m-0 font-title text-3xl font-normal tracking-tight text-foreground">
          Availability
        </h1>
      ) : (
        <Link
          to={rosterPath}
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>
      )}

      {!isPersonalAvailabilityView ? (
        <ScheduleUserDetailHeader
          displayName={displayName}
          email={detail.user.email}
          headingAs={isDirectAvailabilityView ? 'h2' : 'h1'}
          role={detail.user.role}
          statusLabel={statusLabel}
          isActive={isActive}
          isTimeOff={isTimeOff}
          scheduleEnabled={scheduleEnabled}
        />
      ) : null}

      <section className="space-y-3">
        {isDirectAvailabilityView ? (
          <ScheduleAvailabilityEditor
            agentId={typedAgentId}
            workosUserId={decodedWorkosUserId}
          />
        ) : (
          <>
            <h2 className="text-lg font-semibold text-foreground">Availability</h2>
            <Link
              to={availabilityPath}
              prefetch="intent"
              className="flex w-full cursor-pointer items-start justify-between gap-4 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <AvailabilitySummary lines={availabilityLines} timezoneLabel={timezoneLabel} />
              <ChevronRight className="m-2 size-4 shrink-0 text-muted-foreground" />
            </Link>
          </>
        )}
      </section>

      <ScheduleTimeOffSection
        agentId={typedAgentId}
        workosUserId={decodedWorkosUserId}
        scheduleId={detail.schedule?._id}
        timeOff={detail.timeOff}
      />

      {canManage ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Status</h2>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 space-y-1.5">
                <p className="text-base font-semibold text-foreground">Accepting leads</p>
                <p className="text-sm text-muted-foreground">
                  Include this teammate when assigning new leads.
                </p>
              </div>
              <Switch
                checked={scheduleEnabled}
                onCheckedChange={(enabled) => void handleToggleEnabled(enabled)}
                className="shrink-0 data-[state=checked]:bg-emerald-600"
              />
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function AvailabilitySummary({
  lines,
  timezoneLabel,
}: {
  lines: string[];
  timezoneLabel: string;
}) {
  return (
    <div className="min-w-0 space-y-1.5 text-left">
      <p className="text-base font-semibold text-foreground">Available hours</p>
      {lines.map((line) => (
        <p key={line} className="text-sm text-muted-foreground">
          {line}
        </p>
      ))}
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Globe className="size-3.5 shrink-0" aria-hidden />
        {timezoneLabel}
      </p>
    </div>
  );
}

function ScheduleUserDetailSkeleton({ showStatusSection }: { showStatusSection: boolean }) {
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
      <Skeleton className="h-28 w-full rounded-xl" />
      {showStatusSection ? <Skeleton className="h-20 w-full rounded-xl" /> : null}
    </div>
  );
}
