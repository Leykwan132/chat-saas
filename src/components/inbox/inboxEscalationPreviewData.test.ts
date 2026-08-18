import { expect, test } from 'vitest';
import { DUMMY_INBOX_ESCALATION_SOURCE_MESSAGE_ID } from './inboxEscalationMarkers';
import { buildInboxEscalationPreviewMessages } from './inboxEscalationPreviewData';

test('keeps the dummy escalation near the top of a long conversation', () => {
  const messages = buildInboxEscalationPreviewMessages();
  const escalationSourceIndex = messages.findIndex(
    (message) => message.ledgerMessageId === DUMMY_INBOX_ESCALATION_SOURCE_MESSAGE_ID,
  );

  expect(messages).toHaveLength(16);
  expect(escalationSourceIndex).toBe(2);
  expect(messages.slice(escalationSourceIndex + 1)).toHaveLength(13);
  expect(messages.at(-1)?.text).toBe('I have checked the order and I am ready to help with the refund.');
});
