import { useMemo, useState, Fragment, type CSSProperties, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, BarChart2, ChevronRight } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { cn } from '@/lib/utils';
import { formatOrgRoleLabel } from '../../../shared/teamRoleCatalog';
import {
  pricingSectionBorderClass,
  pricingTableShellClass,
} from '@/components/pricing/pricingStyles';
import {
  CUSTOMER_SENTIMENTS,
  CUSTOMER_SENTIMENT_CHART_COLORS,
  CUSTOMER_SENTIMENT_LABELS,
  hasCustomerSentimentData,
  type CustomerSentiment,
  type CustomerSentimentCounts,
} from '../../../shared/customerSentiment';
import {
  CONVERSATION_CHANNEL_CHART_COLORS,
  CONVERSATION_CHANNEL_LABELS,
} from '../../../shared/channelColors';

export const analyticsEmptyStateClass =
  'px-8 py-10 text-center text-base text-muted-foreground/80';

export const ANALYTICS_CHART_SHELL_HEIGHT_CLASS = 'h-[420px]';
export const ANALYTICS_CHART_BODY_HEIGHT = 364;

export const ANALYTICS_CHART_TITLE_CLASS =
  'text-xl font-semibold tracking-tight text-foreground';

export const TOPIC_MAP_HEADER_SPACE = 56;
export const TOPIC_MAP_ROW_HEIGHT = 56;
export const TOPIC_MAP_BOTTOM_SPACE = 20;
export const TOPIC_MAP_EXPAND_ACTION_GAP = 20;
export const TOPIC_MAP_EXPAND_BUTTON_HEIGHT = 32;

export function getTopicMapShellHeight(
  rowCount: number,
  options?: { includeExpandAction?: boolean },
) {
  if (rowCount === 0) {
    return 420;
  }

  return (
    TOPIC_MAP_HEADER_SPACE +
    rowCount * TOPIC_MAP_ROW_HEIGHT +
    TOPIC_MAP_BOTTOM_SPACE +
    (options?.includeExpandAction
      ? TOPIC_MAP_EXPAND_ACTION_GAP + TOPIC_MAP_EXPAND_BUTTON_HEIGHT
      : 0)
  );
}

export const ANALYTICS_CHART_COLORS = {
  channels: CONVERSATION_CHANNEL_CHART_COLORS,
  bar: 'var(--foreground)',
} as const;

export const TOPIC_BAR_OPACITY_GRADIENT = {
  min: 0.18,
  max: 1,
} as const;

function opacityByRank(
  index: number,
  total: number,
  minOpacity: number,
  maxOpacity: number,
) {
  if (total <= 1) {
    return maxOpacity;
  }

  const position = 1 - index / (total - 1);
  return minOpacity + position * (maxOpacity - minOpacity);
}

const CHANNEL_TREND_CHART_CONFIG = {
  whatsapp: { label: CONVERSATION_CHANNEL_LABELS.whatsapp, color: ANALYTICS_CHART_COLORS.channels.whatsapp },
  instagram: { label: CONVERSATION_CHANNEL_LABELS.instagram, color: ANALYTICS_CHART_COLORS.channels.instagram },
  messenger: { label: CONVERSATION_CHANNEL_LABELS.messenger, color: ANALYTICS_CHART_COLORS.channels.messenger },
} satisfies ChartConfig;

function formatAnalyticsMonthLabel(label: string) {
  const parts = label.split(' ');
  if (parts.length === 2) {
    return `${parts[0]!.slice(0, 3)} '${parts[1]!.slice(-2)}`;
  }
  return label;
}

const DROP_OFF_RATE_CHART_CONFIG = {
  dropOffRate: { label: 'Drop-off rate', color: ANALYTICS_CHART_COLORS.bar },
} satisfies ChartConfig;

function formatAnalyticsRate(value: number) {
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
}

