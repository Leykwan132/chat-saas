import { expect, test } from 'vitest';
import { telegramNotificationOptions } from './telegramNotificationOptions';

test('shows booking and escalation details in notification samples', () => {
  const escalation = telegramNotificationOptions.find((option) => option.kind === 'humanEscalation');
  const newBooking = telegramNotificationOptions.find((option) => option.kind === 'bookingCreated');
  const updatedBooking = telegramNotificationOptions.find((option) => option.kind === 'bookingUpdated');
  const cancelledBooking = telegramNotificationOptions.find((option) => option.kind === 'bookingCancelled');

  expect(escalation?.preview).toContain('Customer: Sample Customer');
  expect(escalation?.preview).toContain('Latest message: I need help with my booking.');
  expect(escalation?.preview).toContain('Needs help: Please review the customer request.');

  for (const booking of [newBooking, updatedBooking, cancelledBooking]) {
    expect(booking.preview).toContain('Booking: Consultation - Sample Customer');
    expect(booking.preview).toContain('Date: August 6 (Thursday)');
    expect(booking.preview).toContain('Time: 10:00 AM - 10:30 AM (Asia/Kuala_Lumpur)');
    expect(booking.preview).toContain('Customer: Sample Customer <sample@example.com>');
    expect(booking.preview).toContain('Service: Consultation');
  }
  expect(newBooking?.preview).toContain('Status: Confirmed');
  expect(updatedBooking?.preview).toContain('Status: Updated');
  expect(cancelledBooking?.preview).toContain('Status: Cancelled');
});
