import { expect, test } from 'vitest';
import { googleCalendarBookingUrl, notificationButtons } from './telegramNotificationActions';

test('prefills a calendar event with the exact booking time, location, and chat', () => {
  const url = new URL(googleCalendarBookingUrl({
    title: 'Consultation — Alicia Tan',
    startAt: Date.parse('2026-10-02T08:00:00Z'),
    endAt: Date.parse('2026-10-02T08:30:00Z'),
    timeZone: 'Asia/Kuala_Lumpur',
    location: 'Room 2 & reception',
    chatUrl: 'https://chat.example.com/dashboard/agent/inbox?conversation=chat-1',
  }));
  expect(url.origin).toBe('https://calendar.google.com');
  expect(url.searchParams.get('action')).toBe('TEMPLATE');
  expect(url.searchParams.get('text')).toBe('Consultation — Alicia Tan');
  expect(url.searchParams.get('dates')).toBe('20261002T080000Z/20261002T083000Z');
  expect(url.searchParams.get('ctz')).toBe('Asia/Kuala_Lumpur');
  expect(url.searchParams.get('location')).toBe('Room 2 & reception');
  expect(url.searchParams.get('details')).toContain('https://chat.example.com/dashboard/agent/inbox?conversation=chat-1');
});

test('keeps all-day bookings as dates with an exclusive end date', () => {
  const url = new URL(googleCalendarBookingUrl({
    title: 'All-day consultation',
    startAt: Date.parse('2026-10-01T16:00:00Z'),
    endAt: Date.parse('2026-10-02T16:00:00Z'),
    timeZone: 'Asia/Kuala_Lumpur',
    allDay: true,
    chatUrl: 'https://chat.example.com/inbox',
  }));
  expect(url.searchParams.get('dates')).toBe('20261002/20261003');
});

test('keeps chat access alongside the optional calendar action', () => {
  expect(notificationButtons('https://chat.example.com/inbox', 'https://calendar.google.com/event')).toEqual([
    { text: 'Open chat', url: 'https://chat.example.com/inbox' },
    { text: 'Add to Google Calendar', url: 'https://calendar.google.com/event' },
  ]);
  expect(notificationButtons('https://chat.example.com/inbox')).toEqual([
    { text: 'Open chat', url: 'https://chat.example.com/inbox' },
  ]);
});
