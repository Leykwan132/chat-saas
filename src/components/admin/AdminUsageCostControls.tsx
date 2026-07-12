import { Button } from '@/components/ui/button';
import { pricingTableShellClass } from '@/components/pricing/pricingStyles';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  ALL_MONTHS_VALUE,
  type CostCurrency,
  type UsageCostMonthOption,
  type UsageCostUserRow,
  USD_TO_MYR_RATE,
  buildUserSpendSummary,
  formatCost,
  formatTokenCount,
} from './adminUsageCostsModel';

export function MonthFilter({
  monthOptions,
  selectedMonth,
  onMonthChange,
}: {
  monthOptions: UsageCostMonthOption[];
  selectedMonth: string;
  onMonthChange: (month: string) => void;
}) {
  return (
    <Select value={selectedMonth} onValueChange={onMonthChange}>
      <SelectTrigger aria-label="Usage cost month" size="sm" className="w-[9.5rem] rounded-full bg-background">
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        <SelectGroup>
          <SelectItem value={ALL_MONTHS_VALUE}>All months</SelectItem>
          {monthOptions.map((month) => (
            <SelectItem key={month.monthKey} value={month.monthKey}>
              {month.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

export function CurrencyToggle({
  currency,
  onCurrencyChange,
}: {
  currency: CostCurrency;
  onCurrencyChange: (currency: CostCurrency) => void;
}) {
  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <div className="flex rounded-full border border-border bg-background p-1">
        {(['usd', 'myr'] as const).map((option) => (
          <Button
            key={option}
            type="button"
            size="sm"
            variant={currency === option ? 'secondary' : 'ghost'}
            onClick={() => onCurrencyChange(option)}
            className="h-7 rounded-full px-3 uppercase"
          >
            {option}
          </Button>
        ))}
      </div>
      {currency === 'myr' ? (
        <p className="text-xs text-muted-foreground">Estimate: 1 USD = RM {USD_TO_MYR_RATE.toFixed(2)}</p>
      ) : null}
    </div>
  );
}

export function SpendSummaryCards({
  userRows,
  currency,
  isLoading,
}: {
  userRows: UsageCostUserRow[];
  currency: CostCurrency;
  isLoading: boolean;
}) {
  const summary = buildUserSpendSummary(userRows);
  const highest = summary.highestSpendUser;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div className={cn(pricingTableShellClass, 'p-4')}>
        <p className="text-xs font-medium text-muted-foreground">Total spend</p>
        <p className="mt-2 text-2xl font-semibold tabular-nums">
          {isLoading ? '-' : formatCost(summary.totalSpendUsd, currency)}
        </p>
      </div>
      <div className={cn(pricingTableShellClass, 'p-4')}>
        <p className="text-xs font-medium text-muted-foreground">Total tokens</p>
        <p className="mt-2 text-2xl font-semibold tabular-nums">
          {isLoading ? '-' : formatTokenCount(summary.totalTokens, true)}
        </p>
      </div>
      <div className={cn(pricingTableShellClass, 'p-4')}>
        <p className="text-xs font-medium text-muted-foreground">Average spend by user</p>
        <p className="mt-2 text-2xl font-semibold tabular-nums">
          {isLoading ? '-' : formatCost(summary.averageSpendUsd, currency)}
        </p>
      </div>
      <div className={cn(pricingTableShellClass, 'p-4')}>
        <p className="text-xs font-medium text-muted-foreground">Highest spend by user</p>
        <p className="mt-2 text-2xl font-semibold tabular-nums">
          {highest ? formatCost(highest.totalCostUsd, currency) : '-'}
        </p>
        <p className="mt-1 truncate text-sm text-muted-foreground">
          {highest?.email ?? highest?.userId ?? 'No user spend yet'}
        </p>
      </div>
    </div>
  );
}
