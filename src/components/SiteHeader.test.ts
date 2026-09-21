import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const siteHeaderSource = readFileSync(new URL('./SiteHeader.tsx', import.meta.url), 'utf8');
const brandSource = readFileSync(new URL('./site-header/SiteHeaderBrand.tsx', import.meta.url), 'utf8');
const navigationSource = readFileSync(new URL('./site-header/SiteHeaderNavigation.tsx', import.meta.url), 'utf8');
const actionsSource = readFileSync(new URL('./site-header/SiteHeaderActions.tsx', import.meta.url), 'utf8');
const blogLayoutSource = readFileSync(new URL('./BlogPostLayout.tsx', import.meta.url), 'utf8');
const legalLayoutSource = readFileSync(new URL('./LegalDocumentLayout.tsx', import.meta.url), 'utf8');
const footerSource = readFileSync(new URL('./SiteFooter.tsx', import.meta.url), 'utf8');
const headerLinksSource = readFileSync(new URL('./site-header/siteHeaderLinks.ts', import.meta.url), 'utf8');

test('site header keeps horizontal padding across desktop sizes', () => {
  expect(siteHeaderSource).toContain('px-5 sm:px-6 md:px-8 lg:px-10');
  expect(siteHeaderSource).toContain("isScrolled ? 'top-0' : 'top-10 sm:top-10'");
  expect(siteHeaderSource).not.toContain('top-[72px]');
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

test('public Start for free handlers do not report Google Ads conversions', () => {
  expect(siteHeaderSource).not.toContain('reportGoogleAdsConversion');
  expect(blogLayoutSource).not.toContain('reportGoogleAdsConversion');
  expect(legalLayoutSource).not.toContain('reportGoogleAdsConversion');
});

test('the full header offer bar copies the Starter code', () => {
  expect(siteHeaderSource).toContain('STARTER1');
  expect(siteHeaderSource).toContain('99% off for your first 3 months (Starter Plan).');
  expect(siteHeaderSource).toContain('Use code');
  expect(siteHeaderSource).not.toContain('See more →');
  expect(siteHeaderSource).not.toContain('Enjoy Starter for only RM1');
  expect(siteHeaderSource).toContain('font-normal');
  expect(siteHeaderSource).not.toContain('font-semibold">Enjoy Starter');
  expect(siteHeaderSource).toContain("toast.success('Code copied!')");
  expect(siteHeaderSource).toContain('navigator.clipboard.writeText');
  expect(siteHeaderSource).toContain('cursor-pointer');
  expect(siteHeaderSource).toContain('min-h-10 w-full cursor-pointer');
  expect(siteHeaderSource).toContain('px-5 py-1 text-center');
  expect(siteHeaderSource).not.toContain('px-5 py-1.5 text-center');
  expect(siteHeaderSource).toContain('flex w-full items-center justify-center');
  expect(siteHeaderSource).not.toContain('from-[#eb0000] via-[#95008a] to-[#3300fc]');
  expect(siteHeaderSource).toContain('text-center');
  expect(siteHeaderSource).toContain('translate-y-[3px]');
  expect(siteHeaderSource).toContain('ml-1 mr-1 size-3');
  expect(siteHeaderSource).not.toContain('bg-white/70');
  expect(siteHeaderSource).not.toContain("'Copy code'");
  expect(siteHeaderSource).not.toContain('Early Adopter Program');
  expect(siteHeaderSource).not.toContain('View pricing');
});

test('public navigation hides the leaderboard without removing its route', () => {
  expect(headerLinksSource).not.toContain('Leaderboard');
  expect(footerSource).not.toContain('to="/leaderboard"');
  expect(blogLayoutSource).not.toContain('to="/leaderboard"');
  expect(legalLayoutSource).not.toContain('to="/leaderboard"');
});
