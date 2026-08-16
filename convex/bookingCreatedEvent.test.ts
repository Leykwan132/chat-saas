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
  const prepare = source('./googleCalendar/staffBookingPrepare.ts');
  const finalize = source('./googleCalendar/staffBookingFinalize.ts');

  expect(calendar).toContain('runCalendarStaffBooking(ctx, args)');
  expect(inbox).toContain('runInboxStaffBooking(ctx, args)');
  expect(prepare).toContain('createStaffBooking(ctx,');
  expect(staff).toContain('handleBookingCreated(ctx, eventId)');
  expect(finalize).toContain('handleBookingCreated(ctx, event._id)');
  expect(calendar).not.toContain('scheduleWorkflowRemindersForAppointment');
  expect(inbox).not.toContain('scheduleWorkflowRemindersForAppointment');
});

test('AI booking uses the shared Booking created event', () => {
  const local = source('./googleCalendar/bookingPrepare.ts');
  const google = source('./googleCalendar/bookingFinalize.ts');

  expect(local).toContain('handleBookingCreated(ctx, eventId)');
  expect(google).toContain('handleBookingCreated(ctx, event._id)');
  expect(local).not.toContain('scheduleWorkflowRemindersForAppointment');
  expect(google).not.toContain('scheduleWorkflowRemindersForAppointment');
});
