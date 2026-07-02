import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TIME_RANGE_OPTIONS,
  type CreditTimeRange,
} from '@/components/analytics/creditUsageChartModel';

export function AgentOverviewTimeRangeSelect({
  value,
  onChange,
}: {
  value: CreditTimeRange;
  onChange: (value: CreditTimeRange) => void;
}) {
  return (
    <Select value={value} onValueChange={(nextValue) => onChange(nextValue as CreditTimeRange)}>
      <SelectTrigger aria-label="Overview time range" size="sm">
        <SelectValue placeholder="Time range" />
      </SelectTrigger>
      <SelectContent align="end">
        <SelectGroup>
          {TIME_RANGE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
