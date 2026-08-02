import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

function readPage(fileName: string) {
  return readFileSync(new URL(`./${fileName}`, import.meta.url), 'utf8');
}

test('keeps book-style guides only on Follow-ups', () => {
  const broadcastPage = readPage('BroadcastPage.tsx');
  const servicesPage = readPage('ServicesPage.tsx');
  const followUpPage = readPage('FollowUpPage.tsx');

  expect(broadcastPage).not.toContain('>Guides</h2>');
  expect(broadcastPage).not.toContain('BroadcastGuideCard');
  expect(broadcastPage).not.toContain('BroadcastOverviewDialog');
  expect(broadcastPage).not.toContain('WhatsAppBanGuideDialog');
  expect(broadcastPage).not.toContain('BroadcastCostCalculatorDialog');

  expect(servicesPage).not.toContain('>Guides</h2>');
  expect(servicesPage).not.toContain('ServicesOverviewDialog');
  expect(servicesPage).not.toContain('function BookCard');

  expect(followUpPage).toContain('>Guides</h2>');
  expect(followUpPage).toContain('<BookCard');
  expect(followUpPage).toContain('title="Cost Calculator"');
});
