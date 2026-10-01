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
  const inboxUrl = "https://wa.me/12025550123";
  const escalation = formatEventTestPreview('humanEscalation', 'Support Agent', origin, agentId);
  const newBooking = formatEventTestPreview('bookingCreated', 'Support Agent', origin, agentId);
  const updatedBooking = formatEventTestPreview('bookingUpdated', 'Support Agent', origin, agentId);
  const cancelledBooking = formatEventTestPreview('bookingCancelled', 'Support Agent', origin, agentId);

  expect(escalation).toBe(markNotificationTest(humanEscalationSampleMessage('Support Agent', inboxUrl)));
  expect(newBooking).toBe(markNotificationTest(bookingSampleMessage('New booking', 'Support Agent', inboxUrl)));
  expect(updatedBooking).toBe(markNotificationTest(bookingSampleMessage('Booking updated', 'Support Agent', inboxUrl)));
  expect(cancelledBooking).toBe(markNotificationTest(bookingSampleMessage('Booking cancelled', 'Support Agent', inboxUrl)));
  expect(escalation).toContain(`Chat on WhatsApp: ${inboxUrl}`);
  expect(cancelledBooking).toContain(`Chat on WhatsApp: ${inboxUrl}`);
});

test('demo deliveries include chat buttons for every kind and calendar only for creation', async () => {
  const { eventTestNotification } = await import('./testPreview');
  for (const kind of ['humanEscalation', 'bookingCreated', 'bookingUpdated', 'bookingCancelled'] as const) {
    const demo = eventTestNotification(kind, 'Support Agent', 'https://chat.example.com', 'agent-1');
    expect(demo.buttons[0]).toEqual({ text: 'Chat on WhatsApp', url: 'https://wa.me/12025550123' });
    expect(demo.text).toContain('Chat on WhatsApp: https://wa.me/12025550123');
    if (kind === 'bookingCreated') {
      expect(demo.buttons).toHaveLength(2);
      const calendar = new URL(demo.buttons[1].url);
      expect(calendar.searchParams.get('dates')).toBe('20261002T020000Z/20261002T023000Z');
      expect(calendar.searchParams.get('details')).toContain(demo.buttons[0].url);
      expect(demo.text).toContain(`Add to Google Calendar: ${demo.buttons[1].url}`);
    } else {
      expect(demo.buttons).toHaveLength(1);
    }
  }
});
