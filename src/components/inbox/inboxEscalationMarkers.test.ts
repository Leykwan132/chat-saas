import { expect, test } from 'vitest';
import { buildInboxEscalationMarkers } from './inboxEscalationMarkers';

test('keeps an escalation marker linked to the source message recorded by action history', () => {
  const markers = buildInboxEscalationMarkers([
    {
      _id: 'escalation-log',
      action: 'escalation_raised',
      metadata: {
        sourceMessageId: 'customer-message',
        question: 'Can I speak with a person?',
        context: 'The customer asked for human help.',
      },
      performedAt: 1_720_000_030_000,
    },
  ]);

  expect(markers).toEqual([
    {
      id: 'escalation-log',
      sourceMessageId: 'customer-message',
      question: 'Can I speak with a person?',
      context: 'The customer asked for human help.',
      escalatedAt: 1_720_000_030_000,
    },
  ]);
});
