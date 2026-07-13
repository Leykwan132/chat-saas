import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type BookingDetailsPanelActions = {
  onAddRemarks?: () => void;
  onMarkCompleted?: () => void;
  onEditBooking?: () => void;
  addRemarksLabel?: string;
  editBookingLabel?: string;
  disableAddRemarks?: boolean;
  disableMarkCompleted?: boolean;
  disableEditBooking?: boolean;
};

export function BookingDetailsActionsBar({
  actions,
  compact = false,
}: {
  actions: BookingDetailsPanelActions;
  compact?: boolean;
}) {
  if (!actions.onAddRemarks && !actions.onMarkCompleted && !actions.onEditBooking) {
    return null;
  }

  const buttonClassName = compact ? undefined : 'w-full';
  const buttonSize = compact ? 'sm' : 'default';

  return (
    <div className={cn('flex gap-2', compact ? 'shrink-0 flex-row flex-wrap justify-end' : 'mt-4 flex-col')}>
      {actions.onAddRemarks ? (
        <Button
          type="button"
          size={buttonSize}
          className={buttonClassName}
          disabled={actions.disableAddRemarks}
          onClick={actions.onAddRemarks}
        >
          {actions.addRemarksLabel ?? 'Add remarks'}
        </Button>
      ) : null}
      {actions.onMarkCompleted ? (
        <Button
          type="button"
          size={buttonSize}
          className={buttonClassName}
          disabled={actions.disableMarkCompleted}
          onClick={actions.onMarkCompleted}
        >
          Mark as completed
        </Button>
      ) : null}
      {actions.onEditBooking ? (
        <Button
          type="button"
          variant="outline"
          size={buttonSize}
          className={buttonClassName}
          disabled={actions.disableEditBooking}
          onClick={actions.onEditBooking}
        >
          {actions.editBookingLabel ?? 'Edit booking'}
        </Button>
      ) : null}
    </div>
  );
}
