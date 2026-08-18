import { expect, test } from 'vitest';
import {
  buildDummyInboxEscalationMarker,
  buildInboxEscalationMarkers,
} from './inboxEscalationMarkers';

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

test('creates a dummy escalation marker without a real inbox message', () => {
  expect(buildDummyInboxEscalationMarker([])).toEqual({
    id: 'dummy-inbox-escalation',
    sourceMessageId: 'dummy-inbox-escalation-message',
    question: 'Can I speak with a person?',
    context: 'Preview of an AI-to-human escalation.',
    escalatedAt: expect.any(Number),
  });
});
