import { useState } from 'react';
import { Conversation } from '@/components/ai-elements/conversation';
import type { Chat } from '@/components/ChatRow';
import { InboxConversationList } from '@/components/inbox/InboxConversationList';
import { InboxThreadMessages } from '@/components/inbox/InboxThreadMessages';
import { Button } from '@/components/ui/button';
import type { Id } from '../../../convex/_generated/dataModel';
import type { InboxUIMessage } from '@/lib/inboxOptimistic';
import {
  buildDummyInboxEscalationMarker,
  DUMMY_INBOX_ESCALATION_SOURCE_MESSAGE_ID,
} from './inboxEscalationMarkers';

const previewConversationId = 'dummy-inbox-escalation-conversation' as Id<'conversations'>;
const previewTimestamp = new Date('2026-08-18T09:30:00.000Z').getTime();
const previewEscalation = buildDummyInboxEscalationMarker([]);

const previewConversation: Chat = {
  id: previewConversationId,
  name: 'Maya Thompson',
  message: 'I need to speak with someone about a refund.',
  time: 'just now',
  unread: 1,
  platform: 'whatsapp',
  requiresAction: true,
  conversationStatus: 'requires_user_input',
  escalation: {
    question: previewEscalation.question,
    context: previewEscalation.context,
    escalatedAt: previewEscalation.escalatedAt,
  },
};

const previewMessages: InboxUIMessage[] = [
  {
    id: DUMMY_INBOX_ESCALATION_SOURCE_MESSAGE_ID,
    key: DUMMY_INBOX_ESCALATION_SOURCE_MESSAGE_ID,
    order: 0,
    stepOrder: 0,
    status: 'complete',
    role: 'user',
    text: 'I need to speak with someone about a refund.',
    parts: [{ type: 'text', text: 'I need to speak with someone about a refund.' }],
    _creationTime: previewTimestamp,
    ledgerMessageId: DUMMY_INBOX_ESCALATION_SOURCE_MESSAGE_ID,
  },
  {
    id: 'dummy-inbox-follow-up',
    key: 'dummy-inbox-follow-up',
    order: 1,
    stepOrder: 0,
    status: 'complete',
    role: 'assistant',
    text: 'A teammate will take over from here.',
    parts: [{ type: 'text', text: 'A teammate will take over from here.' }],
    _creationTime: previewTimestamp + 60_000,
    sentByAi: true,
  },
];

export function InboxEscalationPreview() {
  const [selectedConversationId, setSelectedConversationId] = useState<Id<'conversations'>>(
    previewConversationId,
  );

  const scrollToEscalation = () => {
    const marker = document.getElementById(`inbox-escalation-${previewEscalation.id}`);
    marker?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    marker?.focus({ preventScroll: true });
  };

  return (
    <div className="flex h-full max-h-full min-h-0 w-full overflow-hidden">
      <InboxConversationList
        searchQuery=""
        onSearchQueryChange={() => undefined}
        conversationSort="newest"
        onConversationSortChange={() => undefined}
        loading={false}
        filteredChats={[previewConversation]}
        pinnedChats={[]}
        unpinnedChats={[previewConversation]}
        totalConversationCount={1}
        selectedConversationId={selectedConversationId}
        onSelectConversation={setSelectedConversationId}
        onTogglePin={() => undefined}
      />
      <div className="flex min-w-0 flex-1 flex-col bg-background">
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <div>
            <h2 className="m-0 text-sm font-semibold text-foreground">Maya Thompson</h2>
            <p className="m-0 text-xs text-muted-foreground">Dummy escalation preview</p>
          </div>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-400">
            Escalated
          </span>
        </div>
        <Conversation className="min-h-0 flex-1">
          <InboxThreadMessages
            messages={previewMessages}
            escalationMarkers={[previewEscalation]}
            onReact={() => undefined}
            onRemoveReaction={() => undefined}
          />
        </Conversation>
      </div>
      <aside className="w-72 shrink-0 border-l border-border bg-background p-4">
        <h3 className="m-0 text-sm font-semibold text-foreground">Action History</h3>
        <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3">
          <p className="m-0 text-sm text-foreground">Human escalation raised</p>
          <p className="mt-1 text-xs text-muted-foreground">AI needs a teammate to review the refund request.</p>
          <Button type="button" variant="link" className="mt-1 h-auto px-0 text-xs" onClick={scrollToEscalation}>
            View in chat
          </Button>
        </div>
      </aside>
    </div>
  );
}
