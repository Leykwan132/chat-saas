import { expect, test } from 'vitest';
import {
  ALL_MONTHS_VALUE,
  USD_TO_MYR_RATE,
  buildUserSpendSummary,
  formatCost,
  getCostRowsForMonth,
} from './adminUsageCostsModel';

test('formatCost can display USD or MYR estimates', () => {
  expect(formatCost(2.5, 'usd')).toBe('$2.50');
  expect(formatCost(2.5, 'myr')).toBe(
    new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(2.5 * USD_TO_MYR_RATE),
  );
});

test('buildUserSpendSummary returns average and highest user spend', () => {
  const summary = buildUserSpendSummary([
    {
      userId: 'user-a',
      email: 'a@example.com',
      planKey: 'free',
      planName: 'Free',
      requestCount: 2,
      totalTokens: 100,
      totalCostUsd: 0.4,
      averageCostUsd: 0.2,
      topModel: 'model-a',
      lastRequestAt: 1,
    },
    {
      userId: 'user-b',
      email: 'b@example.com',
      planKey: 'growth',
      planName: 'Growth',
      requestCount: 3,
      totalTokens: 300,
      totalCostUsd: 0.8,
      averageCostUsd: 0.266666667,
      topModel: 'model-b',
      lastRequestAt: 2,
    },
  ]);

  expect(summary.averageSpendUsd).toBe(0.6);
  expect(summary.highestSpendUser?.email).toBe('b@example.com');
  expect(summary.highestSpendUser?.totalCostUsd).toBe(0.8);
});

test('getCostRowsForMonth returns all-time or selected month rows', () => {
  const report = {
    rowLimit: 100,
    sourceRowCount: 3,
    costedRequestCount: 3,
    monthOptions: [],
    userRows: [
      {
        userId: 'user-a',
        email: 'a@example.com',
        planKey: 'growth',
        planName: 'Growth',
        requestCount: 3,
        totalTokens: 300,
        totalCostUsd: 1.2,
        averageCostUsd: 0.4,
        topModel: 'model-a',
        lastRequestAt: 3,
      },
    ],
    modelRows: [],
    monthlyUserRows: [
      {
        monthKey: '2026-07',
        monthLabel: 'Jul 2026',
        userId: 'user-a',
        email: 'a@example.com',
        planKey: 'growth',
        planName: 'Growth',
        requestCount: 1,
        totalTokens: 100,
        totalCostUsd: 0.8,
        averageCostUsd: 0.8,
        topModel: 'model-a',
        lastRequestAt: 2,
      },
    ],
    monthlyModelRows: [],
  };

  expect(getCostRowsForMonth(report, ALL_MONTHS_VALUE).userRows[0].totalCostUsd).toBe(1.2);
  expect(getCostRowsForMonth(report, '2026-07').userRows[0].totalCostUsd).toBe(0.8);
});
