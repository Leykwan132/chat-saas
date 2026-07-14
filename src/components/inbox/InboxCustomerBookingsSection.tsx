import { CalendarDays, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InboxCustomerBookingRow } from './InboxCustomerBookingRow';
import type { CustomerBookingHistoryItem } from './customerBookingsModel';

export function InboxCustomerBookingsSection({
  bookings,
  loading,
  open,
  onOpenChange,
  onSelect,
}: {
  bookings: CustomerBookingHistoryItem[];
  loading: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (booking: CustomerBookingHistoryItem) => void;
}) {
  return (
    <div className="flex flex-col">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-muted/40"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
      >
        <CalendarDays className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="text-sm font-semibold text-foreground">Bookings</span>
        {!loading ? (
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {bookings.length}
          </span>
        ) : null}
        <span className="flex-1" />
        <ChevronDown className={cn('size-4 text-muted-foreground transition-transform', !open && '-rotate-90')} />
      </button>
      {open ? (
        <div className="flex flex-col gap-3 px-4 pb-4 pt-2">
          {loading ? (
            <div className="flex flex-col gap-2 py-1" aria-label="Loading bookings">
              <div className="h-10 rounded-md bg-muted motion-safe:animate-pulse" />
              <div className="h-10 rounded-md bg-muted motion-safe:animate-pulse" />
            </div>
          ) : bookings.length === 0 ? (
            <p className="py-2 text-center text-xs text-muted-foreground">No bookings yet</p>
          ) : (
            <div className="flex flex-col gap-2">
              {bookings.map((booking) => (
                <InboxCustomerBookingRow key={booking.bookingId} booking={booking} onSelect={onSelect} />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
