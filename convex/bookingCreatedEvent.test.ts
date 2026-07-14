import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

function source(path: string) {
  const fileUrl = new URL(path, import.meta.url);
  expect(existsSync(fileURLToPath(fileUrl))).toBe(true);
  return readFileSync(fileUrl, 'utf8');
}

test('the Booking created event delegates reminder preparation', () => {
  const events = source('./appointmentBooking/bookingEvents.ts');

  expect(events).toContain('scheduleWorkflowRemindersForAppointment(ctx, appointmentId)');
});
