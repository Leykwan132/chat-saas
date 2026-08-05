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

  expect(markup).toContain('Phone numbers');
  expect(markup).toContain('What should be sent?');
  expect(markup).toContain('Human escalation');
  expect(markup).toContain('New booking');
  expect(markup).toContain('Booking updated');
  expect(markup).toContain('Booking cancelled');
  expect(markup.indexOf('What should be sent?')).toBeGreaterThan(markup.indexOf('Phone numbers'));
});
