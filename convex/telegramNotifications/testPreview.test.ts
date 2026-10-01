import { expect, test } from 'vitest';
import {
  bookingSampleMessage,
  humanEscalationSampleMessage,
  markNotificationTest,
} from '../../shared/telegramNotificationMessages';
import { formatEventTestPreview } from './testPreview';

test('creates a clearly marked sample message for each notification type', () => {
  const origin = 'https://chat.gosolutions.sg';
  const agentId = 'agent-1';
  const inboxUrl = `${origin}/dashboard/${agentId}/inbox`;
  const calendarUrl = `${origin}/dashboard/${agentId}/calendar`;
  const escalation = formatEventTestPreview('humanEscalation', 'Support Agent', origin, agentId);
  const newBooking = formatEventTestPreview('bookingCreated', 'Support Agent', origin, agentId);
  const updatedBooking = formatEventTestPreview('bookingUpdated', 'Support Agent', origin, agentId);
  const cancelledBooking = formatEventTestPreview('bookingCancelled', 'Support Agent', origin, agentId);

  expect(escalation).toBe(markNotificationTest(humanEscalationSampleMessage('Support Agent', inboxUrl)));
  expect(newBooking).toBe(markNotificationTest(bookingSampleMessage('New booking', 'Support Agent', calendarUrl)));
  expect(updatedBooking).toBe(markNotificationTest(bookingSampleMessage('Booking updated', 'Support Agent', calendarUrl)));
  expect(cancelledBooking).toBe(markNotificationTest(bookingSampleMessage('Booking cancelled', 'Support Agent', calendarUrl)));
  expect(escalation).toContain(`Open: ${inboxUrl}`);
  expect(cancelledBooking).toContain(`Open: ${calendarUrl}`);
});
