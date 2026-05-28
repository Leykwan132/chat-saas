import { startTransition, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { useMutation, useQuery } from 'convex/react';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { WeeklyAvailabilityEditor } from '@/components/WeeklyAvailabilityEditor';
import { usePermissions } from '@/hooks/usePermissions';
import { Permission } from '../../shared/permissions';
import {
  DEFAULT_SCHEDULE_TIMEZONE,
  normalizeScheduleShifts,
  resolveScheduleTimezone,
  SCHEDULE_TIME_OPTIONS,
} from '@/lib/scheduleUtils';
import {
  areScheduleShiftsEqual,
  draftsToShifts,
  getInitialShiftsFromDetail,
  shiftsToDrafts,
  type ShiftDraft,
} from '@/lib/scheduleShiftDrafts';

export default function ScheduleUserAvailabilityPage() {
  const { agentId, workosUserId: workosUserIdParam } = useParams();
  const navigate = useNavigate();
  const typedAgentId = agentId as Id<'agents'> | undefined;
  const decodedWorkosUserId = workosUserIdParam
    ? decodeURIComponent(workosUserIdParam)
    : undefined;

  const { can, isLoading: permissionsLoading } = usePermissions();
  const canReadSchedule = can(Permission.SCHEDULE_READ);
  const canManage = can(Permission.ROUTING_MANAGE);

  const currentUser = useQuery(api.users.currentUser);

  const detail = useQuery(
    api.leadRouting.schedules.getForAgentUser,
    typedAgentId && decodedWorkosUserId
      ? { agentId: typedAgentId, workosUserId: decodedWorkosUserId }
      : 'skip',
  );
  const addUser = useMutation(api.leadRouting.schedules.addUser);
  const updateUser = useMutation(api.leadRouting.schedules.updateUser);
  const setShifts = useMutation(api.leadRouting.schedules.setShifts);

  const [shiftDrafts, setShiftDrafts] = useState<ShiftDraft[]>([]);
  const [timezoneDraft, setTimezoneDraft] = useState(DEFAULT_SCHEDULE_TIMEZONE);
  const [saving, setSaving] = useState(false);
  const [isContentReady, setIsContentReady] = useState(false);

  useEffect(() => {
    setIsContentReady(false);
    setShiftDrafts([]);
    setTimezoneDraft(DEFAULT_SCHEDULE_TIMEZONE);
  }, [typedAgentId, decodedWorkosUserId]);

  useLayoutEffect(() => {
    if (detail === undefined) return;
    if (detail === null) {
      startTransition(() => setIsContentReady(true));
      return;
    }

    setShiftDrafts(shiftsToDrafts(getInitialShiftsFromDetail(detail)));
    setTimezoneDraft(resolveScheduleTimezone(detail.schedule?.timezone));
    startTransition(() => setIsContentReady(true));
  }, [detail]);

  const savedTimezone = resolveScheduleTimezone(detail?.schedule?.timezone);
  const savedShifts = normalizeScheduleShifts(detail?.shifts ?? []);

  const hasChanges = useMemo(() => {
    if (!isContentReady) return false;
    if (timezoneDraft !== savedTimezone) return true;
    return !areScheduleShiftsEqual(draftsToShifts(shiftDrafts), savedShifts);
  }, [isContentReady, timezoneDraft, savedTimezone, shiftDrafts, savedShifts]);

  const detailPath =
    typedAgentId && decodedWorkosUserId
      ? `/dashboard/${typedAgentId}/schedule/${encodeURIComponent(decodedWorkosUserId)}`
      : null;

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
      timezone: timezoneDraft,
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const userScheduleId = await ensureSchedule();
      await setShifts({
        userScheduleId,
        shifts: draftsToShifts(shiftDrafts),
      });
      await updateUser({
        userScheduleId,
        timezone: timezoneDraft,
      });
      toast.success('Available hours saved');
      if (detailPath) {
        navigate(detailPath);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save availability');
    } finally {
      setSaving(false);
    }
  };

  if (!typedAgentId || !decodedWorkosUserId) return null;

  const isOwnSchedule =
    currentUser ? decodedWorkosUserId === currentUser.workosUserId : false;
  const canEditAvailability = canManage || isOwnSchedule;

  if (!permissionsLoading && !canReadSchedule) {
    return <Navigate to={`/dashboard/${typedAgentId}`} replace />;
  }

  if (
    !permissionsLoading &&
    currentUser !== undefined &&
    !canEditAvailability
  ) {
    return (
      <Navigate
        to={`/dashboard/${typedAgentId}/schedule/${encodeURIComponent(decodedWorkosUserId)}`}
        replace
      />
    );
  }

  const showSkeleton =
    permissionsLoading || detail === undefined || (detail !== null && !isContentReady);

  if (showSkeleton) {
    return <ScheduleUserAvailabilitySkeleton detailPath={detailPath} />;
  }

  if (detail === null || !detailPath) {
    return (
      <div className="flex w-full max-w-3xl flex-col gap-4">
        <Link
          to={`/dashboard/${typedAgentId}/schedule`}
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>
        <p className="text-sm text-muted-foreground">Team member not found.</p>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <Link
        to={detailPath}
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back
      </Link>

      <div className="flex flex-col gap-4">
        <h1 className="m-0 text-3xl font-semibold tracking-tight text-foreground">
          Available hours
        </h1>

        <WeeklyAvailabilityEditor
          shiftDrafts={shiftDrafts}
          onShiftDraftsChange={setShiftDrafts}
          timezone={timezoneDraft}
          onTimezoneChange={setTimezoneDraft}
          timeOptions={SCHEDULE_TIME_OPTIONS}
        />
      </div>

      {hasChanges ? (
        <div className="flex justify-end">
          <Button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function ScheduleUserAvailabilitySkeleton({
  detailPath,
}: {
  detailPath: string | null;
}) {
  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      {detailPath ? (
        <Link
          to={detailPath}
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>
      ) : (
        <Skeleton className="h-4 w-16" />
      )}

      <div className="flex flex-col gap-4">
        <Skeleton className="h-9 w-52" />

        <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1 rounded-xl border border-border bg-card p-6">
          <div className="divide-y divide-border">
            {Array.from({ length: 7 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <Skeleton className="size-5 shrink-0 rounded-full" />
                <Skeleton className="h-6 w-28" />
                <Skeleton className="h-8 w-[6.75rem]" />
                <Skeleton className="h-4 w-2" />
                <Skeleton className="h-8 w-[6.75rem]" />
              </div>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 self-start rounded-xl border border-border bg-card p-6">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-9 w-56" />
        </div>
        </div>
      </div>
    </div>
  );
}
