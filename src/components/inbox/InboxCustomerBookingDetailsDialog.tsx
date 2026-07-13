import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { BOOKING_CARD_RADIUS_CLASS } from '@/components/booking/bookingDetailsStyles';
import { cn } from '@/lib/utils';
import { InboxBookingDetailsCard } from './InboxBookingDetailsCard';
import type { CustomerBookingHistoryItem } from './customerBookingsModel';

export function InboxCustomerBookingDetailsDialog({
  booking,
  open,
  onOpenChange,
  canManage,
  agentId,
}: {
  booking: CustomerBookingHistoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManage: boolean;
  agentId?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          'max-h-[85vh] gap-0 overflow-y-auto border-0 bg-transparent p-0 shadow-none ring-0 sm:max-w-sm',
          BOOKING_CARD_RADIUS_CLASS,
        )}
        onInteractOutside={(event) => {
          const target = event.target as HTMLElement | null;
          if (
            target?.closest('[data-slot="dialog-content"]') ||
            (document.querySelectorAll('[data-slot="dialog-overlay"]').length > 1 &&
              target?.closest('[data-slot="dialog-overlay"]'))
          ) {
            event.preventDefault();
          }
        }}
      >
        <DialogTitle className="sr-only">Booking details</DialogTitle>
        {booking ? (
          <InboxBookingDetailsCard
            booking={{
              ...booking,
              service: {
                name: booking.service.name,
                fields: booking.service.fields ?? [],
              },
            }}
            canManage={canManage}
            agentId={agentId}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