function dropOffRateYAxisMax(dataMax: number) {
  if (!Number.isFinite(dataMax) || dataMax <= 0) {
    return 25;
  }
  return Math.min(100, Math.max(25, Math.ceil((dataMax * 1.15) / 25) * 25));
}

export function AnalyticsDropOffRateLineChart({
  rows,
  className,
}: {
  rows: Array<{
    month: string;
    dropOffRate: number;
    droppedCount?: number;
    conversationCount?: number;
  }>;
  className?: string;
}) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <ChartContainer
      config={DROP_OFF_RATE_CHART_CONFIG}
      className={cn('aspect-auto h-full w-full', className)}
    >
      <LineChart
        accessibilityLayer
        data={rows}
        margin={{ left: 0, right: 20, top: 4, bottom: 4 }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          interval={0}
          padding={{ left: 16, right: 16 }}
          tick={{ textAnchor: 'middle', fontSize: 11 }}
          tickFormatter={(value) => formatAnalyticsMonthLabel(String(value))}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={40}
          allowDecimals={false}
          domain={[0, dropOffRateYAxisMax]}
          tickCount={5}
          tickFormatter={(value) => formatAnalyticsRate(Number(value))}
        />
        <ChartTooltip
          cursor={{ stroke: 'var(--border)', strokeWidth: 1 }}
          content={
            <ChartTooltipContent
              className={analyticsChartTooltipClass}
              indicator="line"
              labelFormatter={(value) => String(value)}
              formatter={(value) => formatAnalyticsRate(Number(value))}
            />
          }
        />
        <Line
          dataKey="dropOffRate"
          type="monotone"
          stroke="var(--color-dropOffRate)"
          strokeWidth={2}
          dot={{ fill: 'var(--color-dropOffRate)', r: 3.5, strokeWidth: 0 }}
          activeDot={{ r: 4.5, strokeWidth: 0 }}
        />
      </LineChart>
    </ChartContainer>
  );
}

export function AnalyticsCustomersByChannelChart({
  rows,
  className,
}: {
  rows: Array<Record<string, string | number>>;
  className?: string;
}) {
  return (
    <ChartContainer
      config={CHANNEL_TREND_CHART_CONFIG}
      className={cn('aspect-auto h-full w-full', className)}
    >
      <BarChart
        accessibilityLayer
        data={rows}
        margin={{ left: 0, right: 8, top: 12, bottom: 0 }}
        barCategoryGap="24%"
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tickMargin={10}
          interval={0}
          tick={{ textAnchor: 'middle' }}
          tickFormatter={(value) => formatAnalyticsMonthLabel(String(value))}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={44}
          allowDecimals={false}
          tickFormatter={(value) => Number(value).toLocaleString()}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              className={analyticsChartTooltipClass}
              indicator="dot"
              labelFormatter={(value) => String(value)}
            />
          }
        />
        <Bar
          dataKey="whatsapp"
          stackId="channels"
          fill="var(--color-whatsapp)"
          maxBarSize={28}
        />
        <Bar
          dataKey="instagram"
          stackId="channels"
          fill="var(--color-instagram)"
          maxBarSize={28}
        />
        <Bar
          dataKey="messenger"
          stackId="channels"
          fill="var(--color-messenger)"
          maxBarSize={28}
          radius={[4, 4, 0, 0]}
        />
        <ChartLegend
          verticalAlign="bottom"
          align="center"
          content={<ChartLegendContent />}
        />
      </BarChart>
    </ChartContainer>
  );
}

function formatMemberAxisLabel(name: string) {
  const [firstName] = name.split(' ');
  if (firstName && firstName.length <= 12) {
    return firstName;
  }

  return name.length > 10 ? `${name.slice(0, 9)}…` : name;
}

const analyticsChartTooltipClass =
  'w-auto min-w-0 items-center px-3 py-2 text-center';

export const ANALYTICS_VERTICAL_BAR_MAX_SIZE = 28;

