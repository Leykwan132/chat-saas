import type * as React from 'react';
import { Check, Clock, X } from 'lucide-react';
import { CalendarDatePickerField } from '@/components/calendar/CalendarDatePickerField';
import { EditableTimeCombobox } from '@/components/EditableTimeCombobox';
import { Label } from '@/components/ui/label';

export type ManualBookingScheduleFeedback =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'available' }
  | { kind: 'invalid' | 'conflict'; message: string };

export function ManualBookingScheduleField({
  date,
  startTime,
  endTime,
  feedback,
  portalContainer,
  onDateChange,
  onStartTimeChange,
  onEndTimeChange,
}: {
  date: string;
  startTime: string;
  endTime: string;
  feedback: ManualBookingScheduleFeedback;
  portalContainer?: React.RefObject<HTMLElement | null>;
  onDateChange: (value: string) => void;
  onStartTimeChange: (value: string) => void;
  onEndTimeChange: (value: string) => void;
}) {
  const invalid = feedback.kind === 'invalid';

  return (
    <div className="grid gap-3">
      <Label>Schedule</Label>
      <div className="grid grid-cols-[auto_minmax(0,1.45fr)_minmax(8rem,0.9fr)_auto_minmax(8rem,0.9fr)] items-center gap-3">
        <Clock className="size-4 text-muted-foreground" aria-hidden="true" />
        <CalendarDatePickerField
          value={date}
          onChange={onDateChange}
          showLabel={false}
          displayFormat="EEEE, d MMMM"
        />
        <EditableTimeCombobox
          value={startTime}
          onChange={onStartTimeChange}
          ariaLabel="Start time"
          invalid={invalid}
          portalContainer={portalContainer}
        />
        <span className="text-muted-foreground" aria-hidden="true">–</span>
        <EditableTimeCombobox
          value={endTime}
          onChange={onEndTimeChange}
          ariaLabel="End time"
          invalid={invalid}
          portalContainer={portalContainer}
        />
      </div>
      {feedback.kind === 'checking' ? (
        <p className="text-xs text-muted-foreground">Checking availability…</p>
      ) : feedback.kind === 'available' ? (
        <p className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
          <Check className="size-3.5 shrink-0" aria-hidden="true" />
          Slot is available.
        </p>
      ) : feedback.kind === 'invalid' || feedback.kind === 'conflict' ? (
        <p className="flex items-center gap-1.5 text-xs text-destructive">
          <X className="size-3.5 shrink-0" aria-hidden="true" />
          {feedback.message}
        </p>
      ) : null}
    </div>
  );
}
