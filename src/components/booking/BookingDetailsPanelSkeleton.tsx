import { Skeleton } from '@/components/ui/skeleton';
import { BOOKING_CARD_SURFACE_CLASS } from '@/components/booking/bookingDetailsStyles';
import { cn } from '@/lib/utils';

function BookingDetailSectionSkeleton({ rowCount }: { rowCount: number }) {
  return (
    <div className="flex flex-col gap-2.5">
      <Skeleton className="h-3 w-24 rounded-md" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: rowCount }, (_, index) => (
          <div key={index} className="flex items-start gap-3">
            <Skeleton className="mt-0.5 size-4 shrink-0 rounded-md" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Skeleton className="h-3 w-16 rounded-md" />
              <Skeleton className="h-4 w-4/5 max-w-xs rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BookingDetailsPanelSkeleton({
  variant = 'inline',
  className,
}: {
  variant?: 'panel' | 'compact' | 'inline';
  className?: string;
}) {
  if (variant === 'compact') {
    return (
      <div className={cn('relative min-w-0 overflow-hidden px-3 py-2.5', BOOKING_CARD_SURFACE_CLASS, className)}>
        <div className="flex min-w-0 flex-col gap-1">
          <Skeleton className="h-3.5 w-3/5 rounded-md" />
          <Skeleton className="h-3 w-2/5 rounded-md" />
          <Skeleton className="h-2.5 w-16 rounded-md" />
        </div>
      </div>
    );
  }

  const isInline = variant === 'inline';

  return (
    <div className={cn('relative overflow-hidden', isInline ? 'p-0 shadow-none' : cn(BOOKING_CARD_SURFACE_CLASS, 'p-4'), className)}>
      <div className="flex gap-3">
        <Skeleton className="size-6 shrink-0 rounded-full" />
        <Skeleton className="h-5 w-40 max-w-full rounded-md" />
      </div>
      <div className="mt-4 flex flex-col gap-4">
        <BookingDetailSectionSkeleton rowCount={4} />
        <BookingDetailSectionSkeleton rowCount={2} />
        <BookingDetailSectionSkeleton rowCount={1} />
      </div>
    </div>
  );
}
