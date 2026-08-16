import type * as React from 'react';
import { Check, Clock, X } from 'lucide-react';
import { Link } from 'react-router';
import { CalendarDatePickerField } from '@/components/calendar/CalendarDatePickerField';
import { EditableTimeCombobox } from '@/components/EditableTimeCombobox';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export type ManualBookingScheduleFeedback =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'available' }
  | { kind: 'invalid' | 'conflict'; message: string };

export function ManualBookingAvailabilityFeedback({
  feedback,
  availabilityHref,
}: {
  feedback: ManualBookingScheduleFeedback;
  availabilityHref?: string;
}) {
  if (feedback.kind === 'checking') {
    return <p className="text-xs text-muted-foreground">Checking availability…</p>;
  }
  if (feedback.kind === 'available') {
    return (
      <p className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
        <Check className="size-3.5 shrink-0" aria-hidden="true" />
        Slot is available.
      </p>
    );
  }
  if (feedback.kind === 'invalid') {
    return (
      <p className="flex items-center gap-1.5 text-xs text-destructive">
        <X className="size-3.5 shrink-0" aria-hidden="true" />
        {feedback.message}
      </p>
    );
  }
  if (feedback.kind === 'conflict') {
    return (
      <div className="flex w-full items-center justify-between gap-3 text-xs text-destructive">
        <p className="flex min-w-0 items-center gap-1.5">
          <X className="size-3.5 shrink-0" aria-hidden="true" />
          {feedback.message}
        </p>
        {availabilityHref ? (
          <Button asChild variant="linkAccent" size="sm" className="h-auto shrink-0 p-0 text-xs">
            <Link to={availabilityHref}>Change availability</Link>
          </Button>
        ) : null}
      </div>
    );
  }
  return null;
}

export function ManualBookingScheduleField({
  date,
  startTime,
  endTime,
  feedback,
  availabilityHref,
  portalContainer,
  onDateChange,
  onStartTimeChange,
  onEndTimeChange,
}: {
  date: string;
  startTime: string;
  endTime: string;
  feedback: ManualBookingScheduleFeedback;
  availabilityHref?: string;
  portalContainer?: React.RefObject<HTMLElement | null>;
  onDateChange: (value: string) => void;
  onStartTimeChange: (value: string) => void;
  onEndTimeChange: (value: string) => void;
}) {
  const invalid = feedback.kind === 'invalid';

  return (
    <div className="grid gap-3">
      <Label>Date & time</Label>
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
          contentAlign="start"
        />
        <span className="text-muted-foreground" aria-hidden="true">–</span>
        <EditableTimeCombobox
          value={endTime}
          onChange={onEndTimeChange}
          ariaLabel="End time"
          invalid={invalid}
          portalContainer={portalContainer}
          contentAlign="end"
        />
      </div>
      <ManualBookingAvailabilityFeedback
        feedback={feedback}
        availabilityHref={availabilityHref}
      />
    </div>
  );
}
