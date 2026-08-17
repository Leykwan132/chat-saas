import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { OverviewTrendDataMode } from './agentOverviewTrendModel';

const DATA_MODE_OPTIONS: Array<{ value: OverviewTrendDataMode; label: string }> = [
  { value: 'daily', label: 'Daily' },
  { value: 'cumulative', label: 'Cumulative' },
];

export function AgentOverviewDataModeSelect({
  value,
  onChange,
}: {
  value: OverviewTrendDataMode;
  onChange: (value: OverviewTrendDataMode) => void;
}) {
  return (
    <Select
      value={value}
      onValueChange={(nextValue) => onChange(nextValue as OverviewTrendDataMode)}
    >
      <SelectTrigger
        aria-label="Overview data mode"
        size="sm"
        className="relative h-8 justify-center rounded-full px-3 text-sm [&>svg]:absolute [&>svg]:right-3"
      >
        <SelectValue placeholder="Data mode" />
      </SelectTrigger>
      <SelectContent align="end">
        <SelectGroup>
          {DATA_MODE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
