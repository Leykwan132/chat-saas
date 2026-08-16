import type { ReactNode } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { formatTooltipDateLabel } from '@/components/analytics/creditUsageChartModel';

export type OverviewChartMode =
  | 'aiAssistedConversations'
  | 'credits'
  | 'bookings'
  | 'humanEscalations';

export type OverviewTrendRow = {
  date: string;
  dateLabel: string;
  aiAssistedConversations: number;
  credits: number;
  bookings: number;
  humanEscalations: number;
};

const CHART_HEIGHT = 400;

const CHART_CONFIG = {
  aiAssistedConversations: {
    label: 'AI conversations',
    color: 'var(--chart-3)',
  },
  credits: { label: 'Total credits spent', color: 'var(--primary)' },
  bookings: { label: 'Booked appointments', color: 'var(--muted-foreground)' },
  humanEscalations: { label: 'Human escalation', color: 'var(--chart-5)' },
} satisfies ChartConfig;

const CHART_LABELS: Record<OverviewChartMode, string> = {
  aiAssistedConversations: 'AI conversations',
  credits: 'Total credits spent',
  bookings: 'Booked appointments',
  humanEscalations: 'Human escalation',
};

function getModeLabel(mode: OverviewChartMode) {
  return CHART_LABELS[mode];
}

function formatNumber(value: number) {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: value % 1 === 0 ? 0 : 1,
    notation: value >= 10000 ? 'compact' : 'standard',
  }).format(value);
}

function formatAxisValue(value: number) {
  return formatNumber(value);
}

function formatTooltipValue(value: number | null, mode: OverviewChartMode) {
  if (value === null || !Number.isFinite(value)) return '—';
  const formatted = formatNumber(value);
  if (mode === 'credits') {
    return `${formatted} credits`;
  }
  if (mode === 'aiAssistedConversations') {
    return `${formatted} conversation${value === 1 ? '' : 's'}`;
  }
  if (mode === 'humanEscalations') {
    return `${formatted} escalation${value === 1 ? '' : 's'}`;
  }
  return formatted;
}

function hasModeData(rows: OverviewTrendRow[], mode: OverviewChartMode) {
  return rows.some((row) => row[mode] > 0);
}

export function AgentOverviewTrendChart({
  rows,
  mode,
  actions,
}: {
  rows: OverviewTrendRow[];
  mode: OverviewChartMode;
  actions?: ReactNode;
}) {
  const hasData = hasModeData(rows, mode);
  const selectedLabel = getModeLabel(mode);

  return (
    <Card className="rounded-lg py-0 shadow-none ring-1 ring-border/70">
      <CardHeader className="flex flex-col gap-3 px-5 pt-5 pb-0 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-lg font-semibold">{selectedLabel}</CardTitle>
        {actions}
      </CardHeader>
      <CardContent className="px-5 pt-0 pb-6">
        {!hasData ? (
          <div
            className="flex items-center justify-center text-sm text-muted-foreground"
            style={{ height: CHART_HEIGHT }}
          >
            No activity recorded for this period.
          </div>
        ) : (
          <ChartContainer
            config={CHART_CONFIG}
            className="aspect-auto w-full"
            style={{ height: CHART_HEIGHT }}
          >
            <AreaChart
              accessibilityLayer
              data={rows}
              margin={{ left: 6, right: 14, top: 12, bottom: 6 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="dateLabel"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={28}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={50}
                allowDecimals={false}
                tickFormatter={(value) => formatAxisValue(Number(value))}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    className="w-[220px]"
                    indicator="dot"
                    labelFormatter={(_, payload) => {
                      const date = payload?.[0]?.payload?.date as string | undefined;
                      return date ? formatTooltipDateLabel(date) : '';
                    }}
                    formatter={(value) =>
                      formatTooltipValue(
                        value === null ? null : Number(value),
                        mode,
                      )
                    }
                  />
                }
              />
              <Area
                dataKey={mode}
                type="monotone"
                stroke={`var(--color-${mode})`}
                fill={`var(--color-${mode})`}
                fillOpacity={0.08}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function AgentOverviewTrendChartSkeleton() {
  return <Skeleton className="h-[510px] rounded-lg" />;
}
