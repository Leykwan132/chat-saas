import { expect, test } from 'vitest';
import { buildInboxThreadItems } from './formatMessageTime';

type BuildTimeline = (
  messages: Array<{
    key: string;
    _creationTime: number;
    ledgerMessageId?: string;
    role?: 'user' | 'assistant';
  }>,
  escalationMarkers: Array<{
    id: string;
    sourceMessageId: string;
    question: string;
    context: string;
    escalatedAt: number;
  }>,
) => Array<{ type: string; key?: string; message?: { key: string } }>;

function timelineKeys(
  timeline: Array<{ type: string; message?: { key: string } }>,
) {
  return timeline
    .filter((item) => item.type !== 'day')
    .map((item) => (item.type === 'message' ? item.message?.key : 'escalation'));
}

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

test('places a late WhatsApp message on its send time and keeps the escalation with the reply', () => {
  const buildTimeline = buildInboxThreadItems as unknown as BuildTimeline;
  const sept29 = Date.parse('2026-09-29T15:06:27.000Z');
  const sept30 = Date.parse('2026-09-30T03:49:34.000Z');
  const welcome = Date.parse('2026-10-01T11:34:55.000Z');
  const reply = Date.parse('2026-10-01T18:29:18.188Z');
  const escalatedAt = Date.parse('2026-10-01T18:29:20.167Z');

  const timeline = buildTimeline(
    [
      { key: 'kept-posted', _creationTime: sept30, role: 'user', ledgerMessageId: 'posted' },
      { key: 'welcome', _creationTime: welcome, role: 'assistant', ledgerMessageId: 'welcome' },
      { key: 'sherry', _creationTime: sept29, role: 'user', ledgerMessageId: 'sherry' },
      { key: 'team', _creationTime: reply, role: 'assistant', ledgerMessageId: 'team' },
    ],
    [
      {
        id: 'escalation-1',
        sourceMessageId: 'sherry',
        question: 'Visit',
        context: '',
        escalatedAt,
      },
    ],
  );

  expect(timelineKeys(timeline)).toEqual([
    'sherry',
    'kept-posted',
    'welcome',
    'escalation',
    'team',
  ]);
});
