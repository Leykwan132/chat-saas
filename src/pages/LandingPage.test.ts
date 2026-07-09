import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

test('landing page hides the browser scrollbar indicator while keeping page scroll available', () => {
  const landingSource = readFileSync(new URL('./LandingPage.tsx', import.meta.url), 'utf8');
  const cssSource = readFileSync(new URL('../styles/landing-page.css', import.meta.url), 'utf8');

  expect(landingSource).toContain("import '@/styles/landing-page.css'");
  expect(landingSource).toContain('landing-page');
  expect(cssSource).toContain('html:has(.landing-page)');
  expect(cssSource).toContain('scrollbar-width: none');
  expect(cssSource).toContain('html:has(.landing-page)::-webkit-scrollbar');
  expect(cssSource).toContain('display: none');
  expect(cssSource).not.toContain('html:has(.landing-page) {\\n    overflow-y: hidden;');
});

test('home page does not show a spinner while landing auth state loads', () => {
  const homeSource = readFileSync(new URL('./HomePage.tsx', import.meta.url), 'utf8');

  expect(homeSource).not.toContain("import { Spinner }");
  expect(homeSource).not.toContain('<Spinner');
  expect(homeSource).toContain('landing-page');
});
