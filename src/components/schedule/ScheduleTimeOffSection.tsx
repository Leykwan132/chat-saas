import { useMemo, useState } from 'react';
import { useMutation } from 'convex/react';
import { CalendarOff, Trash2 } from 'lucide-react';
import { type DateRange } from 'react-day-picker';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import {
  calendarDaysForTimeOff,
  DEFAULT_SCHEDULE_TIMEZONE,
  endOfDay,
  formatDateRangePreview,
  formatTimeOffRange,
  startOfDay,
} from '@/lib/scheduleUtils';

type TimeOff = {
  _id: Id<'userTimeOff'>;
  startAt: number;
  endAt: number;
  label?: string;
};

type ScheduleTimeOffSectionProps = {
  agentId: Id<'agents'>;
  workosUserId: string;
  scheduleId?: Id<'userSchedules'>;
  timeOff: TimeOff[];
};

type TimeOffStep = 'pick' | 'review';

export function ScheduleTimeOffSection({
  agentId,
  workosUserId,
  scheduleId,
  timeOff,
}: ScheduleTimeOffSectionProps) {
  const addUser = useMutation(api.leadRouting.schedules.addUser);
  const addTimeOff = useMutation(api.leadRouting.schedules.addTimeOff);
  const removeTimeOff = useMutation(api.leadRouting.schedules.removeTimeOff);
  const [timeOffStep, setTimeOffStep] = useState<TimeOffStep>('pick');
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [timeOffRange, setTimeOffRange] = useState<DateRange | undefined>();
  const [timeOffNote, setTimeOffNote] = useState('');
  const [submittingTimeOff, setSubmittingTimeOff] = useState(false);
  const [removingTimeOffId, setRemovingTimeOffId] = useState<Id<'userTimeOff'> | null>(
    null,
  );
  const sortedTimeOff = useMemo(
    () => [...timeOff].sort((a, b) => a.startAt - b.startAt),
    [timeOff],
  );
  const bookedTimeOffDays = useMemo(() => calendarDaysForTimeOff(timeOff), [timeOff]);

  const closeTimeOffSheet = () => {
    setIsRequestOpen(false);
    setTimeOffStep('pick');
    setTimeOffRange(undefined);
    setTimeOffNote('');
  };

  const ensureSchedule = async (): Promise<Id<'userSchedules'>> => {
    if (scheduleId) return scheduleId;
    return await addUser({
      agentId,
      workosUserId,
      timezone: DEFAULT_SCHEDULE_TIMEZONE,
    });
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

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">Time off</h2>
        <Button type="button" variant="outline" onClick={() => setIsRequestOpen(true)}>
          <CalendarOff className="size-4" />
          Request time off
        </Button>
      </div>

      {sortedTimeOff.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center">
          <p className="text-sm text-muted-foreground">No time off scheduled.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {sortedTimeOff.map((entry) => (
            <li key={entry._id} className="flex items-start justify-between gap-3 p-4">
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

      <Sheet
        open={isRequestOpen}
        onOpenChange={(open) => {
          if (!open) closeTimeOffSheet();
          else setIsRequestOpen(true);
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-md" showCloseButton={false}>
          <SheetHeader>
            <SheetTitle>{timeOffStep === 'pick' ? 'Request time off' : 'Review time off'}</SheetTitle>
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
                    modifiersClassNames={{ booked: 'bg-muted/80 text-muted-foreground' }}
                  />
                  <p className="text-sm text-muted-foreground">
                    {formatDateRangePreview(timeOffRange) ?? 'Choose a single day or date range.'}
                  </p>
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
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Dates</p>
                  <p className="mt-1 text-sm text-foreground">
                    {formatDateRangePreview(timeOffRange) ?? '—'}
                  </p>
                </div>
                {timeOffNote.trim() ? (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Note</p>
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
    </section>
  );
}
