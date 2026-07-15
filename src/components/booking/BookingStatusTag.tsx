import type { MouseEvent } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  appointmentBookingStatusAccentColor,
  appointmentBookingStatusClass,
  appointmentBookingStatusLabel,
  type AppointmentBookingDisplayStatus,
} from '@/lib/appointmentBookingStatusPresentation';
import { cn } from '@/lib/utils';

function StatusIndicator({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="size-1.5 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
    />
  );
}

export function BookingStatusTag({
  status,
  onClick,
}: {
  status: AppointmentBookingDisplayStatus;
  onClick?: () => void;
}) {
  const label = appointmentBookingStatusLabel(status);
  const accentColor = appointmentBookingStatusAccentColor(status);
  const className = cn(
    'h-auto gap-1.5 px-2.5 py-1 text-[10px] leading-none',
    appointmentBookingStatusClass(status),
  );

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onClick?.();
  };

  if (onClick) {
    return (
      <Badge asChild variant="outline" className={className}>
        <button type="button" onClick={handleClick} aria-label={`Edit booking status: ${label}`}>
          <StatusIndicator color={accentColor} />
          {label}
        </button>
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className={className}>
      <StatusIndicator color={accentColor} />
      {label}
    </Badge>
  );
}
