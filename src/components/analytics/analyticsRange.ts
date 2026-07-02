export type AnalyticsRange = '7d' | '30d' | '90d' | 'all';

export const ANALYTICS_RANGE_OPTIONS: Array<{ value: AnalyticsRange; label: string }> = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: 'all', label: 'All time' },
];
