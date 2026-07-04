import { expect, test } from 'vitest';
import { getChannelServiceMeta, isSupportedChannelService } from './channelServiceMeta';

test('resolves display metadata for supported channel services', () => {
  expect(getChannelServiceMeta('whatsapp').label).toBe('WhatsApp');
  expect(getChannelServiceMeta('instagram').label).toBe('Instagram');
  expect(getChannelServiceMeta('messenger').label).toBe('Messenger');
});

test('resolves unsupported persisted channel services without throwing', () => {
  const meta = getChannelServiceMeta('facebook');

  expect(isSupportedChannelService('facebook')).toBe(false);
  expect(meta.label).toBe('Unsupported channel');
  expect(meta.iconColor).toBe('text-muted-foreground');
});
