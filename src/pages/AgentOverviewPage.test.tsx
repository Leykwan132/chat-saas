import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, expect, test, vi } from 'vitest';
import AgentOverviewPage from './AgentOverviewPage';
import { AgentOverviewMetrics } from '@/components/agent-overview/AgentOverviewMetrics';
import { AgentOverviewTrendChart } from '@/components/agent-overview/AgentOverviewTrendChart';

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  queryCall: 0,
}));

vi.mock('convex/react', () => ({
  useQuery: mocks.useQuery,
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({ can: () => true, isLoading: false }),
}));

const summary = {
  periodStartMs: Date.UTC(2026, 6, 19),
  periodEndMs: Date.UTC(2026, 7, 17),
  timeZone: 'Asia/Kuala_Lumpur',
  aiAssistedConversationCount: 12,
  bookedAppointments: 3,
  escalations: 1,
  daily: [],
  trendingTopics: [],
  sentimentDistribution: { positive: 0, neutral: 0, negative: 0 },
};

const creditUsage = {
  totalCreditsUsed: 240,
  dailyUsage: [],
};

beforeEach(() => {
  mocks.useQuery.mockReset();
  mocks.queryCall = 0;
  mocks.useQuery.mockImplementation((_query, args) => {
    if (args === 'skip' || args.timeRange !== '30d') return undefined;
    mocks.queryCall += 1;
    return mocks.queryCall === 1 ? summary : creditUsage;
  });
});

test('opens Overview with last 30 days and the shortened AI label', () => {
  const markup = renderToStaticMarkup(
    <MemoryRouter initialEntries={['/dashboard/agent-1/overview']}>
      <Routes>
        <Route path="/dashboard/:agentId/overview" element={<AgentOverviewPage />} />
      </Routes>
    </MemoryRouter>,
  );

  expect(markup).toContain('<h1 class="font-title text-3xl font-normal tracking-tight">Overview</h1>');
  expect(markup).toContain('</h1><p class="text-sm text-muted-foreground">Jul 19 – Aug 17</p>');
  expect(markup).toContain('flex flex-col gap-2');
  expect(markup).toContain('AI conversations');
  expect(markup).toContain('sm:justify-between');
  expect(markup).toContain('sm:items-end');
  expect(markup).toContain('data-slot="toggle-group"');
  expect(markup).toContain('data-variant="ghost"');
  expect(markup).toContain('data-state="on"');
  expect(markup.indexOf('aria-label="Overview data mode"')).toBeLessThan(markup.indexOf('AI conversations'));
  expect(markup).toContain('>1d</button>');
  expect(markup).toContain('>7d</button>');
  expect(markup).toContain('>30d</button>');
  expect(markup).toContain('>90d</button>');
  expect(markup).not.toContain('>Billing period</button>');
});

test('renders compact metric cards with labels above values and no previews', () => {
  const markup = renderToStaticMarkup(
    <AgentOverviewMetrics
      primary={[{ label: 'AI conversations', value: '12', mode: 'aiAssistedConversations' }]}
      secondary={[]}
      selectedMode="aiAssistedConversations"
      onSelectMode={() => undefined}
    />,
  );

  expect(markup.indexOf('AI conversations')).toBeLessThan(markup.indexOf('12'));
  expect(markup).not.toContain('<svg');
  expect(markup).not.toContain('min-h-[116px]');
  expect(markup).toContain('flex min-w-0 flex-col gap-3');
  expect(markup).toContain('text-2xl');
  expect(markup).not.toContain('text-3xl');
});

test('uses a compact height when the selected trend has no activity', () => {
  const markup = renderToStaticMarkup(
    <AgentOverviewTrendChart
      rows={[]}
      mode="aiAssistedConversations"
      dataMode="daily"
    />,
  );

  expect(markup).toContain('height:400px');
  expect(markup).toContain('Conversations each day.');
  expect(markup).toContain('space-y-0.5');
  expect(markup).toContain('font-sans text-xl font-medium tracking-tight leading-tight');
});