export function AnalyticsVerticalBarChart({
  data,
  barColor = ANALYTICS_CHART_COLORS.bar,
  className,
  tooltipLabel = 'Assigned leads',
  formatValue,
  allowDecimals = false,
}: {
  data: Array<{ key?: string; label: string; value: number; detail?: string }>;
  barColor?: string;
  className?: string;
  tooltipLabel?: string;
  formatValue?: (value: number) => string;
  allowDecimals?: boolean;
}) {
  const chartConfig = {
    value: {
      label: tooltipLabel,
      color: barColor,
    },
  } satisfies ChartConfig;

  const formatTick = (value: number) =>
    formatValue ? formatValue(value) : Number(value).toLocaleString();

  const rows = data.map((row, index) => ({
    key: row.key ?? `row-${index}`,
    label: row.label,
    value: row.value,
    detail: row.detail,
  }));

  return (
    <ChartContainer
      config={chartConfig}
      className={cn('aspect-auto h-full w-full', className)}
    >
      <BarChart
        accessibilityLayer
        data={rows}
        margin={{ left: 0, right: 8, top: 28, bottom: 0 }}
        barCategoryGap="28%"
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={10}
          interval={0}
          tick={{ textAnchor: 'middle', fontSize: 11 }}
          tickFormatter={(value) => formatMemberAxisLabel(String(value))}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={48}
          allowDecimals={allowDecimals}
          tickFormatter={(value) => formatTick(Number(value))}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              className={analyticsChartTooltipClass}
              hideIndicator
              labelClassName="text-center"
              labelFormatter={(value) => String(value)}
              formatter={(value, _name, item) => {
                const detail = (item?.payload as { detail?: string } | undefined)?.detail;

                return (
                  <div className="flex w-full flex-col items-center gap-0.5 text-center text-xs">
                    <span className="font-medium text-foreground">
                      {formatTick(Number(value))}
                    </span>
                    {detail ? (
                      <span className="text-muted-foreground">{detail}</span>
                    ) : null}
                  </div>
                );
              }}
            />
          }
        />
        <Bar
          dataKey="value"
          fill="var(--color-value)"
          maxBarSize={ANALYTICS_VERTICAL_BAR_MAX_SIZE}
          radius={[4, 4, 0, 0]}
        >
          <LabelList
            dataKey="value"
            position="top"
            offset={8}
            formatter={(value) => formatTick(Number(value))}
            style={{
              fill: 'var(--color-muted-foreground)',
              fontSize: 11,
              fontWeight: 500,
            }}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

export type AnalyticsHorizontalBarDatum = {
  key?: string;
  label: string;
  value: number;
  displayValue?: string;
  detail?: string;
};

type AnalyticsHorizontalBarChartProps = {
  data: AnalyticsHorizontalBarDatum[];
  barColor?: string;
  opacityGradient?: { min: number; max: number };
  labelWidth?: number;
  align?: 'center' | 'start';
  gapClass?: string;
  barHeightClass?: string;
  barRadiusClass?: string;
  textClassName?: string;
  rowTooltip?: (row: AnalyticsHorizontalBarDatum) => ReactNode;
};

export function AnalyticsHorizontalBarChart({
  data,
  barColor = ANALYTICS_CHART_COLORS.bar,
  opacityGradient,
  labelWidth = 112,
  align = 'center',
  gapClass = 'gap-4',
  barHeightClass = 'h-5',
  barRadiusClass = 'rounded-md',
  textClassName = 'text-sm',
  rowTooltip,
}: AnalyticsHorizontalBarChartProps) {
  const maxValue = Math.max(...data.map((row) => row.value), 1);

  return (
    <div
      className={cn(
        'flex flex-col px-4',
        gapClass,
        align === 'center' && 'h-full justify-center',
        align === 'start' && 'justify-start',
      )}
    >
      {data.map((row, index) => {
        const widthPct = Math.max((row.value / maxValue) * 100, row.value > 0 ? 4 : 0);
        const fillOpacity = opacityGradient
          ? opacityByRank(index, data.length, opacityGradient.min, opacityGradient.max)
          : undefined;

        return (
          <BarRow
            key={row.key ?? row.label}
            row={row}
            labelWidth={labelWidth}
            barHeightClass={barHeightClass}
            barRadiusClass={barRadiusClass}
            textClassName={textClassName}
            widthPct={widthPct}
            fillColor={opacityGradient ? 'var(--foreground)' : barColor}
            fillOpacity={fillOpacity}
            rowTooltip={rowTooltip}
          />
        );
      })}
    </div>
  );
}

type BarRowProps = {
  row: AnalyticsHorizontalBarDatum;
  labelWidth: number;
  barHeightClass: string;
  barRadiusClass: string;
  textClassName: string;
  widthPct: number;
  fillColor: string;
  fillOpacity?: number;
  rowTooltip?: (row: AnalyticsHorizontalBarDatum) => ReactNode;
};

function BarRow({
  row,
  labelWidth,
  barHeightClass,
  barRadiusClass,
  textClassName,
  widthPct,
  fillColor,
  fillOpacity,
  rowTooltip,
}: BarRowProps) {
  const content = (
    <div
      className={cn('grid items-center gap-3', rowTooltip && 'cursor-default')}
      style={{ gridTemplateColumns: `${labelWidth}px minmax(0, 1fr) auto` }}
    >
      <span className={cn('truncate text-foreground', textClassName)}>{row.label}</span>
      <div className={cn(barHeightClass, barRadiusClass, 'bg-border/30')}>
        <div
          className={cn('h-full transition-[width] duration-300', barRadiusClass)}
          style={{
            width: `${widthPct}%`,
            backgroundColor: fillColor,
            ...(fillOpacity != null ? { opacity: fillOpacity } : {}),
          }}
        />
      </div>
      {row.displayValue ? (
        <span
          className={cn(
            'min-w-10 text-right tabular-nums text-muted-foreground',
            textClassName,
          )}
        >
          {row.displayValue}
        </span>
      ) : (
        <span className="min-w-10" />
      )}
    </div>
  );

  if (!rowTooltip) {
    return content;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent side="top" sideOffset={6} className="flex-col items-start gap-0.5">
        {rowTooltip(row)}
      </TooltipContent>
    </Tooltip>
  );
}

export const analyticsMetricCardsGridClass =
  'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4';

export const analyticsTeamOverviewGridClass =
  'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4';

export const analyticsAdvancedOverviewGridClass =
  'grid grid-cols-1 gap-4 lg:grid-cols-2';

export function AnalyticsMemberRoleTag({
  roleSlug,
  className,
}: {
  roleSlug?: string | null;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-md border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[11px] font-normal leading-none text-muted-foreground',
        className,
      )}
    >
      {formatOrgRoleLabel(roleSlug)}
    </span>
  );
}

