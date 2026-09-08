import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, expect, test, vi } from 'vitest';
import ChannelsPage from '../../pages/ChannelsPage';

let channelFixtures: Array<Record<string, unknown>> = [];
let queryCall = 0;
let featureFlags: Record<string, boolean | undefined> = {};
let currentUserEmail: string | undefined;

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
  useFeatureFlagEnabled: (key: string) => featureFlags[key],
}));

vi.mock('@/partnerAuth/AppAuthProvider', () => ({
  useAuth: () => ({
    user: currentUserEmail ? { email: currentUserEmail } : undefined,
  }),
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
  featureFlags = {};
  currentUserEmail = undefined;
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

test('hides Messenger and Instagram connect cards until each flag and email allow it', () => {
  const markup = renderChannelsPage();

  expect(markup).not.toContain('data-channel-service="instagram"');
  expect(markup).not.toContain('data-channel-service="messenger"');
  expect(markup).toContain('data-channel-service="whatsapp"');
});

test('shows only Instagram when that flag is on for the allowlisted account', () => {
  featureFlags = { enable_instagram: true };
  currentUserEmail = 'leykwan132@gmail.com';
  const markup = renderChannelsPage();

  expect(markup).toContain('data-channel-service="instagram"');
  expect(markup).not.toContain('data-channel-service="messenger"');
});

test('shows only Messenger when that flag is on for the allowlisted account', () => {
  featureFlags = { enable_messenger: true };
  currentUserEmail = 'leykwan132@gmail.com';
  const markup = renderChannelsPage();

  expect(markup).toContain('data-channel-service="messenger"');
  expect(markup).not.toContain('data-channel-service="instagram"');
});

test('channel cards make Messenger and Instagram available when both flags are on', () => {
  featureFlags = { enable_instagram: true, enable_messenger: true };
  currentUserEmail = 'leykwan132@gmail.com';
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
