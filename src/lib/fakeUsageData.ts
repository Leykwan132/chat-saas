export type UsageGroupBy = 'agent' | 'model';

export type UsageTimeRange = '7d' | '14d' | '30d' | '90d';

export type UsageMetric = 'cumulative' | 'daily';

export const USAGE_METRIC_OPTIONS: {
  value: UsageMetric;
  label: string;
}[] = [
  { value: 'cumulative', label: 'Cumulative' },
  { value: 'daily', label: 'Daily' },
];

export const USAGE_TIME_RANGE_OPTIONS: {
  value: UsageTimeRange;
  label: string;
  days: number;
}[] = [
  { value: '7d', label: 'Last 7 days', days: 7 },
  { value: '14d', label: 'Last 14 days', days: 14 },
  { value: '30d', label: 'Last 30 days', days: 30 },
  { value: '90d', label: 'Last 90 days', days: 90 },
];

const MAX_USAGE_DAYS = 90;

export type UsageSeries = {
  key: string;
  label: string;
  theme: {
    light: string;
    dark: string;
  };
};

export type UsageDayRow = {
  date: string;
  dateMs: number;
  [seriesKey: string]: number | string;
};

const FAKE_AGENTS: UsageSeries[] = [
  {
    key: 'support-bot',
    label: 'Support Bot',
    theme: {
      light: 'oklch(0.52 0.16 245)',
      dark: 'oklch(0.72 0.13 245)',
    },
  },
  {
    key: 'sales-assistant',
    label: 'Sales Assistant',
    theme: {
      light: 'oklch(0.50 0.14 155)',
      dark: 'oklch(0.70 0.12 155)',
    },
  },
  {
    key: 'onboarding-guide',
    label: 'Onboarding Guide',
    theme: {
      light: 'oklch(0.58 0.15 55)',
      dark: 'oklch(0.78 0.13 55)',
    },
  },
];

const FAKE_MODELS: UsageSeries[] = [
  {
    key: 'deepseek-v4-flash',
    label: 'DeepSeek V4 Flash',
    theme: {
      light: 'oklch(0.52 0.16 245)',
      dark: 'oklch(0.72 0.13 245)',
    },
  },
  {
    key: 'llama-3-3-70b',
    label: 'Meta Llama 3.3 70B',
    theme: {
      light: 'oklch(0.50 0.14 155)',
      dark: 'oklch(0.70 0.12 155)',
    },
  },
  {
    key: 'gpt-oss-120b',
    label: 'OpenAI GPT-OSS 120B',
    theme: {
      light: 'oklch(0.58 0.15 55)',
      dark: 'oklch(0.78 0.13 55)',
    },
  },
];

/** Base daily incremental credits per series (looped for longer ranges). */
const DAILY_INCREMENTS: Record<UsageGroupBy, number[][]> = {
  agent: [
    [12, 18, 24, 31, 28, 35, 42, 38, 45, 52, 48, 55, 61, 58],
    [0, 8, 14, 19, 22, 26, 30, 34, 38, 41, 44, 47, 50, 53],
    [0, 0, 5, 9, 12, 15, 18, 20, 22, 24, 26, 28, 30, 32],
  ],
  model: [
    [20, 28, 36, 44, 50, 58, 66, 72, 78, 84, 90, 96, 102, 108],
    [0, 10, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78, 84],
    [0, 0, 6, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72],
  ],
};

function getIncrement(groupBy: UsageGroupBy, seriesIndex: number, dayIndex: number): number {
  const pattern = DAILY_INCREMENTS[groupBy][seriesIndex];
  if (!pattern?.length) {
    return 0;
  }
  const base = pattern[dayIndex % pattern.length] ?? 0;
  const cycle = Math.floor(dayIndex / pattern.length);
  return Math.max(0, Math.round(base + cycle * (2 + seriesIndex)));
}

export const FAKE_MONTHLY_ALLOWANCE = 5_000;
export const FAKE_MONTHLY_CREDITS_REMAINING = 3_786;
export const FAKE_PURCHASED_CREDITS = 850;
export const FAKE_PURCHASED_CREDITS_GRANTED = 1_000;
export const FAKE_CREDITS_REMAINING =
  FAKE_MONTHLY_CREDITS_REMAINING + FAKE_PURCHASED_CREDITS;
export const FAKE_CREDITS_USED = FAKE_MONTHLY_ALLOWANCE - FAKE_MONTHLY_CREDITS_REMAINING;

function toUtcDateKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function buildDateRange(dayCount: number): { date: string; dateMs: number }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startMs = today.getTime() - (dayCount - 1) * 24 * 60 * 60 * 1000;

  return Array.from({ length: dayCount }, (_, index) => {
    const dateMs = startMs + index * 24 * 60 * 60 * 1000;
    return {
      date: toUtcDateKey(dateMs),
      dateMs,
    };
  });
}

function getSeriesForGroup(groupBy: UsageGroupBy): UsageSeries[] {
  return groupBy === 'agent' ? FAKE_AGENTS : FAKE_MODELS;
}

export function getUsageTimeRangeDays(timeRange: UsageTimeRange): number {
  return USAGE_TIME_RANGE_OPTIONS.find((option) => option.value === timeRange)?.days ?? 30;
}

export function buildFakeUsageChartData(
  groupBy: UsageGroupBy,
  timeRange: UsageTimeRange = '30d',
  metric: UsageMetric = 'cumulative',
): {
  series: UsageSeries[];
  rows: UsageDayRow[];
  totalUsed: number;
} {
  const series = getSeriesForGroup(groupBy);
  const visibleDays = getUsageTimeRangeDays(timeRange);
  const dates = buildDateRange(MAX_USAGE_DAYS);

  const cumulative = series.map(() => 0);
  const allRows: UsageDayRow[] = dates.map((day, dayIndex) => {
    const row: UsageDayRow = {
      date: day.date,
      dateMs: day.dateMs,
    };

    series.forEach((item, seriesIndex) => {
      const increment = getIncrement(groupBy, seriesIndex, dayIndex);
      if (metric === 'cumulative') {
        cumulative[seriesIndex] += increment;
        row[item.key] = cumulative[seriesIndex];
      } else {
        row[item.key] = increment;
      }
    });

    return row;
  });

  const rows = allRows.slice(-visibleDays);

  const totalUsed =
    metric === 'cumulative'
      ? series.reduce(
          (sum, item) => sum + ((rows.at(-1)?.[item.key] as number) ?? 0),
          0,
        )
      : rows.reduce(
          (sum, row) =>
            sum +
            series.reduce((seriesSum, item) => seriesSum + ((row[item.key] as number) ?? 0), 0),
          0,
        );

  return { series, rows, totalUsed };
}

export function getFakeBillingPeriodLabel(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}, ${now.getFullYear()}`;
}

export function getGroupByLabel(groupBy: UsageGroupBy): string {
  return groupBy === 'agent' ? 'agents' : 'models';
}

export function getUsageMetricLabel(metric: UsageMetric): string {
  return metric === 'cumulative' ? 'Cumulative credits' : 'Daily credits';
}

export function getUsageMetricDescription(metric: UsageMetric): string {
  return metric === 'cumulative'
    ? 'Cumulative credit usage per day'
    : 'Credits used per day';
}
