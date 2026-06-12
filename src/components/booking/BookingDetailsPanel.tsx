import type { LucideIcon } from 'lucide-react';
import { Check } from 'lucide-react';
import { ShineBorder } from '@/components/ui/shine-border';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const BOOKING_SHINE_COLORS = ['#059669', '#10B981', '#34D399'] as const;
export const BOOKED_CHECK_BG_CLASS = 'bg-emerald-500';

export function BookedCheckIcon({
  className,
  size = 'md',
}: {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}) {
  const circleClass =
    size === 'xs'
      ? 'size-3'
      : size === 'sm'
        ? 'size-4'
        : size === 'md'
          ? 'size-5'
          : 'size-6';
  const checkClass =
    size === 'xs'
      ? 'size-2'
      : size === 'sm'
        ? 'size-2.5'
        : size === 'md'
          ? 'size-2.5'
          : 'size-3.5';

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full',
        BOOKED_CHECK_BG_CLASS,
        className,
        circleClass,
      )}
      aria-hidden
    >
      <Check
        className={cn('text-white', checkClass)}
        strokeWidth={size === 'xs' || size === 'sm' ? 4 : 4}
      />
    </div>
  );
}

export function BookedListLabel() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200/80 bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 shadow-none dark:border-zinc-700/60 dark:bg-zinc-800/80 dark:text-zinc-400">
      <BookedCheckIcon size="xs" />
      <span className="max-w-[70px] truncate" title="Booked">
        Booked
      </span>
    </span>
  );
}

export type BookingDetailItem = {
  label: string;
  value: string;
  icon?: LucideIcon;
};

export type BookingDetailSection = {
  title: string;
  rows: BookingDetailItem[];
};

export type BookingDetailsPanelActions = {
  onAddRemarks?: () => void;
  onEditBooking?: () => void;
  addRemarksLabel?: string;
  disableAddRemarks?: boolean;
  disableEditBooking?: boolean;
};

function BookingDetailsActionsBar({
  actions,
  compact = false,
}: {
  actions: BookingDetailsPanelActions;
  compact?: boolean;
}) {
  if (!actions.onAddRemarks && !actions.onEditBooking) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex gap-2',
        compact ? 'mt-3 flex-row justify-end' : 'mt-4 flex-col',
      )}
    >
      {actions.onAddRemarks ? (
        <Button
          type="button"
          size={compact ? 'sm' : 'default'}
          className={compact ? undefined : 'w-full'}
          disabled={actions.disableAddRemarks}
          onClick={actions.onAddRemarks}
        >
          {actions.addRemarksLabel ?? 'Add remarks'}
        </Button>
      ) : null}
      {actions.onEditBooking ? (
        <Button
          type="button"
          variant="secondary"
          size={compact ? 'sm' : 'default'}
          className={compact ? undefined : 'w-full'}
          disabled={actions.disableEditBooking}
          onClick={actions.onEditBooking}
        >
          Edit booking
        </Button>
      ) : null}
    </div>
  );
}

function filterVisibleBookingRows(rows: BookingDetailItem[]) {
  return rows.filter((row) => row.value !== '—' && row.value.trim().length > 0);
}

function BookingDetailSectionGroup({ title, rows }: BookingDetailSection) {
  const visibleRows = filterVisibleBookingRows(rows);
  if (visibleRows.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-xs font-semibold text-muted-foreground">{title}</p>
      <div className="flex flex-col gap-3">
        {visibleRows.map((row) => (
          <BookingDetailRow
            key={`${title}-${row.label}-${row.value}`}
            label={row.label}
            value={row.value}
            icon={row.icon}
          />
        ))}
      </div>
    </div>
  );
}

export function formatCollectedFieldValue(
  value: string | number | boolean | null | undefined,
) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

