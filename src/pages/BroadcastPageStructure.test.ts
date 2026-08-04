import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const pageUrl = new URL('./BroadcastPage.tsx', import.meta.url);
const page = readFileSync(pageUrl, 'utf8');

test('keeps Broadcast page modular after history pagination', () => {
  expect(page.split('\n').length).toBeLessThanOrEqual(300);
  expect(page).toContain('<BroadcastHistoryTable');
  expect(page).toContain("new URLSearchParams(location.search).has('previewWithoutWhatsApp')");
  expect(page).toContain('import.meta.env.DEV &&');
  expect(page).toContain('bypassConnectionRequirement={previewWithoutWhatsApp}');
  expect(page).toContain(
    'Send approved WhatsApp templates to a selected group of contacts.',
  );
  expect(page).not.toContain('function BookCard');
  expect(page).not.toContain('BroadcastGuideCard');
  expect(page).not.toContain('BroadcastCostCalculatorDialog');
  expect(page).not.toContain('<Slider');
});
