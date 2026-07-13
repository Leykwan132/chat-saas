import { cn } from '@/lib/utils';
import {
  BOOKING_ACCENT_BAR_CLASS,
  BOOKING_CARD_ACCENT_COLOR,
} from './bookingDetailsStyles';

export function BookingAccentBar({
  color = BOOKING_CARD_ACCENT_COLOR,
  className,
}: {
  color?: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(BOOKING_ACCENT_BAR_CLASS, className)}
      style={{ backgroundColor: color }}
    />
  );
}
