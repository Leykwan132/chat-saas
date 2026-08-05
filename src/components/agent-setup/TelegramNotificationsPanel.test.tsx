import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test, vi } from 'vitest';
import { TelegramNotificationsPanel } from './TelegramNotificationsPanel';

let queryCount = 0;

vi.mock('convex/react', () => ({
  useAction: () => vi.fn(),
  useMutation: () => vi.fn(),
  useQuery: () => {
    queryCount += 1;
    return queryCount === 1
      ? []
      : { kinds: ['humanEscalation', 'bookingCreated', 'bookingUpdated', 'bookingCancelled'] };
  },
}));

test('shows all four notification choices below the phone-number controls', () => {
  queryCount = 0;

  const markup = renderToStaticMarkup(
    <TelegramNotificationsPanel agentId={'agent-id' as never} />,
  );

  expect(markup).toContain('Recipients List');
  expect(markup).toContain('Notification Updates');
  expect(markup).toContain('Human escalation');
  expect(markup).toContain('New booking');
  expect(markup).toContain('Booking updated');
  expect(markup).toContain('Booking cancelled');
  expect(markup).toContain('Sending');
  expect(markup).toContain('Send a test message');
  expect(markup.indexOf('Notification Updates')).toBeGreaterThan(markup.indexOf('Recipients List'));

  const source = readFileSync(new URL('./TelegramNotificationsPanel.tsx', import.meta.url), 'utf8');
  expect(source).toContain('lg:border-l lg:border-border lg:pl-6');
  expect(source).not.toContain('rounded-md border border-border p-3');
  expect(source).toContain('justify-between');
  expect(source).not.toContain('whitespace-pre-wrap rounded-md bg-muted p-2');
});
