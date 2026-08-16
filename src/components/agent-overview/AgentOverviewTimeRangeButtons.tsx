import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group';
import type { CreditTimeRange } from '@/components/analytics/creditUsageChartModel';

const OVERVIEW_TIME_RANGE_OPTIONS: Array<{
  value: CreditTimeRange;
  label: string;
}> = [
  { value: '1d', label: '1d' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
];

export function AgentOverviewTimeRangeButtons({
  value,
  onChange,
}: {
  value: CreditTimeRange;
  onChange: (value: CreditTimeRange) => void;
}) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(nextValue) => {
        if (nextValue) onChange(nextValue as CreditTimeRange);
      }}
      variant="outline"
      size="sm"
      spacing={1}
      aria-label="Overview time range"
    >
      {OVERVIEW_TIME_RANGE_OPTIONS.map((option) => (
        <ToggleGroupItem key={option.value} value={option.value}>
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
