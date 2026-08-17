import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { CreditTimeRange } from '@/components/analytics/creditUsageChartModel';

const OVERVIEW_TIME_RANGE_OPTIONS: Array<{
  value: CreditTimeRange;
  label: string;
  tooltip: string;
}> = [
  { value: '1d', label: '1d', tooltip: 'Last day' },
  { value: '7d', label: '7d', tooltip: 'Last 7 days' },
  { value: '30d', label: '30d', tooltip: 'Last 30 days' },
  { value: '90d', label: '90d', tooltip: 'Last 90 days' },
];

export function AgentOverviewTimeRangeButtons({
  value,
  onChange,
  isRefreshing = false,
}: {
  value: CreditTimeRange;
  onChange: (value: CreditTimeRange) => void;
  isRefreshing?: boolean;
}) {
  return (
    <TooltipProvider>
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(nextValue) => {
          if (nextValue) onChange(nextValue as CreditTimeRange);
        }}
        variant="ghost"
        size="sm"
        spacing={1}
        aria-busy={isRefreshing}
        aria-label="Overview time range"
      >
        {OVERVIEW_TIME_RANGE_OPTIONS.map((option) => (
          <Tooltip key={option.value}>
            <TooltipTrigger asChild>
              <ToggleGroupItem value={option.value} aria-label={option.tooltip}>
                {option.label}
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={6}>
              {option.tooltip}
            </TooltipContent>
          </Tooltip>
        ))}
      </ToggleGroup>
    </TooltipProvider>
  );
}
