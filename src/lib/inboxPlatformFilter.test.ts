import { expect, test } from 'vitest';
import { filterInboxPlatforms, toggleInboxPlatform } from './inboxPlatformFilter';

const chats = [
  { platform: 'whatsapp' as const },
  { platform: 'instagram' as const },
  { platform: 'web' as const },
];

test('no platform selection shows every platform', () => {
  expect(filterInboxPlatforms(chats, [])).toEqual(chats);
});

test('multiple selections include chats from either platform', () => {
  expect(filterInboxPlatforms(chats, ['whatsapp', 'web'])).toEqual([chats[0], chats[2]]);
});

test('toggling a platform preserves the others and clearing the last shows all', () => {
  const selected = toggleInboxPlatform(['whatsapp'], 'instagram');
  expect(selected).toEqual(['whatsapp', 'instagram']);
  expect(toggleInboxPlatform(selected, 'whatsapp')).toEqual(['instagram']);
  expect(filterInboxPlatforms(chats, toggleInboxPlatform(['instagram'], 'instagram'))).toEqual(chats);
});
