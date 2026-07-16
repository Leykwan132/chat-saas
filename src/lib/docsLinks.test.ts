import { existsSync, readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

function readSource(relativePath: string) {
  const sourceUrl = new URL(relativePath, import.meta.url);
  return existsSync(sourceUrl) ? readFileSync(sourceUrl, 'utf8') : '';
}

const docsLinksSource = readSource('./docsLinks.ts');
const headerLinksSource = readSource('../components/site-header/siteHeaderLinks.ts');
const footerSource = readSource('../components/SiteFooter.tsx');
const supportSource = readSource('../components/SupportHoverCard.tsx');

test('defines the canonical public KiloBot help center URL', () => {
  expect(docsLinksSource).toContain("export const KILOBOT_DOCS_URL = 'https://docs.kilobot.app'");
});

test('keeps Docs in the footer and out of the site header', () => {
  expect(headerLinksSource).not.toContain("label: 'Docs'");
  expect(headerLinksSource).not.toContain('KILOBOT_DOCS_URL');
  expect(footerSource).toContain('href={KILOBOT_DOCS_URL}');
  expect(footerSource).toContain('Docs');
});

test('offers the help center from authenticated support', () => {
  expect(supportSource).toContain("title: 'Help center'");
  expect(supportSource).toContain('href: KILOBOT_DOCS_URL');
  expect(supportSource).toContain('BookOpenText');
});
