import { format } from 'date-fns';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

type CalendarDayHeaderProps = {
  selectedDate: Date;
  isToday: boolean;
  canManageCalendar: boolean;
  onCreateBooking: () => void;
};

export function CalendarDayHeader({
  selectedDate,
  isToday,
  canManageCalendar,
  onCreateBooking,
}: CalendarDayHeaderProps) {
  return (
    <div className="flex w-full min-w-0 items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-2">
        {isToday ? (
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-sm font-semibold text-red-500">Today</h2>
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
              {format(selectedDate, 'd')}
            </span>
          </div>
        ) : (
          <h2 className="truncate text-sm font-semibold text-foreground">
            {format(selectedDate, 'EEEE, MMM d')}
          </h2>
        )}
      </div>
      {canManageCalendar ? (
        <Button type="button" variant="default" size="sm" onClick={onCreateBooking}>
          <Plus data-icon="inline-start" />
          New Booking
        </Button>
      ) : null}
    </div>
  );
}
