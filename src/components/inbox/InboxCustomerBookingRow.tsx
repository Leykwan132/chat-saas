import { BookingAccentBar } from '@/components/booking/BookingAccentBar';
import {
  BOOKING_CARD_INTERACTIVE_CLASS,
  BOOKING_CARD_SURFACE_CLASS,
} from '@/components/booking/bookingDetailsStyles';
import { formatCompactBookingSchedule } from '@/components/booking/formatCompactBookingSchedule';
import { BookingStatusTag } from '@/components/booking/BookingStatusTag';
import { appointmentBookingStatusAccentColor } from '@/lib/appointmentBookingStatusPresentation';
import { cn } from '@/lib/utils';
import type { CustomerBookingHistoryItem } from './customerBookingsModel';

export function InboxCustomerBookingRow({
  booking,
  onSelect,
}: {
  booking: CustomerBookingHistoryItem;
  onSelect: (booking: CustomerBookingHistoryItem) => void;
}) {
  const schedule = formatCompactBookingSchedule(
    booking.startAt,
    booking.endAt,
    booking.timeZone,
  );

  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-stretch gap-2.5 px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        BOOKING_CARD_SURFACE_CLASS,
        BOOKING_CARD_INTERACTIVE_CLASS,
      )}
      aria-label={`View ${booking.title} booking details`}
      onClick={() => onSelect(booking)}
    >
      <BookingAccentBar color={appointmentBookingStatusAccentColor(booking.status)} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex min-w-0 items-center gap-2">
          <span className="min-w-0 truncate text-xs font-medium text-foreground">{schedule}</span>
          <BookingStatusTag status={booking.status} />
        </span>
        <span className="truncate text-[11px] text-muted-foreground">{booking.title}</span>
      </span>
    </button>
  );
}
