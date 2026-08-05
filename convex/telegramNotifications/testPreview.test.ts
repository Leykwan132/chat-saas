import { expect, test } from 'vitest';
import { formatEventTestPreview } from './testPreview';

test('creates a clearly marked sample message for each notification type', () => {
  expect(formatEventTestPreview('humanEscalation', 'Support Agent')).toContain('TEST — Human escalation');
  expect(formatEventTestPreview('bookingCreated', 'Support Agent')).toContain('TEST — New booking');
  expect(formatEventTestPreview('bookingUpdated', 'Support Agent')).toContain('TEST — Booking updated');
  expect(formatEventTestPreview('bookingCancelled', 'Support Agent')).toContain('TEST — Booking cancelled');
});
