import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const source = readFileSync(
  new URL('./CreateCustomerBookingDialog.tsx', import.meta.url),
  'utf8',
);

test('uses shared schedule controls and automatic exact-slot availability', () => {
  expect(source).toContain('CalendarDatePickerField');
  expect(source).toContain('TimeSelectInput');
  expect(source).toContain('label="Booking Date"');
  expect(source).toContain('label="Booking Time"');
  expect(source).toContain('Checking availability…');
  expect(source).toContain('Slot is available.');
  expect(source).toContain("import { Check, X } from 'lucide-react'");
  expect(source).toMatch(/<Check[^>]*aria-hidden="true"[^>]*\/>\s*Slot is available\./);
  expect(source).toMatch(/<X[^>]*aria-hidden="true"[^>]*\/>\s*\{availability\.message\}/);
  expect(source).toContain('checkAvailability');
  expect(source).toContain('className="h-10 w-full"');
  expect(source).not.toContain('Find available times');
  expect(source).not.toContain('listAvailableSlots');
  expect(source).not.toContain('setSlots');
  expect(source).not.toContain('type="date"');
  expect(source).not.toContain('type="time"');
});