export function BookingDetailRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex items-start gap-3">
      {Icon ? (
        <Icon
          className="mt-0.5 size-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
      ) : (
        <span className="size-4 shrink-0" aria-hidden />
      )}
      <div className="min-w-0 flex-1">
        <span className="sr-only">{label}</span>
        {value.startsWith('http://') || value.startsWith('https://') ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm leading-relaxed text-primary break-all hover:underline"
          >
            {value}
          </a>
        ) : (
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words text-foreground">{value}</p>
        )}
      </div>
    </div>
  );
}

export function BookingDetailsPanel({
  title,
  badge,
  rows,
  sections,
  date,
  timeRange,
  shineColors,
  checkIconClassName,
  actions,
  variant = 'panel',
  className,
}: {
  title: string;
  badge?: string;
  rows?: BookingDetailItem[];
  sections?: BookingDetailSection[];
  date?: string;
  timeRange?: string;
  shineColors?: readonly string[];
  checkIconClassName?: string;
  actions?: BookingDetailsPanelActions;
  variant?: 'panel' | 'compact' | 'inline';
  className?: string;
}) {
  const visibleRows = filterVisibleBookingRows(rows ?? []);
  const schedule = [date, timeRange].filter(Boolean).join(' • ');

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'relative min-w-0 rounded-lg border border-border bg-muted/40 p-3 shadow-none',
          className,
        )}
      >
        {shineColors ? <ShineBorder shineColor={[...shineColors]} /> : null}
        <div className="flex min-w-0 items-center gap-3">
          <BookedCheckIcon size="md" className={cn('shrink-0', checkIconClassName)} />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="truncate text-sm font-semibold text-foreground">{title}</p>
            {schedule ? (
              <p className="truncate text-xs text-muted-foreground">{schedule}</p>
            ) : null}
          </div>
          {actions?.onEditBooking ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="shrink-0"
              disabled={actions.disableEditBooking}
              onClick={actions.onEditBooking}
            >
              Edit booking
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  const header = (
    <div className="flex gap-3">
      <BookedCheckIcon size="lg" className={cn('mt-0.5', checkIconClassName)} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold leading-snug text-foreground">{title}</h3>
          {badge ? (
            <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {badge}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );

  const detailContent =
    sections && sections.length > 0 ? (
      <div className="mt-4 flex flex-col gap-4">
        {sections.map((section) => (
          <BookingDetailSectionGroup key={section.title} {...section} />
        ))}
      </div>
    ) : visibleRows.length > 0 ? (
      <div className="mt-4 flex flex-col gap-3">
        {visibleRows.map((row) => (
          <BookingDetailRow
            key={`${row.label}-${row.value}`}
            label={row.label}
            value={row.value}
            icon={row.icon}
          />
        ))}
      </div>
    ) : null;

  const isInline = variant === 'inline';
  const useContainer = Boolean(actions);

  const panelBody = (
    <>
      {header}
      {detailContent}
      {actions ? <BookingDetailsActionsBar actions={actions} /> : null}
    </>
  );

  if (useContainer) {
    return (
      <div
        className={cn(
          'relative overflow-hidden rounded-lg border border-border bg-muted/40 p-4 shadow-none',
          className,
        )}
      >
        <ShineBorder shineColor={[...BOOKING_SHINE_COLORS]} />
        {panelBody}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden shadow-none',
        isInline ? 'p-0' : 'rounded-lg border border-border bg-muted/40 p-4',
        className,
      )}
    >
      {!isInline && shineColors ? <ShineBorder shineColor={[...shineColors]} /> : null}
      {panelBody}
    </div>
  );
}

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
      <div
        className={cn(
          'relative min-w-0 rounded-lg border border-border bg-muted/40 p-3 shadow-none',
          className,
        )}
      >
        <div className="flex min-w-0 gap-3">
          <Skeleton className="size-5 shrink-0 rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-3/5 rounded-md" />
            <Skeleton className="h-3 w-2/5 rounded-md" />
          </div>
        </div>
      </div>
    );
  }

  const isInline = variant === 'inline';

  return (
    <div
      className={cn(
        'relative overflow-hidden shadow-none',
        isInline ? 'p-0' : 'rounded-lg border border-border bg-muted/40 p-4',
        className,
      )}
    >
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
