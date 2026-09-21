import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, test, vi } from 'vitest';
import { UsageAnalyticsContent } from './UsageAnalyticsContent';

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
}));

vi.mock('convex/react', () => ({
  useQuery: mocks.useQuery,
}));

vi.mock('@/components/PlanFeatureGate', () => ({
  PlanFeatureGate: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/components/analytics/PlanUsageCard', () => ({
  PlanUsageCard: () => null,
}));

vi.mock('@/components/analytics/CreditSpendTable', () => ({
  CreditSpendTable: () => null,
  CreditSpendTableSkeleton: () => null,
}));

beforeEach(() => {
  mocks.useQuery.mockReset();
  mocks.useQuery.mockReturnValue({
    modelUsage: { series: [], daily: [] },
    totalCreditsUsed: 0,
    periodStartMs: Date.UTC(2026, 8, 1),
    periodEndMs: Date.UTC(2026, 9, 1),
    timeZone: 'Asia/Kuala_Lumpur',
  });
});

test('AI Agent Usage initially requests the last 30 days', () => {
  renderToStaticMarkup(<UsageAnalyticsContent agentId="qh7677m2kbx0mbd5tze569y3qn8bnd49" />);

  expect(mocks.useQuery.mock.calls.map(([, args]) => args)).toContainEqual({
    agentId: 'qh7677m2kbx0mbd5tze569y3qn8bnd49',
    timeRange: '30d',
  });
});
