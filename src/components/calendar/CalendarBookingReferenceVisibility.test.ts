import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const viewSource = readFileSync(
  new URL('./CalendarEventDetailsBody.tsx', import.meta.url),
  'utf8',
);
const editSource = readFileSync(
  new URL('./CalendarEventDetailsEditBody.tsx', import.meta.url),
  'utf8',
);

test('booking reference is visible only in event detail view mode', () => {
  expect(viewSource).toContain("label: 'Booking reference'");
  expect(editSource).not.toContain('Booking reference');
  expect(editSource).not.toContain('Saved after booking');
});
