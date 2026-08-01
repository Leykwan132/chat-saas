import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const source = readFileSync(new URL('./CalendarPage.tsx', import.meta.url), 'utf8');

test('aligns calendar filter controls with the new booking button inset', () => {
  expect(source).toContain('<div className="px-3 py-[0.45rem]">');
});
