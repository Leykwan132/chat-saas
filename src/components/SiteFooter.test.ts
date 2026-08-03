import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { expect, test, vi } from 'vitest';
import { SiteFooter } from './SiteFooter';

vi.mock('@workos-inc/authkit-react', () => ({
  useAuth: () => ({ signIn: vi.fn(), user: null }),
}));

const siteFooterSource = readFileSync(new URL('./SiteFooter.tsx', import.meta.url), 'utf8');

test('footer contact page links scroll the page to the top', () => {
  expect(siteFooterSource).toContain('const scrollToPageTop = () =>');
  expect(siteFooterSource).toContain("window.scrollTo({ top: 0, left: 0, behavior: 'auto' })");
  expect(siteFooterSource.match(/onClick={scrollToPageTop}/g)).toHaveLength(3);
  expect(siteFooterSource).toContain('to="/contact"');
  expect(siteFooterSource).toContain('to="/contact?intent=demo"');
  expect(siteFooterSource).toContain('to="/contact?intent=support"');
});

test('footer keeps direct contact details on the contact page', () => {
  expect(siteFooterSource).not.toContain('mailto:support@kilobot.app');
  expect(siteFooterSource).not.toContain('tel:+60129499394');
});

test('footer labels the terms link accurately', () => {
  expect(siteFooterSource).toContain('to="/terms"');
  expect(siteFooterSource).toContain('Terms of Service');
});

test('footer groups public legal links under Security & Legal', () => {
  const footer = renderToStaticMarkup(
    createElement(MemoryRouter, null, createElement(SiteFooter)),
  );

  expect(footer).toContain('Security &amp; Legal');
  expect(footer).toContain('href="/privacy"');
  expect(footer).toContain('href="/terms"');
  expect(footer).not.toContain('>About<');
});
