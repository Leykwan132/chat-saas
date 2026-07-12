export type CostCurrency = 'usd' | 'myr';
export const ALL_MONTHS_VALUE = 'all';
export type SortDirection = 'asc' | 'desc';
export type UserSortKey = 'totalCostUsd' | 'totalTokens' | 'requestCount' | 'averageCostUsd' | 'lastRequestAt';
export type ModelSortKey =
  | 'totalCostUsd'
  | 'totalTokens'
  | 'requestCount'
  | 'averageCostUsd'
  | 'lastRequestAt'
  | 'model';

export type UsageCostModelRow = {
  userId: string;
  email: string | null;
  planKey: string;
  planName: string;
  model: string;
  provider: string;
  requestCount: number;
  totalCostUsd: number;
  totalTokens: number;
  averageCostUsd: number;
  lastRequestAt: number;
};

export type UsageCostUserRow = {
  userId: string;
  email: string | null;
  planKey: string;
  planName: string;
  requestCount: number;
  totalCostUsd: number;
  totalTokens: number;
  averageCostUsd: number;
  topModel: string | null;
  lastRequestAt: number;
};

export type UsageCostMonthlyUserRow = UsageCostUserRow & {
  monthKey: string;
  monthLabel: string;
};

export type UsageCostMonthlyModelRow = UsageCostModelRow & {
  monthKey: string;
  monthLabel: string;
};

export type UsageCostMonthOption = {
  monthKey: string;
  label: string;
  requestCount: number;
  totalCostUsd: number;
  totalTokens: number;
  lastRequestAt: number;
};

export type UsageCostReport = {
  rowLimit: null;
  sourceRowCount: number;
  costedRequestCount: number;
  monthOptions: UsageCostMonthOption[];
  userRows: UsageCostUserRow[];
  modelRows: UsageCostModelRow[];
  monthlyUserRows: UsageCostMonthlyUserRow[];
  monthlyModelRows: UsageCostMonthlyModelRow[];
};

function roundUsd(value: number) {
  return Math.round(value * 1_000_000_000) / 1_000_000_000;
}

export function compareValues<T>(a: T, b: T, key: keyof T, direction: SortDirection) {
  const left = a[key];
  const right = b[key];
  const factor = direction === 'asc' ? 1 : -1;
  if (typeof left === 'number' && typeof right === 'number') {
    return (left - right) * factor;
  }
  return String(left ?? '').localeCompare(String(right ?? '')) * factor;
}

export function formatCost(valueUsd: number, currency: CostCurrency) {
  const value = currency === 'myr' ? valueUsd * USD_TO_MYR_RATE : valueUsd;
  return new Intl.NumberFormat(currency === 'myr' ? 'en-MY' : 'en-US', {
    style: 'currency',
    currency: currency === 'myr' ? 'MYR' : 'USD',
    minimumFractionDigits: value >= 1 ? 2 : currency === 'myr' ? 2 : 6,
    maximumFractionDigits: value >= 1 ? 2 : currency === 'myr' ? 2 : 6,
  }).format(value);
}

export function formatTokenCount(value: number, compact = false) {
  return new Intl.NumberFormat('en-US', compact ? {
    notation: 'compact',
    maximumFractionDigits: 1,
  } : {
    maximumFractionDigits: 0,
  }).format(value);
}

export function buildUserSpendSummary(userRows: UsageCostUserRow[]) {
  const totalSpendUsd = userRows.reduce((sum, row) => sum + row.totalCostUsd, 0);
  const totalTokens = userRows.reduce((sum, row) => sum + row.totalTokens, 0);
  const highestSpendUser = userRows.reduce<UsageCostUserRow | null>((highest, row) => {
    if (highest === null || row.totalCostUsd > highest.totalCostUsd) {
      return row;
    }
    return highest;
  }, null);

  return {
    totalSpendUsd: roundUsd(totalSpendUsd),
    totalTokens,
    averageSpendUsd: userRows.length === 0 ? 0 : roundUsd(totalSpendUsd / userRows.length),
    highestSpendUser,
  };
}

export function getCostRowsForMonth(report: UsageCostReport, monthKey: string) {
  if (monthKey === ALL_MONTHS_VALUE) {
    return {
      userRows: report.userRows,
      modelRows: report.modelRows,
    };
  }

  return {
    userRows: report.monthlyUserRows.filter((row) => row.monthKey === monthKey),
    modelRows: report.monthlyModelRows.filter((row) => row.monthKey === monthKey),
  };
}
import { USD_TO_MYR_RATE } from '../../../shared/currency';

export { USD_TO_MYR_RATE } from '../../../shared/currency';
