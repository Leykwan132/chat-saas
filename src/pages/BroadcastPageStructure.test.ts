import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const pageUrl = new URL('./BroadcastPage.tsx', import.meta.url);
const page = readFileSync(pageUrl, 'utf8');

test('keeps Broadcast page modular after history pagination', () => {
  expect(page.split('\n').length).toBeLessThanOrEqual(300);
  expect(page).toContain('<BroadcastHistoryTable');
  expect(page).not.toContain('function BookCard');
  expect(page).not.toContain('BroadcastGuideCard');
  expect(page).not.toContain('BroadcastCostCalculatorDialog');
  expect(page).not.toContain('<Slider');
});
