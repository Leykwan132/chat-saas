import { useState } from 'react';
import { Conversation } from '@/components/ai-elements/conversation';
import type { Chat } from '@/components/ChatRow';
import { InboxConversationList } from '@/components/inbox/InboxConversationList';
import { InboxActionHistory } from '@/components/inbox/InboxActionHistory';
import { InboxThreadMessages } from '@/components/inbox/InboxThreadMessages';
import type { Id } from '../../../convex/_generated/dataModel';
import {
  buildDummyInboxEscalationMarker,
} from './inboxEscalationMarkers';
import { buildInboxEscalationPreviewMessages } from './inboxEscalationPreviewData';

const previewConversationId = 'dummy-inbox-escalation-conversation' as Id<'conversations'>;
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

const previewMessages = buildInboxEscalationPreviewMessages();

export function InboxEscalationPreview() {
  const [selectedConversationId, setSelectedConversationId] = useState<Id<'conversations'>>(
    previewConversationId,
  );
  const [actionHistoryOpen, setActionHistoryOpen] = useState(false);

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
      <aside className="w-72 shrink-0 border-l border-border bg-background">
        <InboxActionHistory
          open={actionHistoryOpen}
          logs={[{
            id: previewEscalation.id,
            action: 'escalation_raised',
            metadata: {
              question: previewEscalation.question,
              context: previewEscalation.context,
              sourceMessageId: previewEscalation.sourceMessageId,
            },
            performedAt: previewEscalation.escalatedAt,
            actorType: 'ai',
            actorName: 'AI',
          }]}
          onOpenChange={setActionHistoryOpen}
          onFocusEscalation={scrollToEscalation}
        />
      </aside>
    </div>
  );
}
