import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const pageSource = readFileSync(
  new URL('./BroadcastDetailPage.tsx', import.meta.url),
  'utf8',
);

test('delegates overview and recipients rendering to focused components', () => {
  expect(pageSource).toContain('<BroadcastDetailOverview');
  expect(pageSource).toContain('<BroadcastRecipientsTable');
  expect(pageSource).not.toContain('<table');
});

test('keeps the route page below the code file limit', () => {
  expect(pageSource.trimEnd().split('\n').length).toBeLessThanOrEqual(300);
});
