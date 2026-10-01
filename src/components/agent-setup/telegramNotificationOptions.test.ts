import { expect, test } from 'vitest';
import {
  bookingSampleMessage,
  humanEscalationSampleMessage,
} from '../../../shared/telegramNotificationMessages';
import { telegramNotificationOptions } from './telegramNotificationOptions';

test('shows booking and escalation details in notification samples', () => {
  const escalation = telegramNotificationOptions.find((option) => option.kind === 'humanEscalation');
  const newBooking = telegramNotificationOptions.find((option) => option.kind === 'bookingCreated');
  const updatedBooking = telegramNotificationOptions.find((option) => option.kind === 'bookingUpdated');
  const cancelledBooking = telegramNotificationOptions.find((option) => option.kind === 'bookingCancelled');

  expect(escalation?.preview).toBe(humanEscalationSampleMessage());
  expect(newBooking?.preview).toBe(bookingSampleMessage('New booking'));
  expect(updatedBooking?.preview).toBe(bookingSampleMessage('Booking updated'));
  expect(cancelledBooking?.preview).toBe(bookingSampleMessage('Booking cancelled'));
});
