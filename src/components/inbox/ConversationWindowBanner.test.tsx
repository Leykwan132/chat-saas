import { afterEach, expect, test, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ConversationWindowBanner } from './ConversationWindowBanner';

const now = 1_790_000_000_000;
const HOUR_MS = 3_600_000;

function renderBanner(props: Partial<Parameters<typeof ConversationWindowBanner>[0]> = {}, sandbox = false) {
  vi.useFakeTimers();
  vi.setSystemTime(now);
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[sandbox ? '/?isSandbox=true' : '/']}>
      <TooltipProvider>
        <ConversationWindowBanner service="whatsapp" agentId={undefined} lastCustomerMessageAt={now - HOUR_MS} {...props} />
      </TooltipProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.useRealTimers();
});

test('shows independent timers when the free window and reply window are open', () => {
  const markup = renderBanner({ freeMessagingExpiresAt: now + 50 * HOUR_MS });
  expect(markup).toContain('50h 0m remaining');
  expect(markup).toContain('23h remaining');
  expect(markup).not.toContain('Sample');
});

test('keeps the reply window closed while the free pricing window remains open', () => {
  const markup = renderBanner({ freeMessagingExpiresAt: now + 42 * HOUR_MS, lastCustomerMessageAt: now - 30 * HOUR_MS });
  expect(markup).toContain('42h 0m remaining');
  expect(markup).toContain('Closed');
});

test('hides the free window at expiry while retaining the conversation timer', () => {
  const markup = renderBanner({ freeMessagingExpiresAt: now });
  expect(markup).not.toContain('Free messaging');
  expect(markup).toContain('Conversation window');
});

test('does not show the WhatsApp pricing window for other channels', () => {
  expect(renderBanner({ service: 'instagram', freeMessagingExpiresAt: now + HOUR_MS })).not.toContain('Free messaging');
  expect(renderBanner({ service: 'web' })).toBe('');
});

test('sandbox shows samples without requiring live window data', () => {
  const markup = renderBanner({ service: 'web', lastCustomerMessageAt: undefined }, true);
  expect(markup).toContain('Sample WhatsApp messaging windows');
  expect(markup).toContain('Free messaging');
  expect(markup).toContain('Conversation window');
});
