import type { ReactNode } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScheduleTimeCombobox } from '@/components/ScheduleTimeCombobox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { TimeZoneSelect } from '@/components/TimeZoneSelect';
import { cn } from '@/lib/utils';
import {
  DEFAULT_SHIFT_END_MINUTES,
  DEFAULT_SHIFT_START_MINUTES,
  MINUTES_PER_DAY,
  SCHEDULE_DAYS,
  SCHEDULE_TIMEZONE_OPTIONS,
  type ScheduleShift,
} from '@/lib/scheduleUtils';
import {
  createAllDayShiftDrafts,
  createStandardShiftDrafts,
  isFullWeekAllDay,
  type ShiftDraft,
} from '@/lib/scheduleShiftDrafts';

export type { ShiftDraft } from '@/lib/scheduleShiftDrafts';

type TimeOption = { value: string; label: string };

function endTimeOptionsForStart(
  timeOptions: TimeOption[],
  startMinutes: number,
): TimeOption[] {
  return timeOptions.filter((option) => Number(option.value) > startMinutes);
}

function createDefaultShiftDraft(dayOfWeek: number, drafts: ShiftDraft[]): ShiftDraft {
  const existingKeys = new Set(drafts.map((shift) => shift.key));
  let sequence = 0;
  let key = `shift-${dayOfWeek}-${DEFAULT_SHIFT_START_MINUTES}-${DEFAULT_SHIFT_END_MINUTES}-${sequence}`;
  while (existingKeys.has(key)) {
    sequence += 1;
    key = `shift-${dayOfWeek}-${DEFAULT_SHIFT_START_MINUTES}-${DEFAULT_SHIFT_END_MINUTES}-${sequence}`;
  }
  return {
    key,
    dayOfWeek,
    startMinutes: DEFAULT_SHIFT_START_MINUTES,
    endMinutes: DEFAULT_SHIFT_END_MINUTES,
  };
}

function TimeSlotRow({
  shift,
  timeOptions,
  onUpdate,
  onRemove,
  showRemove,
  showAdd,
  onAdd,
}: {
  shift: ShiftDraft;
  timeOptions: TimeOption[];
  onUpdate: (patch: Partial<Pick<ScheduleShift, 'startMinutes' | 'endMinutes'>>) => void;
  onRemove: () => void;
  showRemove: boolean;
  showAdd: boolean;
  onAdd: () => void;
}) {
  const endOptions = endTimeOptionsForStart(timeOptions, shift.startMinutes);
  const dayLabel = SCHEDULE_DAYS[shift.dayOfWeek]!.label;

  return (
    <div className="flex items-center gap-1.5">
      <ScheduleTimeCombobox
        value={shift.startMinutes}
        options={timeOptions.filter((option) => Number(option.value) < MINUTES_PER_DAY)}
        maxValue={MINUTES_PER_DAY - 1}
        ariaLabel={`${dayLabel} start time`}
        onChange={(startMinutes) => {
          const endMinutes =
            shift.endMinutes <= startMinutes
              ? Math.min(startMinutes + 15, MINUTES_PER_DAY - 15)
              : shift.endMinutes;
          onUpdate({ startMinutes, endMinutes });
        }}
      />
      <span className="text-sm text-muted-foreground">-</span>
      <ScheduleTimeCombobox value={shift.endMinutes} options={endOptions} maxValue={MINUTES_PER_DAY} ariaLabel={`${dayLabel} end time`} onChange={(endMinutes) => onUpdate({ endMinutes })} />
      {showRemove ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0"
          onClick={onRemove}
          aria-label="Remove time slot"
        >
          <Trash2 className="size-4 text-muted-foreground" />
        </Button>
      ) : null}
      {showAdd ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0"
          onClick={onAdd}
          aria-label="Add time slot"
        >
          <Plus className="size-4 text-muted-foreground" />
        </Button>
      ) : null}
    </div>
  );
}

