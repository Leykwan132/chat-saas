import { startTransition, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { WeeklyAvailabilityEditor } from '@/components/WeeklyAvailabilityEditor';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DEFAULT_SCHEDULE_TIMEZONE,
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

type ScheduleAvailabilityEditorProps = {
  agentId: Id<'agents'>;
  workosUserId: string;
  onSaved?: () => void;
};

export function ScheduleAvailabilityEditor({
  agentId,
  workosUserId,
  onSaved,
}: ScheduleAvailabilityEditorProps) {
  const detail = useQuery(api.leadRouting.schedules.getForAgentUser, {
    agentId,
    workosUserId,
  });
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
  }, [agentId, workosUserId]);

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
  const hasChanges = useMemo(() => {
    if (!isContentReady) return false;
    if (timezoneDraft !== savedTimezone) return true;
    return !areScheduleShiftsEqual(draftsToShifts(shiftDrafts), detail?.shifts ?? []);
  }, [detail?.shifts, isContentReady, savedTimezone, shiftDrafts, timezoneDraft]);

  const ensureSchedule = async (): Promise<Id<'userSchedules'>> => {
    if (detail?.schedule) return detail.schedule._id;
    return await addUser({
      agentId,
      workosUserId,
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
      onSaved?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save availability');
    } finally {
      setSaving(false);
    }
  };

  if (detail === undefined || !isContentReady) {
    return <ScheduleAvailabilityEditorSkeleton />;
  }

  if (detail === null) {
    return <p className="text-sm text-muted-foreground">Team member not found.</p>;
  }

  return (
    <div className="space-y-4">
      <WeeklyAvailabilityEditor
        shiftDrafts={shiftDrafts}
        onShiftDraftsChange={setShiftDrafts}
        timezone={timezoneDraft}
        onTimezoneChange={setTimezoneDraft}
        timeOptions={SCHEDULE_TIME_OPTIONS}
      />

      {hasChanges ? (
        <div className="flex justify-end">
          <Button type="button" disabled={saving} onClick={() => void handleSave()}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function ScheduleAvailabilityEditorSkeleton() {
  return (
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
          <div className="flex items-center justify-between gap-4 pt-4">
            <div className="flex flex-col gap-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-64" />
            </div>
            <Skeleton className="h-5 w-9 rounded-full" />
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-2 self-start">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-9 w-56" />
      </div>
    </div>
  );
}
