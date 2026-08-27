import { Bot, FlaskConical } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Conversation } from '@/components/ai-elements/conversation';
import { Switch } from '@/components/ui/switch';
import { InboxConversationList, type InboxConversationSort } from '@/components/inbox/InboxConversationList';
import { InboxMobileConversationSwitcher } from '@/components/inbox/InboxMobileConversationSwitcher';
import { InboxMobileDetailsSheet } from '@/components/inbox/InboxMobileDetailsSheet';
import { InboxReplyInput } from '@/components/inbox/InboxReplyInput';
import { InboxThreadMessages } from '@/components/inbox/InboxThreadMessages';
import {
  INBOX_DEMO_CONTACT_DETAILS,
  INBOX_DEMO_CONVERSATIONS,
  INBOX_DEMO_MESSAGES,
  INBOX_DEMO_PLATFORM_LABELS,
} from '@/components/inbox/inboxDemoData';
import type { Id } from '../../../convex/_generated/dataModel';

export function InboxDemoPreview() {
  const [selectedId, setSelectedId] = useState<Id<'conversations'>>(
    INBOX_DEMO_CONVERSATIONS[0].id,
  );
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState<InboxConversationSort>('newest');
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [aiRepliesEnabled, setAiRepliesEnabled] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const selectedConversation = useMemo(
    () => INBOX_DEMO_CONVERSATIONS.find((conversation) => conversation.id === selectedId)!,
    [selectedId],
  );

  const filteredChats = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const chats = query
      ? INBOX_DEMO_CONVERSATIONS.filter(
          (conversation) =>
            conversation.name.toLowerCase().includes(query) ||
            conversation.message.toLowerCase().includes(query),
        )
      : [...INBOX_DEMO_CONVERSATIONS];
    return chats.sort((a, b) => (sort === 'newest' ? b.time.localeCompare(a.time) : a.time.localeCompare(b.time)));
  }, [searchQuery, sort]);

  const pinnedChats = filteredChats.filter((chat) => pinnedIds.has(chat.id as string));
  const unpinnedChats = filteredChats.filter((chat) => !pinnedIds.has(chat.id as string));

  const selectConversation = (id: Id<'conversations'>) => {
    setSelectedId(id);
    setSwitcherOpen(false);
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-background md:hidden">
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
        <InboxMobileConversationSwitcher
          open={switcherOpen}
          onOpenChange={setSwitcherOpen}
          customerName={selectedConversation.name}
        >
          <InboxConversationList
            fullWidth
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            conversationSort={sort}
            onConversationSortChange={setSort}
            loading={false}
            filteredChats={filteredChats}
            pinnedChats={pinnedChats}
            unpinnedChats={unpinnedChats}
            totalConversationCount={INBOX_DEMO_CONVERSATIONS.length}
            selectedConversationId={selectedId}
            onSelectConversation={selectConversation}
            onTogglePin={(id) =>
              setPinnedIds((current) => {
                const next = new Set(current);
                const key = id as string;
                if (next.has(key)) next.delete(key);
                else next.add(key);
                return next;
              })
            }
          />
        </InboxMobileConversationSwitcher>
        <div className="ml-auto flex items-center gap-1.5 px-0 py-0">
          <Bot className="size-3.5 text-muted-foreground" aria-hidden />
          <span className="text-xs text-muted-foreground">AI replies</span>
          <Switch
            aria-label="Turn off AI replies"
            checked={aiRepliesEnabled}
            onCheckedChange={setAiRepliesEnabled}
            className="data-[state=checked]:bg-emerald-600"
          />
        </div>
        <InboxMobileDetailsSheet
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          customerName={selectedConversation.name}
          platform={INBOX_DEMO_PLATFORM_LABELS[selectedConversation.platform]}
          phone={INBOX_DEMO_CONTACT_DETAILS[selectedConversation.id as string].phone}
          email={INBOX_DEMO_CONTACT_DETAILS[selectedConversation.id as string].email}
          status={selectedConversation.conversationStatus.replaceAll('_', ' ')}
          leadTemperature={selectedConversation.leadTemperature}
          tags={selectedConversation.tags}
        />
      </div>

      <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-1.5 text-[11px] text-muted-foreground">
        <FlaskConical className="size-3.5" aria-hidden />
        <span>Demo data · development only</span>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <Conversation className="absolute inset-0 min-h-0">
          <InboxThreadMessages
            messages={INBOX_DEMO_MESSAGES[selectedConversation.id as string]}
            emptyTitle="No messages in this demo conversation"
            emptyDescription="Choose another customer to preview their chat."
          />
        </Conversation>
      </div>

      <div className="shrink-0 border-t border-border bg-background p-3">
        <InboxReplyInput
          value=""
          onChange={() => undefined}
          onSubmit={() => undefined}
          disabled
          placeholder="Demo mode — replies are disabled"
        />
      </div>
    </div>
  );
}
