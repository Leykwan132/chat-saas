import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const siteHeaderSource = readFileSync(new URL('./SiteHeader.tsx', import.meta.url), 'utf8');
const brandSource = readFileSync(new URL('./site-header/SiteHeaderBrand.tsx', import.meta.url), 'utf8');
const navigationSource = readFileSync(new URL('./site-header/SiteHeaderNavigation.tsx', import.meta.url), 'utf8');
const actionsSource = readFileSync(new URL('./site-header/SiteHeaderActions.tsx', import.meta.url), 'utf8');

test('site header keeps horizontal padding across desktop sizes', () => {
  expect(siteHeaderSource).toContain('px-5 sm:px-6 md:px-8 lg:px-10');
  expect(siteHeaderSource).not.toContain('justify-between px-5 sm:px-6"');
  expect(siteHeaderSource).not.toContain('md:px-0');
});

test('site header uses three layout components with centered desktop navigation', () => {
  expect(siteHeaderSource).toContain('justify-around gap-4 px-5 sm:px-6 md:px-8 lg:px-10');
  expect(siteHeaderSource).toContain('<SiteHeaderBrand');
  expect(siteHeaderSource).toContain('<SiteHeaderNavigation');
  expect(siteHeaderSource).toContain('<SiteHeaderActions');
  expect(siteHeaderSource).not.toContain('absolute left-1/2 -translate-x-1/2');
  expect(navigationSource).toContain('hidden flex-1 items-center justify-center gap-7');
  expect(brandSource).toContain('flex flex-1 items-center justify-start');
  expect(actionsSource).toContain('flex flex-1 items-center justify-end');
});

test('site header balances the brand icon with the wordmark', () => {
  expect(brandSource).toContain("'size-6 transition-all duration-300'");
  expect(brandSource).toContain('font-title font-semibold text-[20px]');
  expect(brandSource).not.toContain("'size-7 transition-all duration-300'");
});
