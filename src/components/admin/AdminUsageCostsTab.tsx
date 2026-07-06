import { useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import { format } from 'date-fns';
import { ArrowUpDown, ReceiptText } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { pricingTableShellClass } from '@/components/pricing/pricingStyles';
import {
  CurrencyToggle,
  MonthFilter,
  SpendSummaryCards,
} from './AdminUsageCostControls';
import {
  ALL_MONTHS_VALUE,
  type CostCurrency,
  type ModelSortKey,
  type SortDirection,
  type UsageCostReport,
  type UserSortKey,
  compareValues,
  formatCost,
  getCostRowsForMonth,
} from './adminUsageCostsModel';

const userGridClass =
  'grid grid-cols-[minmax(120px,1.3fr)_64px_82px_70px_78px_78px_minmax(120px,1fr)_96px] items-center gap-x-2 px-3';

const modelGridClass =
  'grid grid-cols-[minmax(110px,1.1fr)_64px_minmax(130px,1.2fr)_70px_82px_70px_78px_78px_96px] items-center gap-x-2 px-3';

function SortHeader({
  label,
  active,
  direction,
  onClick,
  align = 'left',
}: {
  label: string;
  active: boolean;
  direction: SortDirection;
  onClick: () => void;
  align?: 'left' | 'right';
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={cn('h-6 px-1 text-xs text-muted-foreground', align === 'right' && 'ml-auto')}
    >
      {label}
      <ArrowUpDown data-icon="inline-end" />
      <span className="sr-only">{active ? `Sorted ${direction}` : 'Sort column'}</span>
    </Button>
  );
}

function LoadingRows({ gridClass, rows = 4 }: { gridClass: string; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="border-b border-dotted border-border/60">
          <div className={cn(gridClass, 'py-2')}>
            {Array.from({ length: 8 }, (_, cell) => (
              <Skeleton key={cell} className="h-4 w-24" />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

function EmptyCosts() {
  return (
    <Empty className="min-h-72">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ReceiptText />
        </EmptyMedia>
        <EmptyTitle>No cost data yet</EmptyTitle>
        <EmptyDescription>
          OpenRouter cost metadata will appear after live agent requests are recorded.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export function AdminUsageCostsTab({
  sessionToken,
  enabled,
}: {
  sessionToken: string;
  enabled: boolean;
}) {
  const report = useQuery(
    api.adminUsageCosts.getAdminUsageCostReport,
    enabled ? { sessionToken } : 'skip',
  ) as UsageCostReport | undefined;
  const [userSort, setUserSort] = useState<UserSortKey>('totalCostUsd');
  const [modelSort, setModelSort] = useState<ModelSortKey>('totalCostUsd');
  const [userDirection, setUserDirection] = useState<SortDirection>('desc');
  const [modelDirection, setModelDirection] = useState<SortDirection>('desc');
  const [currency, setCurrency] = useState<CostCurrency>('usd');
  const [selectedMonth, setSelectedMonth] = useState(ALL_MONTHS_VALUE);

  const effectiveMonth =
    report !== undefined &&
    selectedMonth !== ALL_MONTHS_VALUE &&
    report.monthOptions.some((month) => month.monthKey === selectedMonth)
      ? selectedMonth
      : ALL_MONTHS_VALUE;

  const selectedRows = useMemo(() => {
    if (report === undefined) {
      return { userRows: [], modelRows: [] };
    }
    return getCostRowsForMonth(report, effectiveMonth);
  }, [effectiveMonth, report]);

  const sortedUsers = useMemo(() => {
    return [...selectedRows.userRows].sort((a, b) =>
      compareValues(a, b, userSort, userDirection),
    );
  }, [selectedRows.userRows, userDirection, userSort]);

  const sortedModels = useMemo(() => {
    return [...selectedRows.modelRows].sort((a, b) =>
      compareValues(a, b, modelSort, modelDirection),
    );
  }, [modelDirection, modelSort, selectedRows.modelRows]);

  const toggleUserSort = (key: UserSortKey) => {
    setUserDirection((current) => (userSort === key && current === 'desc' ? 'asc' : 'desc'));
    setUserSort(key);
  };
  const toggleModelSort = (key: ModelSortKey) => {
    setModelDirection((current) => (modelSort === key && current === 'desc' ? 'asc' : 'desc'));
    setModelSort(key);
  };

  if (report !== undefined && report.userRows.length === 0) {
    return <EmptyCosts />;
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold tracking-tight">WorkOS user spend</h2>
            <p className="text-sm text-muted-foreground">
              {report
                ? `${report.costedRequestCount.toLocaleString()} costed requests from ${report.sourceRowCount.toLocaleString()} recent usage rows`
                : 'Loading cost data...'}
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <MonthFilter
              monthOptions={report?.monthOptions ?? []}
              selectedMonth={effectiveMonth}
              onMonthChange={setSelectedMonth}
            />
            <CurrencyToggle currency={currency} onCurrencyChange={setCurrency} />
          </div>
        </div>
        <div className="mt-4">
          <SpendSummaryCards
            userRows={selectedRows.userRows}
            currency={currency}
            isLoading={report === undefined}
          />
        </div>
        <div className={cn(pricingTableShellClass, 'mt-4 overflow-hidden')}>
          <div className="w-full">
            <div className={cn(userGridClass, 'border-b border-border/70 py-2 text-xs font-medium')}>
              <div>WorkOS user</div>
              <div>Plan</div>
              <SortHeader label="Spend" active={userSort === 'totalCostUsd'} direction={userDirection} onClick={() => toggleUserSort('totalCostUsd')} align="right" />
              <SortHeader label="Requests" active={userSort === 'requestCount'} direction={userDirection} onClick={() => toggleUserSort('requestCount')} align="right" />
              <SortHeader label="Avg" active={userSort === 'averageCostUsd'} direction={userDirection} onClick={() => toggleUserSort('averageCostUsd')} align="right" />
              <SortHeader label="Tokens" active={userSort === 'totalTokens'} direction={userDirection} onClick={() => toggleUserSort('totalTokens')} align="right" />
              <div>Top model</div>
              <SortHeader label="Last request" active={userSort === 'lastRequestAt'} direction={userDirection} onClick={() => toggleUserSort('lastRequestAt')} />
            </div>
            {report === undefined ? (
              <LoadingRows gridClass={userGridClass} />
            ) : (
              sortedUsers.map((row) => (
                <div key={row.userId} className="border-b border-dotted border-border/60">
                  <div className={cn(userGridClass, 'py-2 text-xs')}>
                    <div className="truncate font-medium">{row.email ?? row.userId}</div>
                    <div><Badge variant="secondary" className="px-1.5 text-[11px]">{row.planName}</Badge></div>
                    <div className="text-right tabular-nums">{formatCost(row.totalCostUsd, currency)}</div>
                    <div className="text-right tabular-nums">{row.requestCount.toLocaleString()}</div>
                    <div className="text-right tabular-nums">{formatCost(row.averageCostUsd, currency)}</div>
                    <div className="text-right tabular-nums">{row.totalTokens.toLocaleString()}</div>
                    <div className="truncate text-muted-foreground">{row.topModel ?? '-'}</div>
                    <div className="text-muted-foreground">{format(new Date(row.lastRequestAt), 'MMM d, h:mm a')}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold tracking-tight">Model spend by user</h2>
        <div className={cn(pricingTableShellClass, 'mt-4 overflow-hidden')}>
          <div className="w-full">
            <div className={cn(modelGridClass, 'border-b border-border/70 py-2 text-xs font-medium')}>
              <div>WorkOS user</div>
              <div>Plan</div>
              <SortHeader label="Model" active={modelSort === 'model'} direction={modelDirection} onClick={() => toggleModelSort('model')} />
              <div>Provider</div>
              <SortHeader label="Spend" active={modelSort === 'totalCostUsd'} direction={modelDirection} onClick={() => toggleModelSort('totalCostUsd')} align="right" />
              <SortHeader label="Requests" active={modelSort === 'requestCount'} direction={modelDirection} onClick={() => toggleModelSort('requestCount')} align="right" />
              <SortHeader label="Avg" active={modelSort === 'averageCostUsd'} direction={modelDirection} onClick={() => toggleModelSort('averageCostUsd')} align="right" />
              <SortHeader label="Tokens" active={modelSort === 'totalTokens'} direction={modelDirection} onClick={() => toggleModelSort('totalTokens')} align="right" />
              <SortHeader label="Last request" active={modelSort === 'lastRequestAt'} direction={modelDirection} onClick={() => toggleModelSort('lastRequestAt')} />
            </div>
            {report === undefined ? (
              <LoadingRows gridClass={modelGridClass} />
            ) : (
              sortedModels.map((row) => (
                <div key={`${row.userId}:${row.provider}:${row.model}`} className="border-b border-dotted border-border/60">
                  <div className={cn(modelGridClass, 'py-2 text-xs')}>
                    <div className="truncate font-medium">{row.email ?? row.userId}</div>
                    <div><Badge variant="secondary" className="px-1.5 text-[11px]">{row.planName}</Badge></div>
                    <div className="truncate">{row.model}</div>
                    <div className="text-muted-foreground">{row.provider}</div>
                    <div className="text-right tabular-nums">{formatCost(row.totalCostUsd, currency)}</div>
                    <div className="text-right tabular-nums">{row.requestCount.toLocaleString()}</div>
                    <div className="text-right tabular-nums">{formatCost(row.averageCostUsd, currency)}</div>
                    <div className="text-right tabular-nums">{row.totalTokens.toLocaleString()}</div>
                    <div className="text-muted-foreground">{format(new Date(row.lastRequestAt), 'MMM d, h:mm a')}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
