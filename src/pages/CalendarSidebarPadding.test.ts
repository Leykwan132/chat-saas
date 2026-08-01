import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const source = readFileSync(
  new URL('../components/calendar/CalendarSidebar.tsx', import.meta.url),
  'utf8',
);

test('gives calendar controls the same wider horizontal inset', () => {
  expect(source).toContain('<div className="px-4 py-[0.45rem]">');
  expect(source).toContain('<div className="px-4 pb-3">');
  expect(source).toContain('className="h-11 w-full gap-2 px-5 py-3"');
  expect(source).not.toContain('className="mt-2 h-11 w-full gap-2 px-5 py-3"');
});