export function WeeklyAvailabilityEditor({
  shiftDrafts,
  onShiftDraftsChange,
  timezone,
  onTimezoneChange,
  timeOptions,
  footer,
}: {
  shiftDrafts: ShiftDraft[];
  onShiftDraftsChange: (drafts: ShiftDraft[]) => void;
  timezone: string;
  onTimezoneChange: (timezone: string) => void;
  timeOptions: TimeOption[];
  footer?: ReactNode;
}) {
  const available24x7 = isFullWeekAllDay(shiftDrafts);

  const setAvailable24x7 = (available: boolean) => {
    onShiftDraftsChange(
      available ? createAllDayShiftDrafts() : createStandardShiftDrafts(),
    );
  };

  const setDayAvailable = (dayOfWeek: number, available: boolean) => {
    onShiftDraftsChange(
      available
        ? [
            ...shiftDrafts.filter((shift) => shift.dayOfWeek !== dayOfWeek),
            createDefaultShiftDraft(dayOfWeek, shiftDrafts),
          ]
        : shiftDrafts.filter((shift) => shift.dayOfWeek !== dayOfWeek),
    );
  };

  const addShiftToDay = (dayOfWeek: number) => {
    onShiftDraftsChange([
      ...shiftDrafts,
      createDefaultShiftDraft(dayOfWeek, shiftDrafts),
    ]);
  };

  const removeShift = (key: string) => {
    onShiftDraftsChange(shiftDrafts.filter((shift) => shift.key !== key));
  };

  const updateShift = (
    key: string,
    patch: Partial<Pick<ScheduleShift, 'startMinutes' | 'endMinutes'>>,
  ) => {
    onShiftDraftsChange(
      shiftDrafts.map((shift) => (shift.key === key ? { ...shift, ...patch } : shift)),
    );
  };

  return (
    <div className="flex items-start gap-4">
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="divide-y divide-border">
        {SCHEDULE_DAYS.map((day) => {
          const dayDrafts = shiftDrafts
            .filter((shift) => shift.dayOfWeek === day.dayOfWeek)
            .sort((a, b) => a.startMinutes - b.startMinutes);
          const isAvailable = dayDrafts.length > 0;
          const hasMultipleSlots = dayDrafts.length > 1;

          return (
            <div
              key={day.dayOfWeek}
              className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="flex shrink-0 items-center gap-2">
                <Switch
                  checked={isAvailable}
                  disabled={available24x7}
                  onCheckedChange={(checked) => setDayAvailable(day.dayOfWeek, checked)}
                  aria-label={`${day.label} available`}
                />
                <span
                  className={cn(
                    'w-[7.5rem] text-base font-medium',
                    isAvailable ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {day.label}
                </span>
              </div>

              {available24x7 ? (
                <span className="py-1.5 text-sm font-medium text-foreground">24 hours</span>
              ) : isAvailable ? (
                <div className="flex min-w-0 flex-col gap-4">
                  {dayDrafts.map((shift, index) => (
                    <TimeSlotRow
                      key={shift.key}
                      shift={shift}
                      timeOptions={timeOptions}
                      onUpdate={(patch) => updateShift(shift.key, patch)}
                      onRemove={() => removeShift(shift.key)}
                      showRemove={hasMultipleSlots}
                      showAdd={index === 0}
                      onAdd={() => addShiftToDay(day.dayOfWeek)}
                    />
                  ))}
                </div>
              ) : (
                <span className="py-1.5 text-sm text-muted-foreground">Unavailable</span>
              )}
            </div>
          );
        })}
          <div className="flex items-center justify-between gap-4 pt-4">
            <div className="flex min-w-0 flex-col gap-1">
              <Label htmlFor="available-24x7" className="text-sm font-medium">
                Available 24/7
              </Label>
              <p className="text-xs text-muted-foreground">
                Set availability to 24 hours for all seven days.
              </p>
            </div>
            <Switch
              id="available-24x7"
              checked={available24x7}
              onCheckedChange={setAvailable24x7}
              aria-label="Available 24/7"
            />
          </div>
        </div>
        {footer ? (
          <div
            data-slot="availability-footer"
            className="flex justify-end border-t border-border pt-4"
          >
            {footer}
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-col gap-2 self-start">
        <Label htmlFor="schedule-timezone" className="text-sm font-medium">
          Timezone
        </Label>
        <TimeZoneSelect
          value={timezone}
          options={SCHEDULE_TIMEZONE_OPTIONS}
          onChange={onTimezoneChange}
          triggerId="schedule-timezone"
          triggerClassName="w-fit border-input bg-background"
        />
      </div>
    </div>
  );
}
