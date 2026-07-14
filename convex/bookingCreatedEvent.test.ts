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

test('Calendar and Inbox use the same staff booking function', () => {
  const calendar = source('./appointmentBooking/calendarManualBooking.ts');
  const inbox = source('./appointmentBooking/manualBooking.ts');
  const staff = source('./appointmentBooking/staffBooking.ts');

  expect(calendar).toContain('createStaffBooking(ctx,');
  expect(inbox).toContain('createStaffBooking(ctx,');
  expect(staff).toContain('handleBookingCreated(ctx, eventId)');
  expect(calendar).not.toContain('scheduleWorkflowRemindersForAppointment');
  expect(inbox).not.toContain('scheduleWorkflowRemindersForAppointment');
});

test('AI booking uses the shared Booking created event', () => {
  const ai = source('./appointmentBooking/bookAppointment.ts');

  expect(ai).toContain('handleBookingCreated(ctx, eventId)');
  expect(ai).not.toContain('scheduleWorkflowRemindersForAppointment');
});
