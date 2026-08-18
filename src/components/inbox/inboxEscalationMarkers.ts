import type { InboxEscalationMarker } from '@/lib/formatMessageTime';
import type { InboxUIMessage } from '@/lib/inboxOptimistic';

export const DUMMY_INBOX_ESCALATION_SOURCE_MESSAGE_ID = 'dummy-inbox-escalation-message';

type ConversationLog = {
  _id: string;
  action: string;
  metadata?: unknown;
  performedAt: number;
};

type EscalationMetadata = {
  sourceMessageId: string;
  question: string;
  context: string;
};

export function getEscalationMetadata(metadata: unknown): EscalationMetadata | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const value = metadata as Record<string, unknown>;
  if (typeof value.sourceMessageId !== 'string') return null;
  return {
    sourceMessageId: value.sourceMessageId,
    question: typeof value.question === 'string' ? value.question : 'Human help requested',
    context: typeof value.context === 'string' ? value.context : '',
  };
}

export function buildInboxEscalationMarkers(logs: ConversationLog[] | undefined): InboxEscalationMarker[] {
  return (logs ?? []).flatMap((log) => {
    if (log.action !== 'escalation_raised') return [];
    const metadata = getEscalationMetadata(log.metadata);
    if (!metadata) return [];
    return [{
      id: log._id,
      sourceMessageId: metadata.sourceMessageId,
      question: metadata.question,
      context: metadata.context,
      escalatedAt: log.performedAt,
    }];
  });
}

export function buildDummyInboxEscalationMarker(
  _messages: InboxUIMessage[],
): InboxEscalationMarker {
  return {
    id: 'dummy-inbox-escalation',
    sourceMessageId: DUMMY_INBOX_ESCALATION_SOURCE_MESSAGE_ID,
    question: 'Can I speak with a person?',
    context: 'Preview of an AI-to-human escalation.',
    escalatedAt: Date.now(),
  };
}
