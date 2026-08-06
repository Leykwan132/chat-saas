import { expect, test } from 'vitest';
import { formatEventTestPreview } from './testPreview';

test('creates a clearly marked sample message for each notification type', () => {
  const escalation = formatEventTestPreview('humanEscalation', 'Support Agent');
  const newBooking = formatEventTestPreview('bookingCreated', 'Support Agent');
  const updatedBooking = formatEventTestPreview('bookingUpdated', 'Support Agent');
  const cancelledBooking = formatEventTestPreview('bookingCancelled', 'Support Agent');

  expect(escalation).toContain('TEST — Human escalation');
  expect(escalation).toContain('Customer: Sample Customer');
  expect(escalation).toContain('Needs help: Please review the customer request.');
  expect(newBooking).toContain('TEST — New booking');
  expect(newBooking).toContain('Status: Confirmed');
  expect(updatedBooking).toContain('TEST — Booking updated');
  expect(updatedBooking).toContain('Status: Updated');
  expect(cancelledBooking).toContain('TEST — Booking cancelled');
  expect(cancelledBooking).toContain('Status: Cancelled');
});
