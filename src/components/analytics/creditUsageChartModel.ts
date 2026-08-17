import type { ChartConfig } from '@/components/ui/chart';

export type CreditTimeRange = '1d' | '7d' | '30d' | '90d' | 'period';
export type CreditMetric = 'daily' | 'cumulative';

export const TIME_RANGE_OPTIONS: Array<{ value: CreditTimeRange; label: string }> = [
  { value: 'period', label: 'Billing period' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
];

export const METRIC_OPTIONS: Array<{ value: CreditMetric; label: string }> = [
  { value: 'daily', label: 'Daily' },
  { value: 'cumulative', label: 'Cumulative' },
];

export function formatPeriodLabel(startMs: number, endMs: number, timeZone?: string) {
  const start = new Date(startMs);
  const end = new Date(endMs);
  const formatter = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone,
  });
  return `${formatter.format(start)} – ${formatter.format(end)}`;
}

function parseDateKey(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatTooltipDateLabel(date: string) {
  return parseDateKey(date).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateLabel(date: string) {
  return parseDateKey(date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function buildModelChartConfig(
  series: Array<{ key: string; label: string; color: string }>,
): ChartConfig {
  return Object.fromEntries(
    series.map((item) => [
      item.key,
      {
        label: item.label,
        color: item.color,
      },
    ]),
  );
}

export function buildModelChartRows(
  daily: Array<Record<string, number | string>>,
  seriesKeys: string[],
  metric: CreditMetric,
) {
  if (metric === 'daily') {
    return daily.map((row) => ({
      ...row,
      dateLabel: formatDateLabel(String(row.date)),
    }));
  }

  const runningTotals = Object.fromEntries(seriesKeys.map((key) => [key, 0]));

  return daily.map((row) => {
    const nextRow: Record<string, number | string> = {
      date: row.date,
      dateLabel: formatDateLabel(String(row.date)),
    };

    for (const key of seriesKeys) {
      runningTotals[key] += (row[key] as number | undefined) ?? 0;
      nextRow[key] = runningTotals[key];
    }

    return nextRow;
  });
}
