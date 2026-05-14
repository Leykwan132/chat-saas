import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useAction, useMutation, useQuery } from 'convex/react';
import {
  Archive,
  Calendar,
  ChevronDown,
  CircleDot,
  MessageSquare,
  Moon,
  MoreVertical,
  Paperclip,
  Pin,
  Plug,
  RotateCcw,
  Search,
  Send,
  type LucideIcon,
} from 'lucide-react';
import { SiInstagram, SiMessenger, SiWhatsapp } from 'react-icons/si';
import { toast } from 'sonner';
import { ChatRow, type ConversationPlatform } from '@/components/ChatRow';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
import { api } from '../../convex/_generated/api';
import type { Doc, Id } from '../../convex/_generated/dataModel';

const PLATFORM_LABEL: Record<ConversationPlatform, string> = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  messenger: 'Messenger',
};

type InboxLabelFilter = 'all' | 'open' | 'snoozed' | 'closed';

type StatusKey = Exclude<InboxLabelFilter, 'all'>;

const STATUS_LABEL_MENU: Record<
  StatusKey,
  { title: string; Icon: LucideIcon; iconClass: string }
> = {
  open: { title: 'Open', Icon: CircleDot, iconClass: 'text-emerald-600' },
  snoozed: { title: 'Snoozed', Icon: Moon, iconClass: 'text-amber-500' },
  closed: { title: 'Closed', Icon: Archive, iconClass: 'text-slate-500 dark:text-slate-400' },
};

const STATUS_LABEL_OPTIONS: StatusKey[] = ['open', 'snoozed', 'closed'];

