import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { AgentOverviewMetricPreview } from './AgentOverviewMetricPreview';
import type {
  OverviewChartMode,
  OverviewTrendRow,
} from './AgentOverviewTrendChart';

export type OverviewMetricItem = {
  label: string;
  value: string;
  mode: OverviewChartMode;
};

function MetricCell({
  item,
  isSelected,
  rows,
  onSelect,
}: {
  item: OverviewMetricItem;
  isSelected: boolean;
  rows: OverviewTrendRow[];
  onSelect: (mode: OverviewChartMode) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={() => onSelect(item.mode)}
      className={cn(
        'relative flex min-h-[196px] min-w-0 flex-col justify-between gap-5 overflow-hidden px-5 py-5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
        isSelected ? 'bg-muted/50 hover:bg-muted/50' : 'bg-card hover:bg-muted/40',
      )}
    >
      <div className="flex min-w-0 flex-col gap-2">
        <div className="break-words text-3xl font-light leading-none tracking-normal text-foreground">
          {item.value}
        </div>
        <div className="max-w-[13rem] text-sm font-medium leading-tight text-foreground">
          {item.label}
        </div>
      </div>
      <AgentOverviewMetricPreview rows={rows} mode={item.mode} isSelected={isSelected} />
    </button>
  );
}

export function AgentOverviewMetrics({
  primary,
  secondary,
  rows,
  selectedMode,
  onSelectMode,
}: {
  primary: OverviewMetricItem[];
  secondary: OverviewMetricItem[];
  rows: OverviewTrendRow[];
  selectedMode: OverviewChartMode;
  onSelectMode: (mode: OverviewChartMode) => void;
}) {
  const metrics = [...primary, ...secondary];

  return (
    <Card className="overflow-hidden rounded-lg border border-border bg-border p-0 shadow-none">
      <CardContent className="grid gap-px bg-border p-0 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((item) => (
          <MetricCell
            key={item.label}
            item={item}
            isSelected={item.mode === selectedMode}
            rows={rows}
            onSelect={onSelectMode}
          />
        ))}
      </CardContent>
    </Card>
  );
}

export function AgentOverviewMetricsSkeleton() {
  return (
    <Card className="overflow-hidden rounded-lg border border-border bg-border p-0 shadow-none">
      <CardContent className="grid gap-px bg-border p-0 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex min-h-[196px] flex-col justify-between gap-5 bg-card px-5 py-5">
            <Skeleton className="h-9 w-28 rounded-md" />
            <Skeleton className="h-4 w-36 rounded-md" />
            <Skeleton className="h-16 w-full rounded-md" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
