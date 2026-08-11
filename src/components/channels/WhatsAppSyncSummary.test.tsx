import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import type { Doc } from '../../../convex/_generated/dataModel';
import { WhatsAppSyncSummary } from './WhatsAppSyncSummary';

function whatsappChannel(
  overrides: Partial<Doc<'channels'>>,
): Doc<'channels'> {
  return {
    _id: 'channel-id',
    _creationTime: 1_700_000_000_000,
    orgId: '',
    service: 'whatsapp',
    status: 'connected',
    connectedByUserId: 'user-id',
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_000,
    ...overrides,
  } as Doc<'channels'>;
}

describe('WhatsAppSyncSummary', () => {
  test('hides progress after history is ready even if contact sync still runs', () => {
    const markup = renderToStaticMarkup(
      <WhatsAppSyncSummary
        channel={whatsappChannel({
          historySyncStatus: 'completed',
          contactSyncStatus: 'syncing',
        })}
      />,
    );

    expect(markup).toContain('Ready');
    expect(markup).not.toContain('data-slot="progress"');
  });

  test('keeps progress visible while chat history is syncing', () => {
    const markup = renderToStaticMarkup(
      <WhatsAppSyncSummary
        channel={whatsappChannel({
          historySyncStatus: 'syncing',
          historySyncProgress: 42,
          contactSyncStatus: 'syncing',
        })}
      />,
    );

    expect(markup).toContain('Syncing chat history (42%)');
    expect(markup).toContain('data-slot="progress"');
  });
});
