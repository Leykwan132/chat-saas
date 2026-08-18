import type { InboxEscalationMarker } from '@/lib/formatMessageTime';

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
