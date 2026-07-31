import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import type { Doc } from '../../convex/_generated/dataModel';
import { PendingWhatsAppConnectionCard } from './ChannelsPage';

test('pending WhatsApp card keeps the standard card appearance', () => {
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
  expect(markup).toContain('aria-label="Stop WhatsApp connection"');
  expect(markup).toContain('data-variant="destructiveGhost"');
  expect(markup).toContain('lucide-square');
  expect(markup).not.toContain('>Stop</button>');
  expect(markup).toContain('border-border bg-card');
  expect(markup).not.toContain('border-dashed');
  expect(markup).not.toContain('bg-amber-500/5');
  expect(markup).toContain(
    'Supports coexistence — keep WhatsApp Business on your phone with the same number.',
  );
  expect(markup).not.toContain('Waiting for WhatsApp setup');
});
