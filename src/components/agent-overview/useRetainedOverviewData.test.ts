import { expect, test } from 'vitest';
import { resolveRetainedOverviewData } from './useRetainedOverviewData';

test('does not report a refresh before the first complete result pair', () => {
  expect(resolveRetainedOverviewData(undefined, undefined, undefined)).toEqual({
    data: undefined,
    isRefreshing: false,
  });
});

test('retains the previous result while the replacement is incomplete', () => {
  const previous = { summary: { label: '30d' }, creditUsage: { total: 240 } };

  expect(resolveRetainedOverviewData(previous, undefined, undefined)).toEqual({
    data: previous,
    isRefreshing: true,
  });
});

test('uses a newly complete pair without a busy state', () => {
  const summary = { label: '7d' };
  const creditUsage = { total: 56 };

  expect(resolveRetainedOverviewData(undefined, summary, creditUsage)).toEqual({
    data: { summary, creditUsage },
    isRefreshing: false,
  });
});
