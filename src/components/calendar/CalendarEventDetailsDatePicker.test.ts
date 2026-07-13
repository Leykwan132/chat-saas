import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const editBodySource = readFileSync(
  new URL('./CalendarEventDetailsEditBody.tsx', import.meta.url),
  'utf8',
);

test('event detail editing uses the shared calendar date picker', () => {
  expect(editBodySource).toContain('<CalendarDatePickerField');
  expect(editBodySource).not.toContain('type="date"');
});
