import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BookingDetailsActionsBar,
  type BookingDetailsPanelActions,
} from './BookingDetailsActionsBar';
import { BookingAccentBar } from './BookingAccentBar';
import {
  BOOKED_CHECK_BG_CLASS,
  BOOKING_CARD_SURFACE_CLASS,
} from './bookingDetailsStyles';

export type { BookingDetailsPanelActions } from './BookingDetailsActionsBar';

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
  actions,
  compactLabel,
  compactStatus,
  accentColor,
  onOpenDetails,
  variant = 'panel',
  className,
}: {
  title: string;
  badge?: string;
  rows?: BookingDetailItem[];
  sections?: BookingDetailSection[];
  date?: string;
  timeRange?: string;
  actions?: BookingDetailsPanelActions;
  compactLabel?: string;
  compactStatus?: ReactNode;
  accentColor?: string;
  onOpenDetails?: () => void;
  variant?: 'panel' | 'compact' | 'inline';
  className?: string;
}) {
  const visibleRows = filterVisibleBookingRows(rows ?? []);
  const schedule = [date, timeRange].filter(Boolean).join(' • ');

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'flex w-full min-w-0 items-stretch gap-2.5 px-3 py-2.5',
          BOOKING_CARD_SURFACE_CLASS,
          className,
        )}
      >
        <BookingAccentBar color={accentColor} />
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="flex min-w-0 items-center gap-2">
              {schedule ? (
                onOpenDetails ? (
                  <button
                    type="button"
                    onClick={onOpenDetails}
                    className="min-w-0 truncate text-left text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`View ${title} booking details`}
                  >
                    {schedule}
                  </button>
                ) : (
                  <span className="min-w-0 truncate text-xs font-medium text-foreground">
                    {schedule}
                  </span>
                )
              ) : null}
              {compactStatus}
            </div>
            {onOpenDetails ? (
              <button
                type="button"
                onClick={onOpenDetails}
                className="truncate text-left text-[11px] text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={schedule ? undefined : `View ${title} booking details`}
              >
                {title}
              </button>
            ) : (
              <span className="truncate text-[11px] text-muted-foreground">{title}</span>
            )}
            {compactLabel ? (
              <span className="truncate text-[10px] text-muted-foreground/80">{compactLabel}</span>
            ) : null}
          </div>
          {actions ? <BookingDetailsActionsBar actions={actions} compact /> : null}
        </div>
      </div>
    );
  }

  const header = (
    <div className="flex gap-3">
      <BookedCheckIcon size="lg" className="mt-0.5" />
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

  return (
    <div
      className={cn(
        isInline
          ? 'relative overflow-hidden p-0 shadow-none'
          : cn('p-4', BOOKING_CARD_SURFACE_CLASS),
        className,
      )}
    >
      {header}
      {detailContent}
      {actions ? <BookingDetailsActionsBar actions={actions} /> : null}
    </div>
  );
}
