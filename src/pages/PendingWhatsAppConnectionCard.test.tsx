import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import type { Doc } from '../../convex/_generated/dataModel';
import { PendingWhatsAppConnectionCard } from './ChannelsPage';

test('pending WhatsApp card shows only the compact connection action', () => {
  const attempt = {
    _id: 'attempt-id',
    _creationTime: 1_700_000_000_000,
    orgId: '',
    connectedByUserId: 'user-owner',
    status: 'started',
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_000,
  } as Doc<'whatsappConnectionAttempts'>;

  const markup = renderToStaticMarkup(
    <PendingWhatsAppConnectionCard
      attempt={attempt}
      channel={undefined}
      onCancel={() => undefined}
    />,
  );

  expect(markup).toContain('Connecting…');
  expect(markup).toContain('aria-label="Stop"');
  expect(markup).toContain('data-variant="destructiveGhost"');
  expect(markup).not.toContain('Waiting for WhatsApp setup');
});
