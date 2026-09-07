import { expect, test } from 'vitest';
import { hostBrandName, isNativeHost, toHostBrand } from './hostBranding';

test('names the brand as Kilobot on native hosts, the partner elsewhere, and blank while loading', () => {
  expect(hostBrandName(null)).toBe('Kilobot');
  expect(hostBrandName({ name: 'Acme', logoUrl: null })).toBe('Acme');
  expect(hostBrandName(undefined)).toBe('');
});

test('treats kilobot.app and local dev hosts as native', () => {
  expect(isNativeHost('kilobot.app')).toBe(true);
  expect(isNativeHost('localhost')).toBe(true);
  expect(isNativeHost('app.localhost')).toBe(true);
  expect(isNativeHost('chat.morphswiftstudio.com')).toBe(false);
});

test('maps hostname branding to a sidebar brand and preserves loading/native states', () => {
  expect(toHostBrand({ partnerName: 'Acme', logoUrl: 'https://cdn.test/a.png' })).toEqual({
    name: 'Acme',
    logoUrl: 'https://cdn.test/a.png',
  });
  expect(toHostBrand(null)).toBeNull();
  expect(toHostBrand(undefined)).toBeUndefined();
});
