import { expect, test } from 'vitest';
import {
  bookingSampleMessage,
  humanEscalationSampleMessage,
  markNotificationTest,
} from '../../shared/telegramNotificationMessages';
import { formatEventTestPreview } from './testPreview';

test('creates a clearly marked sample message for each notification type', () => {
  const escalation = formatEventTestPreview('humanEscalation', 'Support Agent');
  const newBooking = formatEventTestPreview('bookingCreated', 'Support Agent');
  const updatedBooking = formatEventTestPreview('bookingUpdated', 'Support Agent');
  const cancelledBooking = formatEventTestPreview('bookingCancelled', 'Support Agent');

  expect(escalation).toBe(markNotificationTest(humanEscalationSampleMessage('Support Agent')));
  expect(newBooking).toBe(markNotificationTest(bookingSampleMessage('New booking', 'Support Agent')));
  expect(updatedBooking).toBe(markNotificationTest(bookingSampleMessage('Booking updated', 'Support Agent')));
  expect(cancelledBooking).toBe(markNotificationTest(bookingSampleMessage('Booking cancelled', 'Support Agent')));
  expect(escalation).toContain('Channel: WhatsApp');
  expect(escalation).toContain('Open: https://your-domain/dashboard/…/inbox?conversation=…');
  expect(newBooking).toContain('Open: https://your-domain/dashboard/…/calendar?eventId=…');
});
