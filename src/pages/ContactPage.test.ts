import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const contactPageSource = readFileSync(new URL('./ContactPage.tsx', import.meta.url), 'utf8');

test('contact page conversation heading uses a medium font weight', () => {
  const headingClass = contactPageSource.match(
    /<h1 className="([^"]+)">\s*Let&apos;s start a conversation/,
  )?.[1];

  expect(headingClass).toContain('font-medium');
  expect(headingClass).not.toContain('font-semibold');
});
