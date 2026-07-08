import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const siteHeaderSource = readFileSync(new URL('./SiteHeader.tsx', import.meta.url), 'utf8');

test('site header removes extra horizontal padding on desktop', () => {
  expect(siteHeaderSource).toContain('px-5 sm:px-6 md:px-0');
  expect(siteHeaderSource).not.toContain('justify-between px-5 sm:px-6"');
});
