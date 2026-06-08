import { ArrowDownWideNarrow, ArrowUpWideNarrow, MessageSquare, Pin, Search } from 'lucide-react';
import { ChatRow, type Chat } from '@/components/ChatRow';
import {
  inboxColumnClassName,
  inboxColumnHeaderClassName,
  inboxColumnScrollClassName,
} from '@/components/inbox/inboxLayout';
import { InboxConversationListSkeleton } from '@/components/inbox/InboxPageSkeleton';
import {
  InboxActiveFilterChips,
  type InboxActiveFilter,
} from '@/components/inbox/InboxActiveFilterChips';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { Id } from '../../../convex/_generated/dataModel';

export type InboxConversationSort = 'newest' | 'oldest';

type InboxConversationListProps = {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  conversationSort: InboxConversationSort;
  onConversationSortChange: (sort: InboxConversationSort) => void;
  loading: boolean;
  filteredChats: Chat[];
  pinnedChats: Chat[];
  unpinnedChats: Chat[];
  totalConversationCount: number;
  selectedConversationId: Id<'conversations'> | null;
  onSelectConversation: (id: Id<'conversations'>) => void;
  onTogglePin: (id: Id<'conversations'>) => void;
  activeFilters?: InboxActiveFilter[];
  onRemoveActiveFilter?: (id: string) => void;
};

export function InboxConversationList({
  searchQuery,
  onSearchQueryChange,
  conversationSort,
  onConversationSortChange,
  loading,
  filteredChats,
  pinnedChats,
  unpinnedChats,
  totalConversationCount,
  selectedConversationId,
  onSelectConversation,
  onTogglePin,
  activeFilters = [],
  onRemoveActiveFilter,
}: InboxConversationListProps) {
  const SortIcon = conversationSort === 'newest' ? ArrowDownWideNarrow : ArrowUpWideNarrow;
  const sortLabel =
    conversationSort === 'newest' ? 'Newest first' : 'Oldest first';

  return (
    <div
      className={cn(
        inboxColumnClassName,
        'w-[300px] shrink-0 border-r border-border bg-background',
      )}
    >
      <div className={cn(inboxColumnHeaderClassName, 'gap-2 px-3')}>
        {loading ? (
          <>
            <Skeleton className="h-9 min-w-0 flex-1 rounded-lg" />
            <Skeleton className="size-8 shrink-0 rounded-md" />
          </>
        ) : (
          <>
            <div className="relative min-w-0 flex-1">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-background py-0 pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/30"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'size-8 shrink-0 bg-muted/50 text-foreground hover:bg-muted hover:text-foreground',
                    conversationSort === 'oldest' && 'bg-muted',
                  )}
                  aria-label={`Sort: ${sortLabel}`}
                >
                  <SortIcon className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-44">
                <DropdownMenuRadioGroup
                  value={conversationSort}
                  onValueChange={(value) =>
                    onConversationSortChange(value as InboxConversationSort)
                  }
                >
                  <DropdownMenuRadioItem value="newest">Newest first</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="oldest">Oldest first</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
      {!loading && activeFilters.length > 0 && onRemoveActiveFilter ? (
        <div className="shrink-0 border-b border-border px-3 py-2">
          <InboxActiveFilterChips
            filters={activeFilters}
            onRemove={onRemoveActiveFilter}
          />
        </div>
      ) : null}

      <div className={cn(inboxColumnScrollClassName, 'no-scrollbar relative')}>
        {loading ? (
          <InboxConversationListSkeleton />
        ) : filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center text-sm text-muted-foreground">
            <MessageSquare className="size-8 opacity-40" />
            {totalConversationCount > 0 ? (
              <>
                <p className="m-0 font-medium text-foreground">No conversations match</p>
                <p className="m-0 text-xs leading-relaxed">
                  Try removing a filter or adjusting your search to see more conversations.
                </p>
              </>
            ) : (
              <>
                <p className="m-0 font-medium text-foreground">No conversations yet</p>
                <p className="m-0 text-xs leading-relaxed">
                  When customers message your connected channels, threads appear here.
                </p>
              </>
            )}
          </div>
        ) : (
          <>
            {pinnedChats.length > 0 ? (
              <>
                <div className="flex items-center gap-1.5 border-b border-border px-4 py-2">
                  <Pin size={11} className="text-muted-foreground" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Pinned
                  </span>
                </div>
                {pinnedChats.map((chat, index) => (
                  <ChatRow
                    key={chat.id}
                    chat={chat}
                    index={index}
                    total={pinnedChats.length}
                    isSelected={selectedConversationId === chat.id}
                    isPinned
                    onSelect={onSelectConversation}
                    onTogglePin={onTogglePin}
                  />
                ))}
                <div className="flex items-center gap-1.5 border-b border-t border-border px-4 py-2">
                  <MessageSquare size={11} className="text-muted-foreground" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    All
                  </span>
                </div>
              </>
            ) : null}

            {unpinnedChats.map((chat, index) => (
              <ChatRow
                key={chat.id}
                chat={chat}
                index={index}
                total={unpinnedChats.length}
                isSelected={selectedConversationId === chat.id}
                isPinned={false}
                onSelect={onSelectConversation}
                onTogglePin={onTogglePin}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
