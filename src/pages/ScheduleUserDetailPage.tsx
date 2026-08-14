import { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { useMutation, useQuery } from 'convex/react';
import { ArrowLeft, CalendarOff, ChevronRight, Globe, Trash2 } from 'lucide-react';
import { type DateRange } from 'react-day-picker';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { usePermissions } from '@/hooks/usePermissions';
import { Permission } from '../../shared/permissions';
import { cn } from '@/lib/utils';
import { formatTimeZoneDisplayLabel } from '@/lib/calendarTimeUtils';
import {
  calendarDaysForTimeOff,
  DEFAULT_SCHEDULE_TIMEZONE,
  resolveScheduleTimezone,
  describeWeeklyAvailabilityLines,
  endOfDay,
  formatDateRangePreview,
  formatTimeOffRange,
  isCurrentlyOnTimeOff,
  memberLabel,
  SCHEDULE_TIMEZONE_OPTIONS,
  shiftsForDisplay,
  startOfDay,
} from '@/lib/scheduleUtils';

type TimeOffStep = 'pick' | 'review';

export default function ScheduleUserDetailPage() {
  const { agentId, workosUserId: workosUserIdParam } = useParams();
  const typedAgentId = agentId as Id<'agents'> | undefined;
  const decodedWorkosUserId = workosUserIdParam
    ? decodeURIComponent(workosUserIdParam)
    : undefined;

  const { can, isLoading: permissionsLoading } = usePermissions();
  const canReadSchedule = can(Permission.AVAILABILITY_READ);
  const canManage = can(Permission.ROUTING_MANAGE);

  const detail = useQuery(
    api.leadRouting.schedules.getForAgentUser,
    typedAgentId && decodedWorkosUserId
      ? { agentId: typedAgentId, workosUserId: decodedWorkosUserId }
      : 'skip',
  );
  const currentUser = useQuery(api.users.currentUser);

  const addUser = useMutation(api.leadRouting.schedules.addUser);
  const updateUser = useMutation(api.leadRouting.schedules.updateUser);
  const addTimeOff = useMutation(api.leadRouting.schedules.addTimeOff);
  const removeTimeOff = useMutation(api.leadRouting.schedules.removeTimeOff);

  const [timeOffSheetOpen, setTimeOffSheetOpen] = useState(false);
  const [timeOffStep, setTimeOffStep] = useState<TimeOffStep>('pick');
  const [timeOffRange, setTimeOffRange] = useState<DateRange | undefined>();
  const [timeOffNote, setTimeOffNote] = useState('');
  const [submittingTimeOff, setSubmittingTimeOff] = useState(false);
  const [removingTimeOffId, setRemovingTimeOffId] = useState<Id<'userTimeOff'> | null>(
    null,
  );
  const scheduleEnabled = detail?.schedule?.enabled ?? false;
  const timeOff = useMemo(() => detail?.timeOff ?? [], [detail?.timeOff]);
  const isTimeOff = isCurrentlyOnTimeOff(timeOff);
  const isActive = scheduleEnabled && !isTimeOff;
  const statusLabel = !scheduleEnabled ? 'Inactive' : isTimeOff ? 'Away' : 'Active';

  const availabilityLines = useMemo(
    () => describeWeeklyAvailabilityLines(shiftsForDisplay(detail?.shifts ?? [])),
    [detail?.shifts],
  );

  const timezoneLabel = useMemo(() => {
    const value = resolveScheduleTimezone(detail?.schedule?.timezone);
    return (
      SCHEDULE_TIMEZONE_OPTIONS.find((option) => option.value === value)?.label
      ?? formatTimeZoneDisplayLabel(value)
    );
  }, [detail?.schedule?.timezone]);

  const sortedTimeOff = useMemo(
    () => [...timeOff].sort((a, b) => a.startAt - b.startAt),
    [timeOff],
  );

  const bookedTimeOffDays = useMemo(() => calendarDaysForTimeOff(timeOff), [timeOff]);

  const displayName = detail
    ? memberLabel(detail.user) +
      (currentUser?.workosUserId === detail.user.workosUserId ? ' (You)' : '')
    : '';

  const ensureSchedule = async (): Promise<Id<'userSchedules'>> => {
    if (!typedAgentId || !decodedWorkosUserId) {
      throw new Error('Missing schedule context');
    }
    if (detail?.schedule) {
      return detail.schedule._id;
    }
    return await addUser({
      agentId: typedAgentId,
      workosUserId: decodedWorkosUserId,
      timezone: DEFAULT_SCHEDULE_TIMEZONE,
    });
  };

  const openTimeOffSheet = () => {
    setTimeOffStep('pick');
    setTimeOffRange(undefined);
    setTimeOffNote('');
    setTimeOffSheetOpen(true);
  };

  const closeTimeOffSheet = () => {
    setTimeOffSheetOpen(false);
    setTimeOffStep('pick');
    setTimeOffRange(undefined);
    setTimeOffNote('');
  };

  const handleToggleEnabled = async (enabled: boolean) => {
    const toastId = toast.loading(enabled ? 'Turning on availability…' : 'Turning off availability…');
    try {
      const userScheduleId = await ensureSchedule();
      await updateUser({ userScheduleId, enabled });
      toast.success(enabled ? 'Availability turned on' : 'Availability turned off', {
        id: toastId,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed', {
        id: toastId,
      });
    }
  };

  const handleRemoveTimeOff = async (timeOffId: Id<'userTimeOff'>) => {
    setRemovingTimeOffId(timeOffId);
    try {
      await removeTimeOff({ timeOffId });
      toast.success('Time off removed');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not remove time off');
    } finally {
      setRemovingTimeOffId(null);
    }
  };

  const handleConfirmTimeOff = async () => {
    if (!timeOffRange?.from) return;
    setSubmittingTimeOff(true);
    try {
      const userScheduleId = await ensureSchedule();
      const startAt = startOfDay(timeOffRange.from).getTime();
      const endAt = endOfDay(timeOffRange.to ?? timeOffRange.from).getTime();
      await addTimeOff({
        userScheduleId,
        startAt,
        endAt,
        label: timeOffNote.trim() || undefined,
      });
      toast.success('Time off added');
      closeTimeOffSheet();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not add time off');
    } finally {
      setSubmittingTimeOff(false);
    }
  };

  if (!typedAgentId || !decodedWorkosUserId) return null;

  if (!permissionsLoading && !canReadSchedule) {
    return <Navigate to={`/dashboard/${typedAgentId}`} replace />;
  }

  const isLoading = permissionsLoading || detail === undefined || currentUser === undefined;

  const isOwnProfile =
    currentUser ? decodedWorkosUserId === currentUser.workosUserId : false;
  const canEditAvailability = canManage || isOwnProfile;

  if (!permissionsLoading && currentUser !== undefined && !canManage && !isOwnProfile) {
    return <Navigate to={`/dashboard/${typedAgentId}/availability`} replace />;
  }

  if (isLoading) {
    return (
      <ScheduleUserDetailSkeleton
        showAvailabilityLink={canEditAvailability}
        showStatusSection={canManage}
      />
    );
  }

  if (detail === null) {
    return (
      <div className="flex w-full max-w-3xl flex-col gap-4">
        <Link
          to={`/dashboard/${typedAgentId}/availability`}
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>
        <p className="text-sm text-muted-foreground">Team member not found.</p>
      </div>
    );
  }

  const schedulePath = `/dashboard/${typedAgentId}/availability`;
  const availabilityPath = `/dashboard/${typedAgentId}/availability/${encodeURIComponent(decodedWorkosUserId)}/edit`;

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-4">
        <Link
          to={schedulePath}
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back 
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="text-[12px]">
                {detail.user.role === 'owner'
                  ? 'Owner'
                  : detail.user.role === 'admin'
                    ? 'Admin'
                    : 'Member'}
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
              <h1 className="m-0 font-title text-3xl font-normal tracking-tight text-foreground">
                {displayName}
              </h1>
              <p className="text-sm text-muted-foreground">{detail.user.email}</p>
            </div>
          </div>

          <Button type="button" size="lg" className="shrink-0 px-5" onClick={openTimeOffSheet}>
            <CalendarOff className="size-4" />
            Request time off
          </Button>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Availability</h2>
        {canEditAvailability ? (
          <Link
            to={availabilityPath}
            prefetch="intent"
            className={cn(
              'flex w-full cursor-pointer items-start justify-between gap-4 rounded-xl border border-border bg-card p-4 text-left transition-colors',
              'hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            )}
          >
            <AvailabilitySummary lines={availabilityLines} timezoneLabel={timezoneLabel} />
            <ChevronRight className="size-4 shrink-0 text-muted-foreground m-2" />
          </Link>
        ) : (
          <div className="rounded-xl border border-border bg-card p-4">
            <AvailabilitySummary lines={availabilityLines} timezoneLabel={timezoneLabel} />
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Time off</h2>

        {sortedTimeOff.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center">
            <p className="text-sm text-muted-foreground">No time off scheduled.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {sortedTimeOff.map((entry) => (
              <li
                key={entry._id}
                className="flex items-start justify-between gap-3 p-4"
              >
                <div className="min-w-0 space-y-1.5">
                  <p className="text-base font-semibold text-foreground">
                    {formatTimeOffRange(entry.startAt, entry.endAt)}
                  </p>
                  {entry.label ? (
                    <p className="text-sm text-muted-foreground">{entry.label}</p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={removingTimeOffId === entry._id}
                  onClick={() => void handleRemoveTimeOff(entry._id)}
                  aria-label="Remove time off"
                >
                  <Trash2 className="size-4 text-muted-foreground" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

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

      <Sheet
        open={timeOffSheetOpen}
        onOpenChange={(open) => {
          if (!open) closeTimeOffSheet();
          else setTimeOffSheetOpen(true);
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-md" showCloseButton={false}>
          <SheetHeader>
            <SheetTitle>
              {timeOffStep === 'pick' ? 'Request time off' : 'Review time off'}
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {timeOffStep === 'pick' ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Select dates</Label>
                  <Calendar
                    mode="range"
                    selected={timeOffRange}
                    onSelect={setTimeOffRange}
                    numberOfMonths={1}
                    disabled={{ before: startOfDay(new Date()) }}
                    modifiers={{ booked: bookedTimeOffDays }}
                    modifiersClassNames={{
                      booked: 'bg-muted/80 text-muted-foreground',
                    }}
                  />
                  {formatDateRangePreview(timeOffRange) ? (
                    <p className="text-sm text-muted-foreground">
                      {formatDateRangePreview(timeOffRange)}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Choose a single day or date range.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time-off-note">Note (optional)</Label>
                  <Textarea
                    id="time-off-note"
                    value={timeOffNote}
                    onChange={(e) => setTimeOffNote(e.target.value)}
                    placeholder="e.g. Annual leave"
                    rows={3}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Dates
                  </p>
                  <p className="mt-1 text-sm text-foreground">
                    {formatDateRangePreview(timeOffRange) ?? '—'}
                  </p>
                </div>
                {timeOffNote.trim() ? (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Note
                    </p>
                    <p className="mt-1 text-sm text-foreground">{timeOffNote.trim()}</p>
                  </div>
                ) : null}
                <p className="text-sm text-muted-foreground">
                  You will not receive leads during this period.
                </p>
              </div>
            )}
          </div>

          <SheetFooter className="border-t border-border">
            {timeOffStep === 'pick' ? (
              <>
                <Button type="button" variant="outline" onClick={closeTimeOffSheet}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={!timeOffRange?.from}
                  onClick={() => setTimeOffStep('review')}
                >
                  Continue
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={() => setTimeOffStep('pick')}>
                  Back
                </Button>
                <Button
                  type="button"
                  disabled={submittingTimeOff}
                  onClick={() => void handleConfirmTimeOff()}
                >
                  {submittingTimeOff ? 'Confirming…' : 'Confirm'}
                </Button>
              </>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>
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

function ScheduleUserDetailSkeleton({
  showAvailabilityLink,
  showStatusSection,
}: {
  showAvailabilityLink: boolean;
  showStatusSection: boolean;
}) {
  return (
    <div className="flex w-full max-w-3xl flex-col gap-8">
      <div className="space-y-4">
        <Skeleton className="h-4 w-32" />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex gap-2">
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="space-y-2.5">
              <Skeleton className="h-9 w-48" />
              <Skeleton className="h-4 w-56" />
            </div>
          </div>
          <Skeleton className="h-9 w-36" />
        </div>
      </div>

      <div className="space-y-3">
        <Skeleton className="h-6 w-28" />
        <Skeleton
          className={cn(
            'w-full rounded-xl',
            showAvailabilityLink ? 'h-24' : 'h-20',
          )}
        />
      </div>

      <div className="space-y-3">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>

      {showStatusSection ? (
        <div className="space-y-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      ) : null}
    </div>
  );
}
