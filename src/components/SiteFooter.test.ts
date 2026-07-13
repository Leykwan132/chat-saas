import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const siteFooterSource = readFileSync(new URL('./SiteFooter.tsx', import.meta.url), 'utf8');

test('footer demo and support links scroll the contact page to the top', () => {
  expect(siteFooterSource).toContain('const scrollToPageTop = () =>');
  expect(siteFooterSource).toContain("window.scrollTo({ top: 0, left: 0, behavior: 'auto' })");
  expect(siteFooterSource.match(/onClick={scrollToPageTop}/g)).toHaveLength(2);
  expect(siteFooterSource).toContain('to="/contact?intent=demo"');
  expect(siteFooterSource).toContain('to="/contact?intent=support"');
});

test('footer exposes direct email and phone support links', () => {
  expect(siteFooterSource).toContain('href="mailto:support@kilobot.app"');
  expect(siteFooterSource).toContain('support@kilobot.app');
  expect(siteFooterSource).toContain('href="tel:+60129499394"');
  expect(siteFooterSource).toContain('+60129499394 (Kwan)');
});
