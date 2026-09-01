import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, expect, test, vi } from 'vitest';
import ChannelsPage from '../../pages/ChannelsPage';

let channelFixtures: Array<Record<string, unknown>> = [];
let queryCall = 0;

vi.mock('convex/react', () => ({
  useAction: () => vi.fn(),
  useMutation: () => vi.fn(),
  useQuery: () => {
    queryCall += 1;
    if (queryCall === 1) return channelFixtures;
    if (queryCall === 3) return { channelLimit: 3 };
    return null;
  },
}));

vi.mock('@posthog/react', () => ({
  usePostHog: () => undefined,
}));

vi.mock('@/components/upgradeModalContext', () => ({
  useUpgradeModal: () => ({ openUpgradeModal: vi.fn() }),
}));

vi.mock('./AvailableChannelCard', () => ({
  AvailableChannelCard: ({ service }: { service: string }) =>
    createElement('div', { 'data-channel-service': service }, service),
}));

vi.mock('./WebsiteChannelCard', () => ({
  WebsiteChannelCard: () =>
    createElement('div', { 'data-channel-service': 'web' }, 'web'),
}));

vi.mock('./WebWidgetDetailsDialog', () => ({
  WebWidgetDetailsDialog: () => null,
}));

beforeEach(() => {
  channelFixtures = [];
  queryCall = 0;
});

function renderChannelsPage() {
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      { initialEntries: ['/dashboard/agent-1/channels'] },
      createElement(
        Routes,
        undefined,
        createElement(Route, {
          path: '/dashboard/:agentId/channels',
          element: createElement(ChannelsPage),
        }),
      ),
    ),
  );
}

test('channel cards make Messenger and Instagram available for connection', () => {
  const markup = renderChannelsPage();

  expect(markup).toContain('data-channel-service="instagram"');
  expect(markup).toContain('data-channel-service="messenger"');
  expect(markup).not.toContain('class="hidden"');
});

test('connected Messenger and Instagram cards remain visible', () => {
  channelFixtures = [
    {
      _id: 'instagram-channel',
      service: 'instagram',
      status: 'connected',
      displayUsername: 'kilobot.instagram',
      createdAt: 1_700_000_000_000,
      conversationCount: 2,
    },
    {
      _id: 'messenger-channel',
      service: 'messenger',
      status: 'connected',
      displayUsername: 'Kilobot Messenger',
      createdAt: 1_700_000_000_000,
      conversationCount: 3,
    },
  ];

  const markup = renderChannelsPage();

  expect(markup).toContain('kilobot.instagram');
  expect(markup).toContain('Kilobot Messenger');
  expect(markup).not.toContain('class="hidden"');
});