function formatRelative(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  if (diffMs < 0) return 'just now';
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function messageBodyPreview(m: Doc<'messages'>): string {
  switch (m.contentType) {
    case 'image':
      return '[Image]';
    case 'audio':
      return '[Audio]';
    case 'video':
      return '[Video]';
    case 'document':
      return '[Document]';
    case 'unknown':
      return m.content.trim() ? m.content : '[Message]';
    default:
      return m.content;
  }
}

/** Skip bubbles that would show no body (e.g. blank text). Keep failed rows with a reason. */
function shouldRenderThreadMessage(m: Doc<'messages'>): boolean {
  if (m.status === 'failed' && m.failureReason?.trim()) return true;
  return messageBodyPreview(m).trim().length > 0;
}

function HeaderPlatformIcon({ platform }: { platform: ConversationPlatform }) {
  const common = { size: 18 } as const;
  switch (platform) {
    case 'whatsapp':
      return <SiWhatsapp {...common} className="text-[#25D366]" />;
    case 'instagram':
      return <SiInstagram {...common} className="text-[#E4405F]" />;
    case 'messenger':
      return <SiMessenger {...common} className="text-[#0866FF]" />;
  }
}

function PlatformMenuIcon({
  platform,
  size = 16,
}: {
  platform: ConversationPlatform;
  size?: number;
}) {
  const common = { size } as const;
  switch (platform) {
    case 'whatsapp':
      return <SiWhatsapp {...common} className="shrink-0 text-[#25D366]" />;
    case 'instagram':
      return <SiInstagram {...common} className="shrink-0 text-[#E4405F]" />;
    case 'messenger':
      return <SiMessenger {...common} className="shrink-0 text-[#0866FF]" />;
  }
}

/** Staggered skeleton while the active thread’s Convex data is loading. */
function ChatThreadSkeleton() {
  const rows = [
    { side: 'left' as const, w: 'min(78%, 320px)' },
    { side: 'right' as const, w: 'min(62%, 240px)' },
    { side: 'left' as const, w: 'min(70%, 280px)' },
    { side: 'right' as const, w: 'min(55%, 200px)' },
    { side: 'left' as const, w: 'min(65%, 260px)' },
  ];
  return (
    <div
      className="flex flex-1 flex-col gap-3 px-6 py-5"
      aria-busy
      aria-label="Loading messages"
    >
      {rows.map((row, i) => (
        <div
          key={i}
          className={`flex w-full ${row.side === 'right' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className="h-[42px] rounded-2xl bg-muted/80 motion-safe:animate-pulse"
            style={{
              width: row.w,
              animationDelay: `${i * 90}ms`,
              animationDuration: '1.1s',
            }}
          />
        </div>
      ))}
    </div>
  );
}

function DetailsPanelSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-5 motion-safe:animate-pulse" aria-hidden>
      <div className="h-4 w-24 rounded-md bg-muted" />
      <div className="h-4 w-full rounded-md bg-muted/70" />
      <div className="h-4 w-[85%] rounded-md bg-muted/60" />
      <div className="h-4 w-[65%] rounded-md bg-muted/50" />
    </div>
  );
}

export default function ChatsPage() {
  const { agentId } = useParams();
  const connectedChannels = useQuery(api.channels.getConnectedForCurrentOrg, {});
  const linkedConversations = useQuery(
    api.conversations.listLinkedForCurrentOrg,
    connectedChannels !== undefined && connectedChannels.length > 0 ? {} : 'skip',
  );

  const [selectedConversationId, setSelectedConversationId] = useState<
    Id<'conversations'> | null
  >(null);
  const [platformFilter, setPlatformFilter] = useState<'all' | ConversationPlatform>('all');
  const [labelFilter, setLabelFilter] = useState<InboxLabelFilter>('all');
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [draftReply, setDraftReply] = useState('');
  const [sendBusy, setSendBusy] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const markRead = useMutation(api.conversations.markRead);
  const sendWhatsAppText = useAction(api.whatsappSend.sendText);

  const selectedConversation = useQuery(
    api.conversations.get,
    selectedConversationId ? { conversationId: selectedConversationId } : 'skip',
  );

  const recentMessages = useQuery(
    api.messages.listRecentForConversation,
    selectedConversationId ? { conversationId: selectedConversationId } : 'skip',
  );

  const connectedPlatforms = useMemo(() => {
    const seen = new Set<ConversationPlatform>();
    const order: ConversationPlatform[] = ['whatsapp', 'instagram', 'messenger'];
    for (const ch of connectedChannels ?? []) {
      if (ch.status === 'connected') seen.add(ch.service);
    }
    return order.filter((p) => seen.has(p));
  }, [connectedChannels]);

  useEffect(() => {
    if (platformFilter !== 'all' && !connectedPlatforms.includes(platformFilter)) {
      setPlatformFilter('all');
    }
  }, [connectedPlatforms, platformFilter]);

  useEffect(() => {
    if (!selectedConversationId) return;
    void markRead({ conversationId: selectedConversationId });
  }, [selectedConversationId, markRead]);

  const chatItems = useMemo(() => {
    if (!linkedConversations) return [];
    return linkedConversations.map((conv) => ({
      id: conv._id,
      name: conv.contactName ?? conv.contactAddress ?? 'Unknown contact',
      message: conv.lastMessagePreview ?? '',
      time: formatRelative(conv.lastMessageAt),
      unread: conv.unreadCount,
      platform: conv.service as ConversationPlatform,
      requiresAction: conv.unreadCount > 0,
      conversationStatus: conv.status,
    }));
  }, [linkedConversations]);

  const filteredChats = useMemo(() => {
    let list = chatItems;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.message.toLowerCase().includes(q),
      );
    }
    if (platformFilter !== 'all') {
      list = list.filter((c) => c.platform === platformFilter);
    }
    if (labelFilter !== 'all') {
      list = list.filter((c) => c.conversationStatus === labelFilter);
    }
    return list;
  }, [chatItems, searchQuery, platformFilter, labelFilter]);

  useEffect(() => {
    if (
      selectedConversationId &&
      !filteredChats.some((c) => c.id === selectedConversationId)
    ) {
      setSelectedConversationId(null);
    }
  }, [filteredChats, selectedConversationId]);

  const togglePin = (id: Id<'conversations'>) => {
    const key = id as string;
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const pinnedChats = filteredChats.filter((c) => pinnedIds.has(c.id as string));
  const unpinnedChats = filteredChats.filter((c) => !pinnedIds.has(c.id as string));

  const selectedName =
    selectedConversation?.contactName ??
    selectedConversation?.contactAddress ??
    null;

  const selectedListItem = useMemo(
    () =>
      selectedConversationId
        ? chatItems.find((c) => c.id === selectedConversationId)
        : undefined,
    [chatItems, selectedConversationId],
  );

  const conversationDocMatchesSelection = Boolean(
    selectedConversationId &&
      selectedConversation != null &&
      selectedConversation._id === selectedConversationId,
  );

  const threadDataLoading =
    Boolean(selectedConversationId) &&
    (!conversationDocMatchesSelection || recentMessages === undefined);

  const visibleThreadMessages = useMemo(
    () => (recentMessages ?? []).filter(shouldRenderThreadMessage),
    [recentMessages],
  );

  const detailsPanelLoading =
    Boolean(selectedConversationId) && !conversationDocMatchesSelection;

  const displayHeaderName = selectedName ?? selectedListItem?.name ?? null;

  useEffect(() => {
    if (threadDataLoading) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConversationId, recentMessages, threadDataLoading]);

  const handleSendReply = async () => {
    const trimmed = draftReply.trim();
    if (!trimmed || !selectedConversationId || sendBusy || threadDataLoading) return;
    if (selectedConversation?.service !== 'whatsapp') {
      toast.error('Sending from the inbox is available for WhatsApp only right now.');
      return;
    }
    setSendBusy(true);
    try {
      await sendWhatsAppText({
        conversationId: selectedConversationId,
        content: trimmed,
      });
      setDraftReply('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send message');
    } finally {
      setSendBusy(false);
    }
  };

  const conversationsStillLoading = linkedConversations === undefined;

  if (connectedChannels === undefined) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
        <ChatsPageHeader />
        <div className="flex items-center justify-center py-20">
          <Spinner className="size-6 text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (connectedChannels.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
        <ChatsPageHeader />
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-card px-8 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
            <Plug className="size-6 text-muted-foreground" />
          </div>
          <div className="flex max-w-sm flex-col gap-1">
            <h2 className="text-lg font-semibold tracking-tight">
              No channels are connected
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Connect WhatsApp, Instagram, or Messenger to start receiving
              conversations from your customers.
            </p>
          </div>
          <Button asChild>
            <Link to={`/dashboard/${agentId}/channels`}>Connect a channel</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      <ChatsPageHeader />

      <div style={{ display: 'flex', gap: '24px', height: 'calc(100vh - 200px)', width: '100%' }}>

      {/* LEFT COLUMN: Chat List */}
      <div style={{ width: '300px', display: 'flex', flexDirection: 'column', background: 'var(--color-surface)', borderRadius: '12px', border: '1px solid var(--color-border)', overflow: 'hidden', flexShrink: 0 }}>

        {/* Search & Filters */}
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <Search
              size={15}
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-foreground-subtle)' }}
            />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%', height: '38px', paddingLeft: '36px', paddingRight: '14px',
                fontSize: '13px', borderRadius: '8px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-background)',
                color: 'var(--color-foreground)',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Platform (left) + Label (right): compact triggers sized to content */}
          <div className="flex w-full items-center justify-between gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 w-auto max-w-[min(100%,12rem)] shrink-0 gap-1.5 px-2.5 font-normal"
                >
                  <span className="truncate text-left text-sm">
                    {platformFilter === 'all' ? (
                      <span className="text-muted-foreground">Platform</span>
                    ) : (
                      <span className="text-foreground">{PLATFORM_LABEL[platformFilter]}</span>
                    )}
                  </span>
                  <ChevronDown className="size-4 shrink-0 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[11rem] p-0">
                <div className="flex items-center justify-between gap-1 border-b border-border/60 px-2 py-2">
                  <span className="pl-1 text-xs font-medium text-muted-foreground">
                    Platform
                  </span>
                  <DropdownMenuItem
                    className="h-7 w-7 shrink-0 justify-center rounded-md p-0"
                    onSelect={() => setPlatformFilter('all')}
                    aria-label="Reset platform filter"
                  >
                    <RotateCcw className="size-3.5 text-muted-foreground" />
                  </DropdownMenuItem>
                </div>
                <div className="p-1.5">
                  <DropdownMenuGroup>
                    {connectedPlatforms.map((p) => (
                      <DropdownMenuItem
                        key={p}
                        className="cursor-pointer gap-2.5"
                        onSelect={() => setPlatformFilter(p)}
                      >
                        <PlatformMenuIcon platform={p} size={16} />
                        {PLATFORM_LABEL[p]}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 w-auto max-w-[min(100%,12rem)] shrink-0 gap-1.5 px-2.5 font-normal"
                >
                  <span className="truncate text-left text-sm">
                    {labelFilter === 'all' ? (
                      <span className="text-muted-foreground">Label</span>
                    ) : (
                      <span className="text-foreground">
                        {STATUS_LABEL_MENU[labelFilter].title}
                      </span>
                    )}
                  </span>
                  <ChevronDown className="size-4 shrink-0 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[11rem] p-0">
                <div className="flex items-center justify-between gap-1 border-b border-border/60 px-2 py-2">
                  <span className="pl-1 text-xs font-medium text-muted-foreground">
                    Label
                  </span>
                  <DropdownMenuItem
                    className="h-7 w-7 shrink-0 justify-center rounded-md p-0"
                    onSelect={() => setLabelFilter('all')}
                    aria-label="Reset label filter"
                  >
                    <RotateCcw className="size-3.5 text-muted-foreground" />
                  </DropdownMenuItem>
                </div>
                <div className="p-1.5">
                  <DropdownMenuGroup>
                    {STATUS_LABEL_OPTIONS.map((key) => {
                      const { title, Icon, iconClass } = STATUS_LABEL_MENU[key];
                      return (
                        <DropdownMenuItem
                          key={key}
                          className="cursor-pointer gap-2.5"
                          onSelect={() => setLabelFilter(key)}
                        >
                          <Icon className={`size-4 shrink-0 ${iconClass}`} />
                          {title}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuGroup>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
          {conversationsStillLoading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner className="size-6 text-muted-foreground" />
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center text-sm text-muted-foreground">
              <MessageSquare className="size-8 opacity-40" />
              <p className="m-0 font-medium text-foreground">No conversations yet</p>
              <p className="m-0 text-xs leading-relaxed">
                When customers message your connected channels, threads appear here.
              </p>
            </div>
          ) : (
            <>
              {pinnedChats.length > 0 && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px 6px', borderBottom: '1px solid var(--color-border)' }}>
                    <Pin size={11} color="var(--color-foreground-subtle)" />
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-foreground-subtle)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Pinned</span>
                  </div>
                  {pinnedChats.map((chat, index) => (
                    <ChatRow key={chat.id} chat={chat} index={index} total={pinnedChats.length} isSelected={selectedConversationId === chat.id} isPinned onSelect={setSelectedConversationId} onTogglePin={togglePin} />
                  ))}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px 6px', borderBottom: '1px solid var(--color-border)', borderTop: '1px solid var(--color-border)' }}>
                    <MessageSquare size={11} color="var(--color-foreground-subtle)" />
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-foreground-subtle)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>All</span>
                  </div>
                </>
              )}

              {unpinnedChats.map((chat, index) => (
                <ChatRow key={chat.id} chat={chat} index={index} total={unpinnedChats.length} isSelected={selectedConversationId === chat.id} isPinned={false} onSelect={setSelectedConversationId} onTogglePin={togglePin} />
              ))}
            </>
          )}
        </div>
      </div>

      {/* MIDDLE COLUMN: Chat Window */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--color-surface)', borderRadius: '12px', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
        {selectedConversationId ? (
          <>
            {/* Chat Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
              <div style={{ display: 'flex', alignItems: 'center', minWidth: 0, flex: 1 }}>
                {displayHeaderName ? (
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--color-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayHeaderName}</h2>
                ) : (
                  <div className="h-6 max-w-[200px] flex-1 rounded-md bg-muted motion-safe:animate-pulse" aria-hidden />
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'var(--color-foreground-muted)' }}>
                <MoreVertical size={18} style={{ cursor: 'pointer' }} />
              </div>
            </div>

            {/* Chat Messages Area */}
            <div style={{ flex: 1, background: 'var(--color-background)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              {threadDataLoading ? (
                <ChatThreadSkeleton />
              ) : (
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                  {visibleThreadMessages.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center text-center text-sm text-muted-foreground">
                      No messages in this conversation yet.
                    </div>
                  ) : (
                    visibleThreadMessages.map((m) => {
                      const incoming = m.direction === 'incoming';
                      return (
                        <div
                          key={m._id}
                          style={{
                            display: 'flex',
                            justifyContent: incoming ? 'flex-start' : 'flex-end',
                            width: '100%',
                          }}
                        >
                          <div style={{ maxWidth: '78%', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div
                              style={{
                                background: incoming ? 'var(--color-surface)' : 'var(--color-primary)',
                                color: incoming ? 'var(--color-foreground)' : 'var(--color-primary-foreground)',
                                padding: '10px 14px',
                                borderRadius: incoming ? '2px 16px 16px 16px' : '16px 16px 2px 16px',
                                border: incoming ? '1px solid var(--color-border)' : 'none',
                                fontSize: '14px',
                                lineHeight: 1.5,
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                              }}
                            >
                              {messageBodyPreview(m)}
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--color-foreground-subtle)', paddingLeft: incoming ? '4px' : '0', paddingRight: incoming ? '0' : '4px', alignSelf: incoming ? 'flex-start' : 'flex-end' }}>
                              {formatRelative(m.createdAt)}
                              {m.status === 'failed' && m.failureReason && (
                                <span className="text-destructive"> — {m.failureReason}</span>
                              )}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: '24px', padding: '8px 16px' }}>
                <Paperclip size={18} color="var(--color-foreground-subtle)" style={{ cursor: 'pointer', opacity: 0.45 }} />
                <input
                  type="text"
                  placeholder={
                    threadDataLoading
                      ? 'Loading conversation…'
                      : selectedConversation?.service === 'whatsapp'
                        ? `Reply to ${displayHeaderName ?? 'customer'}…`
                        : 'Replies from the inbox are supported on WhatsApp only'
                  }
                  disabled={
                    threadDataLoading ||
                    sendBusy ||
                    selectedConversation?.service !== 'whatsapp'
                  }
                  value={draftReply}
                  onChange={(e) => setDraftReply(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void handleSendReply();
                    }
                  }}
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--color-foreground)', fontSize: '14px' }}
                />
                <button
                  type="button"
                  disabled={
                    threadDataLoading ||
                    selectedConversation?.service !== 'whatsapp' ||
                    sendBusy ||
                    !draftReply.trim()
                  }
                  onClick={() => void handleSendReply()}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'var(--color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 'none',
                    cursor:
                      !threadDataLoading &&
                      selectedConversation?.service === 'whatsapp' &&
                      draftReply.trim()
                        ? 'pointer'
                        : 'not-allowed',
                    opacity:
                      threadDataLoading ||
                      selectedConversation?.service !== 'whatsapp' ||
                      !draftReply.trim()
                        ? 0.45
                        : 1,
                  }}
                >
                  <Send size={14} color="var(--color-primary-foreground)" style={{ marginLeft: '-2px' }} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-foreground-subtle)', background: 'var(--color-background)' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', border: '1px solid var(--color-border)' }}>
              <MessageSquare size={28} />
            </div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--color-foreground)' }}>No chat selected</h3>
            <p style={{ margin: '8px 0 0', fontSize: '13px' }}>Select a conversation from the left to start replying</p>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Details */}
      {selectedConversationId && (
        <div style={{ width: '300px', display: 'flex', flexDirection: 'column', background: 'var(--color-surface)', borderRadius: '12px', border: '1px solid var(--color-border)', overflow: 'hidden', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-foreground)' }}>Details</h2>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: detailsPanelLoading ? '0' : '20px' }}>
            {detailsPanelLoading ? (
              <DetailsPanelSkeleton />
            ) : (
              selectedConversation && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--color-foreground-muted)', flexShrink: 0 }}>Platform</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 500, color: 'var(--color-foreground)', minWidth: 0 }}>
                      <HeaderPlatformIcon platform={selectedConversation.service as ConversationPlatform} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {PLATFORM_LABEL[selectedConversation.service as ConversationPlatform]}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', color: 'var(--color-foreground-muted)' }}>Status</span>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-foreground)', textTransform: 'capitalize' }}>
                      {selectedConversation.status}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', color: 'var(--color-foreground-muted)' }}>Started</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-foreground)', fontSize: '13px' }}>
                      <Calendar size={14} color="var(--color-foreground-muted)" />
                      {new Date(selectedConversation.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', color: 'var(--color-foreground-muted)' }}>Last activity</span>
                    <span style={{ fontSize: '13px', color: 'var(--color-foreground)' }}>
                      {formatRelative(selectedConversation.lastMessageAt)}
                    </span>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}

      </div>
    </div>
  );
}

function ChatsPageHeader() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <div>
        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--color-foreground)', letterSpacing: '-0.02em' }}>
          Messages
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-foreground-muted)' }}>
          Conversations from your connected channels
        </p>
      </div>
    </div>
  );
}
