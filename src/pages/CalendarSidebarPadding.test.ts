import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const source = readFileSync(new URL('./CalendarPage.tsx', import.meta.url), 'utf8');

test('gives calendar controls the same wider horizontal inset', () => {
  expect(source).toContain('<div className="px-4 py-[0.45rem]">');
  expect(source).toContain('<div className="px-4 pb-3">');
});
