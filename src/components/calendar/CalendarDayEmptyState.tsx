import { Calendar as CalendarIcon, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

type CalendarDayEmptyStateProps = {
  canManageCalendar: boolean;
  onCreateBooking: () => void;
};

export function CalendarDayEmptyState({
  canManageCalendar,
  onCreateBooking,
}: CalendarDayEmptyStateProps) {
  return (
    <Empty className="h-full border-0 p-4">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CalendarIcon />
        </EmptyMedia>
        <EmptyTitle>No events</EmptyTitle>
        <EmptyDescription>Nothing scheduled for this day yet.</EmptyDescription>
      </EmptyHeader>
      {canManageCalendar ? (
        <EmptyContent>
          <Button type="button" variant="default" size="sm" onClick={onCreateBooking}>
            <Plus data-icon="inline-start" />
            New Booking
          </Button>
        </EmptyContent>
      ) : null}
    </Empty>
  );
}
