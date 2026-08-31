import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const pageSource = readFileSync(new URL('./ChatsPage.tsx', import.meta.url), 'utf8');
const demoSource = readFileSync(
  new URL('../components/inbox/InboxDemoPreview.tsx', import.meta.url),
  'utf8',
);
const fixtureSource = readFileSync(
  new URL('../components/inbox/inboxDemoData.ts', import.meta.url),
  'utf8',
);

test('inbox demo data is enabled only with the development dummy-data URL flag', () => {
  expect(pageSource).toContain("import.meta.env.DEV && searchParams.get('dummyData') === 'true'");
  expect(pageSource).toContain('<InboxDemoPreview />');
});

test('inbox demo preview is a dedicated mobile-only component', () => {
  expect(pageSource).toContain("import { InboxDemoPreview } from '@/components/inbox/InboxDemoPreview'");
  expect(pageSource).toContain('<InboxDemoPreview />');
  expect(demoSource).toContain('md:hidden');
  expect(demoSource).toContain('Turn off AI replies');
  expect(demoSource).toContain('INBOX_DEMO_PLATFORM_LABELS');
  expect(demoSource).toContain('INBOX_DEMO_CONTACT_DETAILS');
  expect(fixtureSource).toContain('Maya Chen');
  expect(fixtureSource).toContain('Jordan Lee');
});
