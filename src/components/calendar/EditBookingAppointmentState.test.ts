import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import {
  bookingMutationErrorMessage,
  resolveAppointmentBookingEditStatus,
  resolveEditBookingDialogContent,
} from './editBookingModel';

const dialogSource = readFileSync(new URL('./EditBookingDialog.tsx', import.meta.url), 'utf8');
const modelSource = readFileSync(new URL('./editBookingModel.ts', import.meta.url), 'utf8');
const statusQuerySource = readFileSync(
  new URL('../../../convex/appointmentBooking/editBookingStatus.ts', import.meta.url),
  'utf8',
);

test('appointment editor rejects missing and unsupported booking sessions visibly', () => {
  expect(modelSource).toContain('resolveAppointmentBookingEditStatus');
  expect(modelSource).toContain("status === 'booked'");
  expect(modelSource).toContain("status === 'completed'");
  expect(modelSource).toContain("status === 'cancelled'");
  expect(modelSource).toContain("status === 'no_show'");
  expect(dialogSource).toContain('Booking status is unavailable');
  expect(dialogSource).toContain('Booking status cannot be edited right now');
});

test('appointment editor reads status from a focused Convex module', () => {
  expect(dialogSource).toContain('api.appointmentBooking.editBookingStatus.getEditBookingStatus');
  expect(statusQuerySource).toContain('export const getEditBookingStatus = query');
  expect(statusQuerySource).toContain('.withIndex("by_calendarEventId"');
});

test('missing booking sessions resolve to a visible error state', () => {
  expect(resolveAppointmentBookingEditStatus({ kind: 'missing_session' })).toEqual({ kind: 'missing' });
});

test.each(['collecting', 'confirming', 'editing'])('%s booking sessions cannot initialize the status Select', (status) => {
  expect(resolveAppointmentBookingEditStatus({ kind: 'unsupported_status', status })).toEqual({ kind: 'unsupported' });
});

test.each(['booked', 'completed', 'cancelled', 'no_show'])('%s booking sessions initialize the status Select', (status) => {
  expect(resolveAppointmentBookingEditStatus({ kind: 'editable', status })).toEqual({ kind: 'editable', status });
});

test('a resolved missing event renders not found instead of loading', () => {
  expect(resolveEditBookingDialogContent({
    open: true,
    eventData: null,
    statusLoading: false,
    statusError: null,
    formState: null,
  })).toBe('notFound');
});

test('booking mutation errors preserve Error messages and rethrow non-Errors', () => {
  expect(bookingMutationErrorMessage(new Error('Calendar unavailable'))).toBe('Calendar unavailable');
  expect(() => bookingMutationErrorMessage('Calendar unavailable')).toThrow('Calendar unavailable');
});
