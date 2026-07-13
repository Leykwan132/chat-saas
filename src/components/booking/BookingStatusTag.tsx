import type { MouseEvent } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  appointmentBookingStatusClass,
  appointmentBookingStatusLabel,
  type AppointmentBookingDisplayStatus,
} from '@/lib/appointmentBookingStatusPresentation';
import { cn } from '@/lib/utils';

export function BookingStatusTag({
  status,
  onClick,
}: {
  status: AppointmentBookingDisplayStatus;
  onClick?: () => void;
}) {
  const label = appointmentBookingStatusLabel(status);
  const className = cn(
    'h-auto border-0 px-2.5 py-1 text-[10px] leading-none',
    appointmentBookingStatusClass(status),
  );

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onClick?.();
  };

  if (onClick) {
    return (
      <Badge asChild className={className}>
        <button type="button" onClick={handleClick} aria-label={`Edit booking status: ${label}`}>
          {label}
        </button>
      </Badge>
    );
  }

  return <Badge className={className}>{label}</Badge>;
}
