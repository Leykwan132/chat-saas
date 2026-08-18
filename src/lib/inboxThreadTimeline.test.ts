import { expect, test } from 'vitest';
import { buildInboxThreadItems } from './formatMessageTime';

type BuildTimeline = (
  messages: Array<{
    key: string;
    _creationTime: number;
    ledgerMessageId?: string;
  }>,
  escalationMarkers: Array<{
    id: string;
    sourceMessageId: string;
    question: string;
    context: string;
    escalatedAt: number;
  }>,
) => Array<{ type: string; key?: string; message?: { key: string } }>;

test('inserts an escalation marker directly after its source customer message', () => {
  const buildTimeline = buildInboxThreadItems as unknown as BuildTimeline;

  const timeline = buildTimeline(
    [
      { key: 'first', _creationTime: 1_720_000_000_000, ledgerMessageId: 'message-1' },
      { key: 'second', _creationTime: 1_720_000_060_000, ledgerMessageId: 'message-2' },
    ],
    [
      {
        id: 'escalation-1',
        sourceMessageId: 'message-1',
        question: 'Can I get a refund?',
        context: 'A human needs to review the refund policy.',
        escalatedAt: 1_720_000_030_000,
      },
    ],
  );

  expect(timeline.map((item) => item.type)).toEqual([
    'day',
    'message',
    'escalation',
    'message',
  ]);
});
