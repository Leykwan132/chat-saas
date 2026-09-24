import { LoaderCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InboxSearchHighlight } from '@/components/inbox/inboxSearchHighlight';
import type { Id } from '../../../convex/_generated/dataModel';

type SearchRow = {
  conversationId: Id<'conversations'>;
  contactName?: string;
  service: string;
  tags: string[];
  hasBooking: boolean;
  leadTemperature?: 'Hot' | 'Warm' | 'Cold';
  isEscalated: boolean;
  lastMessageAt: number;
};

type MessageSearchRow = SearchRow & { matchedMessageId: Id<'messages'>; matchedMessage: string; matchedMessageAt: number };

function relativeTime(timestamp: number) {
  const days = Math.floor((Date.now() - timestamp) / 86_400_000);
  return days <= 0 ? 'Today' : `${days}d ago`;
}

function ResultRow({ row, query, message, onSelect }: {
  row: SearchRow;
  query: string;
  message: string;
  onSelect: (conversationId: Id<'conversations'>, messageId?: Id<'messages'>) => void;
}) {
  return (
    <button
      type="button"
      className="block w-full border-b border-border px-4 py-3 text-left hover:bg-muted/50"
      onClick={() => onSelect(row.conversationId)}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="truncate text-sm font-semibold">{row.contactName ?? 'Unknown contact'}</span>
        <span className="shrink-0 text-[11px] text-muted-foreground">{relativeTime(row.lastMessageAt)}</span>
      </div>
      <p className="mt-1 truncate text-xs text-muted-foreground"><InboxSearchHighlight text={message} query={query} /></p>
      <div className="mt-2 flex flex-wrap gap-1 text-[10px] text-muted-foreground">
        {row.hasBooking ? <span className="rounded-full bg-muted px-2 py-0.5">Booked</span> : null}
        {row.isEscalated ? <span className="rounded-full bg-muted px-2 py-0.5">Escalated</span> : null}
        {row.leadTemperature ? <span className="rounded-full bg-muted px-2 py-0.5">{row.leadTemperature}</span> : null}
        {row.tags.slice(0, 2).map((tag) => <span key={tag} className="rounded-full bg-muted px-2 py-0.5">{tag}</span>)}
      </div>
    </button>
  );
}

export function InboxSearchResults({
  searchQuery,
  chats,
  messages,
  messageStatus,
  onLoadMore,
  onSelect,
}: {
  searchQuery: string;
  chats: SearchRow[] | undefined;
  messages: MessageSearchRow[];
  messageStatus: 'LoadingFirstPage' | 'CanLoadMore' | 'LoadingMore' | 'Exhausted';
  onLoadMore: () => void;
  onSelect: (conversationId: Id<'conversations'>, messageId?: Id<'messages'>) => void;
}) {
  const isLoading = chats === undefined || messageStatus === 'LoadingFirstPage';
  if (isLoading) return <div className="flex justify-center p-8"><LoaderCircle className="size-5 animate-spin" /></div>;
  if (chats.length === 0 && messages.length === 0) {
    return <div className="flex flex-col items-center gap-2 px-6 py-16 text-center text-sm text-muted-foreground"><Search className="size-8 opacity-40" /><p className="m-0 font-medium text-foreground">No search results</p><p className="m-0 text-xs">Try another name, contact detail, or message text.</p></div>;
  }
  return <>
    {chats.length > 0 ? <><div className="border-b border-border px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Chats</div>{chats.map((row) => <ResultRow key={row.conversationId} row={row} query={searchQuery} message={row.contactName ?? ''} onSelect={onSelect} />)}</> : null}
    {messages.length > 0 ? <><div className="border-b border-border px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Matched Messages</div>{messages.map((row) => <ResultRow key={row.matchedMessageId} row={{ ...row, lastMessageAt: row.matchedMessageAt }} query={searchQuery} message={row.matchedMessage} onSelect={(conversationId) => onSelect(conversationId, row.matchedMessageId)} />)}</> : null}
    {messageStatus === 'CanLoadMore' || messageStatus === 'LoadingMore' ? <div className="flex justify-center border-t border-border p-3"><Button variant="ghost" size="sm" disabled={messageStatus === 'LoadingMore'} onClick={onLoadMore}>{messageStatus === 'LoadingMore' ? <LoaderCircle className="size-3.5 animate-spin" /> : null}{messageStatus === 'LoadingMore' ? 'Loading messages' : 'Load more messages'}</Button></div> : null}
  </>;
}
