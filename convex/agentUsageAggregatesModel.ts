import type { Doc } from "./_generated/dataModel";
import {
  getCalendarMonthsFromEarliestToLatest,
  usageMonthKeyFromTimestamp,
} from "./usageMonthKey";

export type LifetimeModelRow = {
  model: string;
  totalTokens: number;
};

export function listLifetimeModelTotalsFromRows(
  rows: Doc<"rawAgentUsage">[],
): LifetimeModelRow[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    totals.set(row.model, (totals.get(row.model) ?? 0) + row.usage.totalTokens);
  }

  return [...totals.entries()]
    .map(([model, totalTokens]) => ({ model, totalTokens }))
    .filter((row) => row.totalTokens > 0)
    .sort((a, b) => b.totalTokens - a.totalTokens);
}

export function buildMonthlyUsageAggregates(
  lifetimeRows: LifetimeModelRow[],
  rows: Doc<"rawAgentUsage">[],
) {
  if (lifetimeRows.length === 0) {
    return {
      topModels: [] as string[],
      data: [] as Array<Record<string, number | string>>,
    };
  }

  const topModels = lifetimeRows.slice(0, 8).map((row) => row.model);
  const topModelSet = new Set(topModels);
  const allModels = lifetimeRows.map((row) => row.model);
  const monthlyByMonthModel = new Map<string, Map<string, number>>();

  let earliest = rows[0]?.createdAt;
  let latest = rows[0]?.createdAt;

  for (const row of rows) {
    const monthKey = usageMonthKeyFromTimestamp(row.createdAt);
    const monthMap = monthlyByMonthModel.get(monthKey) ?? new Map<string, number>();
    monthMap.set(row.model, (monthMap.get(row.model) ?? 0) + row.usage.totalTokens);
    monthlyByMonthModel.set(monthKey, monthMap);
    earliest = earliest === undefined ? row.createdAt : Math.min(earliest, row.createdAt);
    latest = latest === undefined ? row.createdAt : Math.max(latest, row.createdAt);
  }

  if (earliest === undefined || latest === undefined) {
    return { topModels, data: [] };
  }

  const sortedMonths = getCalendarMonthsFromEarliestToLatest(earliest, latest);
  const data = sortedMonths
    .map((month) => {
      const monthMap = monthlyByMonthModel.get(month.sortKey) ?? new Map<string, number>();
      const item: Record<string, number | string> = {
        month: month.label,
        prompt: 0,
        completion: 0,
        others: 0,
      };
      let monthlyTotal = 0;
      let others = 0;

      for (const model of allModels) {
        const sum = monthMap.get(model) ?? 0;
        monthlyTotal += sum;
        if (topModelSet.has(model)) {
          item[model] = sum;
        } else {
          others += sum;
        }
      }

      item.others = others;
      item.prompt = monthlyTotal;
      return item;
    })
    .filter((item) => (item.prompt as number) > 0);

  return { topModels, data };
}
