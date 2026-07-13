import { existsSync, readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const contactPageSource = readFileSync(new URL('./ContactPage.tsx', import.meta.url), 'utf8');
const directContactDetailsUrl = new URL(
  '../components/contact/DirectContactDetails.tsx',
  import.meta.url,
);
const directContactDetailsSource = existsSync(directContactDetailsUrl)
  ? readFileSync(directContactDetailsUrl, 'utf8')
  : '';

test('contact page conversation heading uses a medium font weight', () => {
  const headingClass = contactPageSource.match(
    /<h1 className="([^"]+)">\s*Let&apos;s start a conversation/,
  )?.[1];

  expect(headingClass).toContain('font-medium');
  expect(headingClass).not.toContain('font-semibold');
});

test('contact page offers direct email and phone details below its introduction', () => {
  expect(contactPageSource).toContain(
    "import { DirectContactDetails } from '@/components/contact/DirectContactDetails';",
  );
  expect(contactPageSource).toMatch(
    /Enterprise plans, demos, or support[\s\S]+<DirectContactDetails \/>/,
  );
  expect(directContactDetailsSource).toContain('If you prefer to reach out directly');
  expect(directContactDetailsSource).toContain('href="mailto:support@kilobot.app"');
  expect(directContactDetailsSource).toContain('href="tel:+60129499394"');
  expect(directContactDetailsSource).toContain('+60129499394 (Kwan)');
});