type AnalyticsSectionNavProps = {
  items: Array<{ id: string; label: string; icon: React.ElementType }>;
  activeId: string;
  onSelect: (id: string) => void;
};

export function AnalyticsSectionNav({
  items,
  activeId,
  onSelect,
}: AnalyticsSectionNavProps) {
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const isActive = activeId === item.id;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[15px] font-medium transition-colors',
              isActive
                ? 'bg-secondary font-semibold text-secondary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            <Icon className="size-[18px] shrink-0" />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

type AnalyticsRangeToggleProps<T extends string> = {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  className?: string;
};

export function AnalyticsRangeToggle<T extends string>({
  value,
  options,
  onChange,
  className,
}: AnalyticsRangeToggleProps<T>) {
  return (
    <div
      className={cn(
        'inline-flex flex-wrap items-center rounded-full border border-border/70 bg-muted/40 p-1',
        className,
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-full px-4 py-2 text-sm font-medium transition-all',
            value === option.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

type AnalyticsSectionHeaderProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function AnalyticsSectionHeader({
  title,
  description,
  action,
}: AnalyticsSectionHeaderProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0 flex-1">
        <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {title}
        </h2>
        <p className="mt-2 text-base text-muted-foreground">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

type AnalyticsBlockProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  variant?: 'card' | 'plain';
};

export function AnalyticsBlock({
  title,
  description,
  action,
  children,
  className,
  variant = 'card',
}: AnalyticsBlockProps) {
  return (
    <section className={cn('flex flex-col gap-6', className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h3>
          {description ? (
            <p className="mt-2 text-sm font-medium text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {variant === 'card' ? (
        <div className={pricingTableShellClass}>{children}</div>
      ) : (
        children
      )}
    </section>
  );
}

type AnalyticsMetricCardsProps = {
  items: Array<{ key: string; label: string; value: string }>;
  className?: string;
};

export function AnalyticsMetricCards({
  items,
  className,
}: AnalyticsMetricCardsProps) {
  return (
    <div className={cn(analyticsMetricCardsGridClass, className)}>
      {items.map((item) => (
        <div
          key={item.key}
          className="rounded-lg border border-border/70 bg-muted/50 px-5 py-4"
        >
          <p className="text-sm text-muted-foreground">{item.label}</p>
          <p className="mt-1.5 text-xl font-medium tracking-tight text-foreground tabular-nums">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

type SortDirection = 'asc' | 'desc';

type AnalyticsTableColumn<T> = {
  key: string;
  header: ReactNode;
  align?: 'left' | 'right' | 'center';
  sortValue?: (row: T) => string | number | null | undefined;
  cell: (row: T, index: number) => ReactNode;
};

type AnalyticsDataTableProps<T> = {
  columns: Array<AnalyticsTableColumn<T>>;
  rows: T[];
  rowKey: (row: T) => string;
  minWidth?: string;
  emptyMessage: string;
  padded?: boolean;
  defaultSort?: { key: string; direction: SortDirection };
  renderExpandedRow?: (row: T) => ReactNode | null;
  isRowExpandable?: (row: T) => boolean;
};

function compareSortValues(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
) {
  const aMissing = a === null || a === undefined || a === '';
  const bMissing = b === null || b === undefined || b === '';
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true });
}

function SortableHeader<T>({
  column,
  align,
  sortState,
  onSort,
}: {
  column: AnalyticsTableColumn<T>;
  align?: 'left' | 'right' | 'center';
  sortState: { key: string; direction: SortDirection } | null;
  onSort: (key: string) => void;
}) {
  const isActive = sortState?.key === column.key;
  const isSortable = column.sortValue != null;

  const content = (
    <>
      <span>{column.header}</span>
      {isSortable && isActive ? (
        sortState.direction === 'asc' ? (
          <ArrowUp className="size-3.5 shrink-0" />
        ) : (
          <ArrowDown className="size-3.5 shrink-0" />
        )
      ) : null}
    </>
  );

  if (!isSortable) {
    return <span className="inline-flex items-center gap-1.5">{content}</span>;
  }

  return (
    <button
      type="button"
      onClick={() => onSort(column.key)}
      className={cn(
        'inline-flex w-full items-center gap-1.5 transition-colors hover:text-foreground',
        align === 'center' && 'justify-center',
        align === 'right' && 'justify-end',
        isActive ? 'text-foreground' : 'text-muted-foreground',
      )}
    >
      {content}
    </button>
  );
}

export function AnalyticsDataTable<T>({
  columns,
  rows,
  rowKey,
  minWidth = '100%',
  emptyMessage,
  padded = true,
  defaultSort,
  renderExpandedRow,
  isRowExpandable,
}: AnalyticsDataTableProps<T>) {
  const [sortState, setSortState] = useState<{ key: string; direction: SortDirection } | null>(
    defaultSort ?? null,
  );
  const [expandedRowKeys, setExpandedRowKeys] = useState<Set<string>>(() => new Set());

  const sortedRows = useMemo(() => {
    if (!sortState) {
      return rows;
    }

    const column = columns.find((entry) => entry.key === sortState.key);
    if (!column?.sortValue) {
      return rows;
    }

    const sorted = [...rows].sort((left, right) =>
      compareSortValues(column.sortValue!(left), column.sortValue!(right)),
    );

    return sortState.direction === 'asc' ? sorted : sorted.reverse();
  }, [columns, rows, sortState]);

  const handleSort = (key: string) => {
    setSortState((current) => {
      if (current?.key === key) {
        return {
          key,
          direction: current.direction === 'asc' ? 'desc' : 'asc',
        };
      }

      return { key, direction: 'desc' };
    });
  };

  const toggleExpandedRow = (key: string) => {
    setExpandedRowKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  if (rows.length === 0) {
    return <div className={analyticsEmptyStateClass}>{emptyMessage}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table
        className="w-full border-collapse"
        style={{ minWidth }}
      >
        <thead>
          <tr className={cn('border-b', pricingSectionBorderClass())}>
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  'px-8 py-5 text-sm font-medium',
                  column.align === 'right' && 'text-right',
                  column.align === 'center' && 'text-center',
                  column.align !== 'right' && column.align !== 'center' && 'text-left',
                )}
              >
                <SortableHeader
                  column={column}
                  align={column.align}
                  sortState={sortState}
                  onSort={handleSort}
                />
              </th>
            ))}
            {renderExpandedRow ? <th className="w-12 px-4 py-5" aria-hidden /> : null}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, index) => {
            const key = rowKey(row);
            const expanded = expandedRowKeys.has(key);
            const expandable =
              renderExpandedRow != null &&
              (isRowExpandable?.(row) ?? Boolean(renderExpandedRow(row)));

            return (
              <Fragment key={key}>
                <tr
                  className={cn(
                    'border-b border-dotted last:border-b-0',
                    pricingSectionBorderClass(),
                    expandable && 'cursor-pointer transition-colors hover:bg-muted/30',
                    expanded && 'border-b-0',
                  )}
                  onClick={() => {
                    if (expandable) {
                      toggleExpandedRow(key);
                    }
                  }}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        padded ? 'px-8 py-4' : 'px-8 py-3',
                        'align-middle text-base text-foreground',
                        column.align === 'right' && 'text-right tabular-nums',
                        column.align === 'center' && 'text-center tabular-nums',
                      )}
                    >
                      {column.cell(row, index)}
                    </td>
                  ))}
                  {renderExpandedRow ? (
                    <td className="w-12 px-4 py-4 align-middle">
                      {expandable ? (
                        <ChevronRight
                          className={cn(
                            'ml-auto size-4 text-muted-foreground transition-transform duration-200',
                            expanded && 'rotate-90',
                          )}
                        />
                      ) : null}
                    </td>
                  ) : null}
                </tr>
                {expanded && renderExpandedRow ? (
                  <tr className={cn('border-b border-dotted last:border-b-0', pricingSectionBorderClass())}>
                    <td colSpan={columns.length + 1} className="px-8 pb-5 pt-0 align-top">
                      {renderExpandedRow(row)}
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function AnalyticsChartPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn('px-6 py-6', className)}>{children}</div>;
}

function AnalyticsChartEmptyState({
  message = 'No data yet.',
}: {
  message?: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6">
      <BarChart2 className="size-9 text-muted-foreground/35" strokeWidth={1.5} />
      <p className="text-sm text-muted-foreground/75">{message}</p>
    </div>
  );
}

const customerSentimentChartConfig = {
  value: {
    label: 'Conversations',
  },
  positive: {
    label: CUSTOMER_SENTIMENT_LABELS.positive,
    color: CUSTOMER_SENTIMENT_CHART_COLORS.positive,
  },
  neutral: {
    label: CUSTOMER_SENTIMENT_LABELS.neutral,
    color: CUSTOMER_SENTIMENT_CHART_COLORS.neutral,
  },
  negative: {
    label: CUSTOMER_SENTIMENT_LABELS.negative,
    color: CUSTOMER_SENTIMENT_CHART_COLORS.negative,
  },
} satisfies ChartConfig;

export function AnalyticsCustomerSentimentPieChart({
  distribution,
}: {
  distribution: CustomerSentimentCounts;
}) {
  const chartData = useMemo(
    () =>
      CUSTOMER_SENTIMENTS.map((sentiment) => ({
        sentiment,
        value: distribution[sentiment],
        fill: `var(--color-${sentiment})`,
      })).filter((slice) => slice.value > 0),
    [distribution],
  );

  const total = useMemo(
    () => chartData.reduce((sum, slice) => sum + slice.value, 0),
    [chartData],
  );

  if (!hasCustomerSentimentData(distribution)) {
    return (
      <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
        No sentiment data yet.
      </div>
    );
  }

  return (
    <ChartContainer
      config={customerSentimentChartConfig}
      className="aspect-square size-[min(320px,100%)] shrink-0"
    >
      <PieChart>
        <ChartTooltip
          content={
            <ChartTooltipContent
              hideLabel
              formatter={(value, _name, item) => {
                const count = Number(value) || 0;
                const share = total > 0 ? Math.round((count / total) * 100) : 0;
                const sentiment = item.payload?.sentiment as CustomerSentiment | undefined;
                const label = sentiment
                  ? CUSTOMER_SENTIMENT_LABELS[sentiment]
                  : item.name;
                return (
                  <span className="font-medium text-foreground">
                    {label}: {count.toLocaleString()} ({share}%)
                  </span>
                );
              }}
            />
          }
        />
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="sentiment"
          cx="50%"
          cy="44%"
          outerRadius="72%"
        />
        <ChartLegend
          content={<ChartLegendContent nameKey="sentiment" />}
          className="mt-1 flex-wrap justify-center gap-x-4 gap-y-1"
        />
      </PieChart>
    </ChartContainer>
  );
}

type AnalyticsChartShellProps = {
  title: ReactNode;
  titleSuffix?: string;
  children?: ReactNode;
  footer?: ReactNode;
  action?: ReactNode;
  emptyMessage?: string;
  isEmpty?: boolean;
  className?: string;
  contentClassName?: string;
  shellHeightClass?: string;
  shellStyle?: CSSProperties;
};

export function AnalyticsChartShell({
  title,
  titleSuffix,
  children,
  footer,
  action,
  emptyMessage,
  isEmpty = false,
  className,
  contentClassName,
  shellHeightClass = ANALYTICS_CHART_SHELL_HEIGHT_CLASS,
  shellStyle,
}: AnalyticsChartShellProps) {
  return (
    <div
      className={cn(
        'relative flex flex-col overflow-hidden rounded-lg border border-border/70 bg-muted/50',
        !shellStyle && shellHeightClass,
        className,
      )}
      style={shellStyle}
    >
      <div className="flex items-center justify-between gap-4 px-4 pb-3 pt-5">
        <div className={ANALYTICS_CHART_TITLE_CLASS}>
          {title}
          {titleSuffix ? (
            <span className="ml-1.5 text-base font-normal text-muted-foreground">
              {titleSuffix}
            </span>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      {isEmpty ? (
        <div className="flex flex-1 items-center justify-center px-4 pb-5">
          <AnalyticsChartEmptyState message={emptyMessage} />
        </div>
      ) : (
        <div
          className={cn(
            'flex min-h-0 flex-1 flex-col',
            footer ? 'pb-10' : 'pb-5',
            contentClassName,
          )}
        >
          {children}
        </div>
      )}

      {footer && !isEmpty ? (
        <div className="absolute right-4 bottom-3 z-10 flex items-center gap-3 text-xs text-muted-foreground">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

export function AnalyticsChartShellSkeleton({
  className,
  shellHeightClass = ANALYTICS_CHART_SHELL_HEIGHT_CLASS,
  shellStyle,
}: {
  className?: string;
  chartClassName?: string;
  shellHeightClass?: string;
  shellStyle?: CSSProperties;
}) {
  return (
    <div
      className={cn(
        'relative flex flex-col overflow-hidden rounded-lg border border-border/70 bg-muted/50',
        !shellStyle && shellHeightClass,
        className,
      )}
      style={shellStyle}
    >
      <div className="flex items-center justify-between gap-4 px-4 pb-3 pt-5">
        <Skeleton className="h-6 w-44 rounded-lg" />
        <Skeleton className="h-7 w-[108px] rounded-lg" />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 pb-5">
        <Skeleton className="size-9 rounded-full" />
        <Skeleton className="h-4 w-24 rounded-lg" />
      </div>
    </div>
  );
}

function AnalyticsTableSkeleton({
  rows = 5,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="overflow-x-auto">
      <div className={cn('border-b px-8 py-5', pricingSectionBorderClass())}>
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton key={`head-${index}`} className="h-4 rounded-lg" />
          ))}
        </div>
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={`row-${rowIndex}`}
          className={cn('border-b border-dotted px-8 py-4 last:border-b-0', pricingSectionBorderClass())}
        >
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columns }).map((_, columnIndex) => (
              <Skeleton
                key={`cell-${rowIndex}-${columnIndex}`}
                className={cn(
                  'h-4 rounded-lg',
                  columnIndex === 0 ? 'w-4/5' : 'mx-auto w-3/5',
                )}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function TeamAnalyticsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className={analyticsMetricCardsGridClass}>
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-lg border border-border/70 bg-muted/50 px-5 py-4">
            <Skeleton className="h-4 w-28 rounded-md" />
            <Skeleton className="mt-1.5 h-7 w-20 rounded-md" />
          </div>
        ))}
      </div>

      <div className={analyticsTeamOverviewGridClass}>
        <AnalyticsChartShellSkeleton className="col-span-1 sm:col-span-2" />
        <AnalyticsChartShellSkeleton className="col-span-1 sm:col-span-2" />
        <AnalyticsChartShellSkeleton className="col-span-1 sm:col-span-2" />
        <AnalyticsChartShellSkeleton className="col-span-1 sm:col-span-2" />
      </div>

      <div className={pricingTableShellClass}>
        <div className={cn('border-b px-8 py-4', pricingSectionBorderClass())}>
          <Skeleton className="h-9 w-full max-w-sm rounded-lg" />
        </div>
        <AnalyticsTableSkeleton rows={6} columns={8} />
      </div>
    </div>
  );
}

export function TopicsAnalyticsSkeleton() {
  const chartRowHeight = getTopicMapShellHeight(5, { includeExpandAction: true });

  return (
    <div className="flex flex-col gap-4">
      <div className={analyticsAdvancedOverviewGridClass}>
        <AnalyticsChartShellSkeleton shellStyle={{ height: chartRowHeight }} />
        <AnalyticsChartShellSkeleton shellStyle={{ height: chartRowHeight }} />
      </div>

      <div className={pricingTableShellClass}>
        <AnalyticsTableSkeleton rows={8} columns={2} />
      </div>
    </div>
  );
}

export function AnalyticsSectionHeaderSkeleton() {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0 flex-1 space-y-3">
        <Skeleton className="h-10 w-64 max-w-full rounded-lg" />
        <Skeleton className="h-5 w-full max-w-lg rounded-lg" />
      </div>
      <Skeleton className="h-10 w-72 rounded-full" />
    </div>
  );
}
