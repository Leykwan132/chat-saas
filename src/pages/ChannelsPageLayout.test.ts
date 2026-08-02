import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const page = readFileSync(new URL('./ChannelsPage.tsx', import.meta.url), 'utf8');

test('renders channel cards directly below the page header', () => {
  expect(page).toContain('CONNECTABLE_SERVICES.map');
  expect(page).not.toContain('How channels work');
  expect(page).not.toContain('Mobile coexistence');
  expect(page).not.toContain('Available channels');
  expect(page).not.toContain('ChannelLifecycleGuideDialog');
  expect(page).not.toContain('WhatsAppCoexistenceGuideDialog');
});
