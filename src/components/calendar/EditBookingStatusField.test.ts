import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const fieldSource = readFileSync(new URL('./EditBookingStatusField.tsx', import.meta.url), 'utf8');
const dialogSource = readFileSync(new URL('./EditBookingDialog.tsx', import.meta.url), 'utf8');

test('appointment booking editor uses the shared four-state Select', () => {
  expect(fieldSource).toContain("from '@/components/ui/select'");
  expect(fieldSource).toContain('APPOINTMENT_BOOKING_STATUS_OPTIONS.map');
  expect(fieldSource).toContain('Status');
  expect(dialogSource).toContain('updateBookingStatus');
});

test('edit dialog remains a modular entrypoint', () => {
  expect(dialogSource.split('\n').length).toBeLessThanOrEqual(300);
});
