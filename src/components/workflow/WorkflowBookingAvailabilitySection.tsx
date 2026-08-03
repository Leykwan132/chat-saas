import {
  Component,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Link } from 'react-router';
import { useMutation, useQuery } from 'convex/react';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { Empty, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { memberLabel } from '@/lib/scheduleUtils';
import { usePermissions } from '@/hooks/usePermissions';
import { Permission } from '../../../shared/permissions';
import {
  formatWorkflowWeeklyAvailability,
  hasAcceptingLeadMember,
  type WorkflowAvailabilityRosterEntry,
  type WorkflowAvailabilityTeammate,
} from './workflowBookingAvailabilityModel';
import { runWorkflowAvailabilityToggle } from './workflowBookingAvailabilityMutation';

type WorkflowBookingAvailabilityListProps = {
  agentId: Id<'agents'>;
  teammates: WorkflowAvailabilityTeammate[];
  roster: WorkflowAvailabilityRosterEntry[];
  pendingUserIds: Set<string>;
  canManageAvailability: boolean;
  onToggle: (
    teammate: WorkflowAvailabilityTeammate,
    enabled: boolean,
  ) => void;
};

export function WorkflowBookingAvailabilityList({
  agentId,
  teammates,
  roster,
  pendingUserIds,
  canManageAvailability,
  onToggle,
}: WorkflowBookingAvailabilityListProps) {
  const teammateUserIds = useMemo(
    () => new Set(teammates.map((teammate) => teammate.workosUserId)),
    [teammates],
  );
  const rosterByUserId = useMemo(
    () =>
      new Map(roster.map((entry) => [entry.schedule.workosUserId, entry])),
    [roster],
  );
  const sortedTeammates = useMemo(
    () =>
      [...teammates].sort((first, second) => {
        const firstEnabled =
          rosterByUserId.get(first.workosUserId)?.schedule.enabled === true;
        const secondEnabled =
          rosterByUserId.get(second.workosUserId)?.schedule.enabled === true;
        if (firstEnabled !== secondEnabled) return firstEnabled ? -1 : 1;
        return memberLabel(first).localeCompare(memberLabel(second));
      }),
    [rosterByUserId, teammates],
  );

  if (sortedTeammates.length === 0) {
    return (
      <Empty className="border border-border p-5">
        <EmptyHeader>
          <EmptyTitle className="text-sm">No teammates are available for appointment booking.</EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <ScrollArea className="max-h-64 rounded-lg border border-border">
        <div className="divide-y divide-border">
          {sortedTeammates.map((teammate) => {
            const entry = rosterByUserId.get(teammate.workosUserId);
            const summary = formatWorkflowWeeklyAvailability(
              entry?.shifts ?? [],
              entry?.schedule.timezone,
            );
            const enabled = entry?.schedule.enabled === true;
            const pending = pendingUserIds.has(teammate.workosUserId);

            return (
              <div
                key={teammate.workosUserId}
                className="relative flex items-start gap-3 px-3 py-2.5"
              >
                <Link
                  to={`/dashboard/${agentId}/availability/${encodeURIComponent(teammate.workosUserId)}`}
                  aria-label={`View ${memberLabel(teammate)} availability`}
                  className="absolute inset-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <div className="pointer-events-none min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {memberLabel(teammate)}
                  </p>
                  {summary.lines.map((line) => (
                    <p key={line} className="truncate text-xs text-muted-foreground">
                      {line}
                    </p>
                  ))}
                  <p className="truncate text-xs text-muted-foreground">
                    {summary.timezoneLabel}
                  </p>
                </div>
                <div className="relative z-10 flex shrink-0 items-start gap-2">
                  <span className="text-xs text-muted-foreground">Accepting leads</span>
                  <Switch
                    checked={enabled}
                    disabled={pending || !canManageAvailability}
                    onClick={(event) => event.stopPropagation()}
                    onCheckedChange={(checked) => onToggle(teammate, checked)}
                    aria-label={`${enabled ? 'Stop' : 'Start'} accepting leads for ${memberLabel(teammate)}`}
                    className="data-[state=checked]:bg-emerald-600"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
      {!canManageAvailability ? (
        <p className="text-xs text-muted-foreground">
          You need Lead Assignment management permission to change availability.
        </p>
      ) : null}
      {!hasAcceptingLeadMember(roster, teammateUserIds) ? (
        <p className="text-xs text-destructive">
          At least one teammate to use appointment booking.
        </p>
      ) : null}
    </div>
  );
}

function WorkflowBookingAvailabilitySkeleton() {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
      {[0, 1, 2].map((index) => (
        <div key={index} className="flex items-center gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-5 w-9 rounded-full" />
        </div>
      ))}
    </div>
  );
}

type AvailabilityDataProps = {
  agentId: Id<'agents'>;
  onEligibilityChange: (eligible: boolean | undefined) => void;
};

function WorkflowBookingAvailabilityData({
  agentId,
  onEligibilityChange,
}: AvailabilityDataProps) {
  const { can, isLoading: permissionsLoading } = usePermissions();
  const canReadAvailability = can(Permission.AVAILABILITY_READ);
  const canManageAvailability = can(Permission.ROUTING_MANAGE);
  const teammates = useQuery(api.users.getUsers, {}) as
    | WorkflowAvailabilityTeammate[]
    | undefined;
  const roster = useQuery(
    api.leadRouting.schedules.listForAgent,
    !permissionsLoading && canReadAvailability ? { agentId } : 'skip',
  ) as WorkflowAvailabilityRosterEntry[] | undefined;
  const addUser = useMutation(api.leadRouting.schedules.addUser);
  const updateUser = useMutation(api.leadRouting.schedules.updateUser);
  const [pendingUserIds, setPendingUserIds] = useState<Set<string>>(new Set());
  const eligibility = teammates === undefined || roster === undefined
    ? undefined
    : hasAcceptingLeadMember(
        roster,
        new Set(teammates.map((teammate) => teammate.workosUserId)),
      );

  useEffect(() => {
    onEligibilityChange(eligibility);
  }, [eligibility, onEligibilityChange]);

  const rosterByUserId = useMemo(
    () =>
      new Map((roster ?? []).map((entry) => [entry.schedule.workosUserId, entry])),
    [roster],
  );

  if (permissionsLoading || teammates === undefined) {
    return <WorkflowBookingAvailabilitySkeleton />;
  }
  if (!canReadAvailability) {
    return (
      <AvailabilityPermissionMessage onEligibilityChange={onEligibilityChange} />
    );
  }
  if (roster === undefined) return <WorkflowBookingAvailabilitySkeleton />;

  const handleToggle = async (
    teammate: WorkflowAvailabilityTeammate,
    enabled: boolean,
  ) => {
    await runWorkflowAvailabilityToggle({
      agentId,
      teammate,
      rosterByUserId,
      enabled,
      addUser,
      updateUser,
      setPending: (pending) => setPendingUserIds((current) => {
        const next = new Set(current);
        if (pending) next.add(teammate.workosUserId);
        else next.delete(teammate.workosUserId);
        return next;
      }),
      notify: {
        loading: (message) => toast.loading(message),
        success: (message, toastId) => toast.success(message, { id: toastId }),
        error: (message, toastId) => toast.error(message, { id: toastId }),
      },
    });
  };

  return (
    <WorkflowBookingAvailabilityList
      agentId={agentId}
      teammates={teammates}
      roster={roster}
      pendingUserIds={pendingUserIds}
      canManageAvailability={canManageAvailability}
      onToggle={(teammate, enabled) => void handleToggle(teammate, enabled)}
    />
  );
}

function AvailabilityPermissionMessage({
  onEligibilityChange,
}: Pick<AvailabilityDataProps, 'onEligibilityChange'>) {
  useEffect(() => {
    onEligibilityChange(false);
  }, [onEligibilityChange]);
  return (
    <p className="rounded-lg border border-border p-3 text-sm text-muted-foreground">
      You need Availability read permission to configure appointment booking.
    </p>
  );
}

function AvailabilityUnavailable({
  onEligibilityChange,
}: Pick<AvailabilityDataProps, 'onEligibilityChange'>) {
  useEffect(() => {
    onEligibilityChange(false);
  }, [onEligibilityChange]);
  return (
    <p className="rounded-lg border border-border p-3 text-sm text-muted-foreground">
      Availability is temporarily unavailable.
    </p>
  );
}

class AvailabilityErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function WorkflowBookingAvailabilitySection(props: AvailabilityDataProps) {
  return (
    <AvailabilityErrorBoundary
      key={props.agentId}
      fallback={<AvailabilityUnavailable onEligibilityChange={props.onEligibilityChange} />}
    >
      <WorkflowBookingAvailabilityData {...props} />
    </AvailabilityErrorBoundary>
  );
}
