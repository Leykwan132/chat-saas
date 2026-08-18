import type { InboxUIMessage } from '@/lib/inboxOptimistic';
import { DUMMY_INBOX_ESCALATION_SOURCE_MESSAGE_ID } from './inboxEscalationMarkers';

const previewTimestamp = new Date('2026-08-18T09:30:00.000Z').getTime();

const previewMessageSeeds = [
  ['user', 'Hi, I was charged twice for order #8742.'],
  ['assistant', 'I can help look into that. Can you confirm the email on the order?'],
  ['user', 'It is maya.thompson@example.com. I need to speak with someone about a refund.'],
  ['assistant', 'I have flagged this for a teammate so they can review the payment details.'],
  ['user', 'Thank you. I need the refund before my card payment is due.'],
  ['assistant', 'I understand. I have included that timing in the handoff.'],
  ['user', 'The duplicate charge was $89.00 and both payments are showing as completed.'],
  ['assistant', 'Thank you for the details. A human teammate will confirm the next steps shortly.'],
  ['user', 'Should I send a screenshot of my bank statement?'],
  ['assistant', 'That may help. Please keep any confirmation emails handy as well.'],
  ['user', 'I have the order confirmation and both transaction references.'],
  ['assistant', 'Perfect. Your case now has everything needed for the refund review.'],
  ['user', 'Will I receive an email when the refund is approved?'],
  ['assistant', 'Yes, the team will update you by email once the review is complete.'],
  ['user', 'Okay, I will wait for their update.'],
  ['assistant', 'I have checked the order and I am ready to help with the refund.'],
] as const;

export function buildInboxEscalationPreviewMessages(): InboxUIMessage[] {
  return previewMessageSeeds.map(([role, text], index) => {
    const isEscalationSource = index === 2;
    const id = isEscalationSource
      ? DUMMY_INBOX_ESCALATION_SOURCE_MESSAGE_ID
      : `dummy-inbox-preview-${index}`;

    return {
      id,
      key: id,
      order: index,
      stepOrder: 0,
      status: 'complete',
      role,
      text,
      parts: [{ type: 'text', text }],
      _creationTime: previewTimestamp + index * 60_000,
      ...(isEscalationSource ? { ledgerMessageId: id } : {}),
      ...(role === 'assistant' ? { sentByAi: true } : {}),
    };
  });
}
