import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useAction, useMutation, useQuery } from 'convex/react';
import { usePaginatedQuery } from 'convex-helpers/react';
import {
  Archive,
  Bot,
  ChevronDown,
  CircleDot,
  Contact,
  FileText,
  History,
  MessageSquare,
  Moon,
  Pin,
  Plug,
  RotateCcw,
  Search,
  Sparkles,
  Tag,
  User,
  Users,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { api } from '../../convex/_generated/api';
import type { Doc, Id } from '../../convex/_generated/dataModel';
import { cn } from '@/lib/utils';
import {
  hasVisibleInboxContent,
  type InboxUIMessage,
} from '@/lib/inboxOptimistic';
import { Conversation } from '@/components/ai-elements/conversation';
import { Shimmer } from '@/components/ai-elements/shimmer';
import { InboxReplyInput } from '@/components/inbox/InboxReplyInput';
import { InboxThreadMessages } from '@/components/inbox/InboxThreadMessages';
import type { PromptInputMessage } from '@/components/ai-elements/prompt-input';

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

function historyMessageLineTitle(text: string): string {
  const s = text.replace(/\s+/g, ' ').trim();
  if (!s) return 'Message';
  if (s.length <= 72) return s;
  return `${s.slice(0, 69)}…`;
}

function formatOrgMemberDisplayName(u: Doc<'users'>): string {
  const parts = [u.firstName, u.lastName].filter(Boolean);
  if (parts.length > 0) return parts.join(' ');
  return u.email;
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

function ChatThreadLoading() {
  return (
    <div
      className="flex size-full min-h-0 flex-col items-center justify-center px-6"
      aria-busy
      aria-live="polite"
      aria-label="Loading conversation"
    >
      <Shimmer duration={1} spread={3} className="text-sm font-medium">
        Loading conversation…
      </Shimmer>
    </div>
  );
}

function DetailsPanelSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-3 px-4 py-4 motion-safe:animate-pulse" aria-hidden>
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
    connectedChannels !== undefined ? {} : 'skip',
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
  const [pendingOutbound, setPendingOutbound] = useState<
    Array<{
      clientId: string;
      text: string;
      agentName: string;
      createdAt: number;
    }>
  >([]);
  const demoSeedWhatsappRef = useRef(false);

  const markRead = useMutation(api.conversations.markRead);
  const updateConversationAssignee = useMutation(api.conversations.setAssignee);
  const addConversationTag = useMutation(api.conversations.addConversationTag);
  const removeConversationTag = useMutation(api.conversations.removeConversationTag);
  const teamUsers = useQuery(api.users.getUsers, {});
  const [assigneeSaving, setAssigneeSaving] = useState(false);
  const [tagDraft, setTagDraft] = useState('');
  const [tagMutationBusy, setTagMutationBusy] = useState(false);
  const [interactionHistoryOpen, setInteractionHistoryOpen] = useState(false);
  const [interactionSummaryOpen, setInteractionSummaryOpen] = useState(false);
  const [tagsSectionOpen, setTagsSectionOpen] = useState(false);
  const [customerDetailsOpen, setCustomerDetailsOpen] = useState(false);
  const ensureWhatsappDemoInbox = useMutation(api.whatsappDemo.ensureInbox);
  const ensureAssignedAgent = useMutation(api.conversations.ensureAssignedAgent);
  const dashboardAgent = useQuery(
    api.agents.get,
    agentId ? { agentId: agentId as Id<'agents'> } : 'skip',
  );
  const productAgentName = dashboardAgent?.name?.trim() || 'Unknown agent';

  useEffect(() => {
    if (connectedChannels === undefined) return;
    if (!demoSeedWhatsappRef.current) {
      demoSeedWhatsappRef.current = true;
      void ensureWhatsappDemoInbox({})
        .then((res) => {
          if (res.status === 'no_organization') {
            demoSeedWhatsappRef.current = false;
          }
        })
        .catch(() => {
          demoSeedWhatsappRef.current = false;
        });
    }
  }, [connectedChannels, ensureWhatsappDemoInbox]);

  const selectedConversation = useQuery(
    api.conversations.get,
    selectedConversationId ? { conversationId: selectedConversationId } : 'skip',
  );

  const threadSummary = useQuery(
    api.conversations.getThreadSummary,
    selectedConversationId ? { conversationId: selectedConversationId } : 'skip',
  );

  const threadId = selectedConversation?.threadId;

  const sendReply = useAction(api.chat.inboxActions.sendReply);

  const { results: threadMessages, status: threadMessagesStatus } = usePaginatedQuery(
    api.chat.inbox.listThreadMessagesForInbox,
    threadId && selectedConversationId
      ? { threadId, conversationId: selectedConversationId }
      : 'skip',
    { initialNumItems: 80 },
  );

  const customerSidebarDetails = useQuery(
    api.customers.getSidebarDetailsForConversation,
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

  useEffect(() => {
    if (!selectedConversationId || !agentId) return;
    void ensureAssignedAgent({
      conversationId: selectedConversationId,
      agentId: agentId as Id<'agents'>,
    }).catch(() => { });
  }, [selectedConversationId, agentId, ensureAssignedAgent]);

  useEffect(() => {
    setTagDraft('');
    setPendingOutbound([]);
  }, [selectedConversationId]);



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
    (!conversationDocMatchesSelection ||
      (threadMessagesStatus === 'LoadingFirstPage' && threadMessages.length === 0));

  const visibleThreadMessages = useMemo(() => {
    const fromServer = threadMessages.filter(hasVisibleInboxContent);
    const pendingUi: InboxUIMessage[] = pendingOutbound.map((p) => ({
      key: `pending-${p.clientId}`,
      id: p.clientId,
      order: Number.MAX_SAFE_INTEGER,
      stepOrder: 0,
      status: 'pending',
      role: 'assistant',
      text: p.text,
      agentName: p.agentName,
      sentByAi: false,
      parts: [{ type: 'text', text: p.text }],
      _creationTime: p.createdAt,
    }));
    return [...fromServer, ...pendingUi];
  }, [threadMessages, pendingOutbound]);

  const interactionHistoryMessages = useMemo(
    () => [...visibleThreadMessages].reverse(),
    [visibleThreadMessages],
  );

  const detailsPanelLoading =
    Boolean(selectedConversationId) && !conversationDocMatchesSelection;

  const displayHeaderName = selectedName ?? selectedListItem?.name ?? null;

  const assignedMemberLabel = useMemo(() => {
    const wid = selectedConversation?.assignedUserId;
    if (!wid || !teamUsers) return null;
    const u = teamUsers.find((m) => m.workosUserId === wid);
    return u ? formatOrgMemberDisplayName(u) : 'Teammate';
  }, [selectedConversation?.assignedUserId, teamUsers]);



  const handleAssignConversation = async (next: { kind: 'ai' } | { kind: 'user'; workosUserId: string }) => {
    if (!selectedConversationId) return;
    setAssigneeSaving(true);
    try {
      if (next.kind === 'ai') {
        await updateConversationAssignee({
          conversationId: selectedConversationId,
          assignee: { kind: 'ai' },
        });
      } else {
        await updateConversationAssignee({
          conversationId: selectedConversationId,
          assignee: { kind: 'user', workosUserId: next.workosUserId },
        });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update assignee');
    } finally {
      setAssigneeSaving(false);
    }
  };

  const handleAddConversationTag = async () => {
    const raw = tagDraft.trim();
    if (!raw || !selectedConversationId) return;
    const parts = raw
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    setTagMutationBusy(true);
    try {
      for (const tag of parts) {
        await addConversationTag({
          conversationId: selectedConversationId,
          tag,
        });
      }
      setTagDraft('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not add tag');
    } finally {
      setTagMutationBusy(false);
    }
  };

  const handleRemoveConversationTag = async (tag: string) => {
    if (!selectedConversationId) return;
    setTagMutationBusy(true);
    try {
      await removeConversationTag({
        conversationId: selectedConversationId,
        tag,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not remove tag');
    } finally {
      setTagMutationBusy(false);
    }
  };



  const canReplyFromInbox =
    selectedConversation?.service === 'whatsapp' ||
    selectedConversation?.service === 'instagram' ||
    selectedConversation?.service === 'messenger';

  const handleSendReply = async (message?: PromptInputMessage) => {
    const trimmed = (message?.text ?? draftReply).trim();
    const attachedImages = message?.files?.filter((file) =>
      file.mediaType?.startsWith('image/'),
    ) ?? [];
    const imageClientIds = attachedImages.map((file) => file.id);
    if ((!trimmed && attachedImages.length === 0) || !selectedConversationId || sendBusy || threadDataLoading) {
      return;
    }
    if (!threadId) {
      toast.error('Conversation thread is not ready yet.');
      return;
    }
    const service = selectedConversation?.service;
    if (
      service !== 'whatsapp' &&
      service !== 'instagram' &&
      service !== 'messenger'
    ) {
      toast.error(
        'Sending from the inbox is available for WhatsApp, Instagram, and Messenger only right now.',
      );
      return;
    }
    const clientId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `pending-${Date.now()}`;
    setPendingOutbound((prev) => [
      ...prev,
      {
        clientId,
        text: trimmed,
        agentName: productAgentName,
        createdAt: Date.now(),
      },
    ]);
    setSendBusy(true);
    try {
      await sendReply({
        conversationId: selectedConversationId,
        content: trimmed,
        clientIds: imageClientIds.length > 0 ? imageClientIds : undefined,
      });
      setDraftReply('');
      setPendingOutbound((prev) => prev.filter((p) => p.clientId !== clientId));
    } catch (e) {
      setPendingOutbound((prev) => prev.filter((p) => p.clientId !== clientId));
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
    <div className="flex h-[calc(100svh-6rem)] min-h-0 w-full flex-col gap-6 overflow-hidden">
      <ChatsPageHeader className="shrink-0" />

      <div className="flex min-h-0 flex-1 gap-6 overflow-hidden">

        {/* LEFT COLUMN: Chat List */}
        <div className="flex h-full w-[300px] shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-card">

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
          <div className="no-scrollbar relative min-h-0 flex-1 overflow-y-auto">
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

        {/* MIDDLE COLUMN: Chat Window (layout matches TestChatWindow) */}
        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card">
          {selectedConversationId ? (
            <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto]">
              {/* Chat Header */}
              <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
                <div className="flex min-w-0 flex-1 items-center">
                  {displayHeaderName ? (
                    <h2 className="m-0 truncate text-lg font-semibold text-foreground">
                      {displayHeaderName}
                    </h2>
                  ) : (
                    <div className="h-6 max-w-[200px] flex-1 rounded-md bg-muted motion-safe:animate-pulse" aria-hidden />
                  )}
                </div>
                <div className="flex items-center gap-2.5 text-muted-foreground">
                  {selectedConversation?.service === 'whatsapp' &&
                    selectedConversation.channelId &&
                    agentId ? (
                    <Button variant="outline" size="sm" className="h-8 shrink-0 gap-1.5 px-2.5 text-xs font-normal" asChild>
                      <Link
                        to={`/dashboard/${agentId}/channels/${selectedConversation.channelId}/templates`}
                      >
                        <FileText className="size-3.5" />
                        Message templates
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="relative min-h-0 overflow-hidden">
                <Conversation className="no-scrollbar size-full min-h-0">
                  {threadDataLoading ? (
                    <ChatThreadLoading />
                  ) : (
                    <InboxThreadMessages
                      messages={visibleThreadMessages}
                      emptyTitle="No messages in this conversation yet."
                      emptyDescription="When customers message you, the thread appears here."
                    />
                  )}
                </Conversation>
              </div>

              {/* Chat Input */}
              <div className="w-full min-w-0 shrink-0 border-t border-border bg-card p-4">
                <InboxReplyInput
                  busy={sendBusy}
                  disabled={threadDataLoading || !canReplyFromInbox}
                  onChange={setDraftReply}
                  onSubmit={(message) => void handleSendReply(message)}
                  placeholder={
                    threadDataLoading
                      ? 'Loading conversation…'
                      : canReplyFromInbox
                        ? `Reply to ${displayHeaderName ?? 'customer'}…`
                        : 'Replies from the inbox are supported on WhatsApp, Instagram, and Messenger only'
                  }
                  value={draftReply}
                />
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-1 flex-col items-center justify-center bg-background text-muted-foreground">
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
          <div className="flex h-full w-[300px] shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-card">
            <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-foreground)' }}>Details</h2>
            </div>

            <div className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto">
              {detailsPanelLoading ? (
                <DetailsPanelSkeleton />
              ) : (
                selectedConversation && (
                  <div className="flex flex-col">
                    <div className="px-4 pb-3 pt-4">
                      <div className="mb-2 flex items-center gap-2">
                        <Users className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                        <span className="text-sm font-semibold text-foreground">Assignee</span>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={assigneeSaving}
                            className="h-auto min-h-10 w-full cursor-pointer justify-between gap-2 rounded-md border-border bg-background px-3 py-2.5 text-left text-sm font-normal shadow-none hover:bg-muted/40 disabled:cursor-not-allowed"
                            aria-label="Who responds in this conversation"
                          >
                            <span className="flex min-w-0 flex-1 items-center gap-2">
                              {selectedConversation.assignToAiAgent ? (
                                <>
                                  <Bot className="size-4 shrink-0 text-muted-foreground" />
                                  <span className="truncate text-foreground">AI Agent</span>
                                </>
                              ) : (
                                <>
                                  <User className="size-4 shrink-0 text-muted-foreground" />
                                  <span className="truncate text-foreground">
                                    {assignedMemberLabel ?? 'Teammate'}
                                  </span>
                                </>
                              )}
                            </span>
                            <ChevronDown className="size-4 shrink-0 opacity-60" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="min-w-[12rem] max-w-[calc(100vw-3rem)]">
                          <DropdownMenuGroup>
                            <DropdownMenuItem
                              className="cursor-pointer gap-2"
                              onSelect={() => void handleAssignConversation({ kind: 'ai' })}
                            >
                              <Bot className="size-4 shrink-0" />
                              AI Agent
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                          {teamUsers !== undefined && teamUsers.length > 0 ? (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuGroup>
                                {teamUsers.map((u) => (
                                  <DropdownMenuItem
                                    key={u._id}
                                    className="cursor-pointer gap-2"
                                    onSelect={() =>
                                      void handleAssignConversation({
                                        kind: 'user',
                                        workosUserId: u.workosUserId,
                                      })
                                    }
                                  >
                                    <User className="size-4 shrink-0 text-muted-foreground" />
                                    {formatOrgMemberDisplayName(u)}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuGroup>
                            </>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <Separator />

                    <div className="flex flex-col">
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-muted/40"
                        onClick={() => setCustomerDetailsOpen((o) => !o)}
                        aria-expanded={customerDetailsOpen}
                      >
                        <Contact className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                        <span className="flex-1 text-sm font-semibold text-foreground">
                          Customer details
                        </span>
                        <ChevronDown
                          className={cn(
                            'size-4 shrink-0 text-muted-foreground transition-transform duration-200',
                            !customerDetailsOpen && '-rotate-90',
                          )}
                        />
                      </button>
                      {customerDetailsOpen ? (
                        <div className="px-4 pb-3">
                          {customerSidebarDetails === undefined ? (
                            <p className="m-0 text-xs text-muted-foreground">Loading…</p>
                          ) : (
                            <div className="flex flex-col gap-2.5 text-sm">
                              <div className="flex justify-between gap-4">
                                <span className="shrink-0 text-muted-foreground">Name</span>
                                <span className="min-w-0 truncate text-right font-medium text-foreground">
                                  {customerSidebarDetails?.name ?? '—'}
                                </span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="shrink-0 text-muted-foreground">Platform</span>
                                <span className="min-w-0 truncate text-right font-medium text-foreground">
                                  {customerSidebarDetails?.platformLabel ?? '—'}
                                </span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="shrink-0 text-muted-foreground">Phone number</span>
                                <span className="min-w-0 truncate text-right font-medium text-foreground">
                                  {customerSidebarDetails?.phone?.trim()
                                    ? customerSidebarDetails.phone
                                    : '—'}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>

                    <Separator />

                    <div className="flex flex-col">
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-muted/40"
                        onClick={() => setTagsSectionOpen((o) => !o)}
                        aria-expanded={tagsSectionOpen}
                      >
                        <Tag className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                        <span className="flex-1 text-sm font-semibold text-foreground">Tags</span>
                        <ChevronDown
                          className={cn(
                            'size-4 shrink-0 text-muted-foreground transition-transform duration-200',
                            !tagsSectionOpen && '-rotate-90',
                          )}
                        />
                      </button>
                      {tagsSectionOpen ? (
                        <div className="px-4 pb-3">
                          {(selectedConversation.tags ?? []).length > 0 ? (
                            <ul className="m-0 list-none divide-y divide-border border-y border-border p-0">
                              {(selectedConversation.tags ?? []).map((tag) => (
                                <li key={tag}>
                                  <div className="flex items-center justify-between gap-3 py-2.5 font-mono text-sm text-foreground">
                                    <span className="min-w-0 flex-1 truncate" title={tag}>
                                      {tag}
                                    </span>
                                    <button
                                      type="button"
                                      className="shrink-0 select-none px-1 text-base leading-none text-muted-foreground hover:text-foreground disabled:opacity-40"
                                      disabled={tagMutationBusy}
                                      aria-label={`Remove tag ${tag}`}
                                      onClick={() => void handleRemoveConversationTag(tag)}
                                    >
                                      ×
                                    </button>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="m-0 border-y border-border py-2.5 text-xs text-muted-foreground">
                              No tags yet.
                            </p>
                          )}
                          <div className="mt-3 flex gap-2">
                            <Input
                              value={tagDraft}
                              onChange={(e) => setTagDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  void handleAddConversationTag();
                                }
                              }}
                              placeholder="Add tags (comma-separated)…"
                              disabled={tagMutationBusy}
                              className="h-9 flex-1 font-mono text-xs"
                            />
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="h-9 shrink-0 px-3 text-xs"
                              disabled={tagMutationBusy || !tagDraft.trim()}
                              onClick={() => void handleAddConversationTag()}
                            >
                              Add
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <Separator />

                    <div className="flex flex-col">
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-muted/40"
                        onClick={() => setInteractionSummaryOpen((o) => !o)}
                        aria-expanded={interactionSummaryOpen}
                      >
                        <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                        <span className="text-sm font-semibold text-foreground">
                          Interaction summary
                        </span>
                        <div className="flex items-center gap-1 rounded-full bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-medium text-violet-600 dark:bg-violet-500/20 dark:text-violet-400">
                          <Sparkles className="size-2.5 animate-pulse" />
                          <span>AI</span>
                        </div>
                        <div className="flex-1" />
                        <ChevronDown
                          className={cn(
                            'size-4 shrink-0 text-muted-foreground transition-transform duration-200',
                            !interactionSummaryOpen && '-rotate-90',
                          )}
                        />
                      </button>
                      {interactionSummaryOpen ? (
                        <div className="px-4 pb-3 space-y-2">
                          {threadSummary ? (
                            <div className="pl-4 border-l border-violet-200 dark:border-violet-800">
                              <Shimmer
                                duration={3}
                                spread={2}
                                className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap block w-full"
                              >
                                {threadSummary}
                              </Shimmer>
                            </div>
                          ) : (
                            <div className="pl-4 border-l border-violet-200 dark:border-violet-800">
                              <Shimmer duration={1.5} spread={2} className="text-xs text-muted-foreground font-normal italic">
                                Generating summary in background…
                              </Shimmer>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>

                    <Separator />

                    <div className="flex flex-col">
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-muted/40"
                        onClick={() => setInteractionHistoryOpen((o) => !o)}
                        aria-expanded={interactionHistoryOpen}
                      >
                        <History className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                        <span className="flex-1 text-sm font-semibold text-foreground">
                          Interaction history
                        </span>
                        <ChevronDown
                          className={cn(
                            'size-4 shrink-0 text-muted-foreground transition-transform duration-200',
                            !interactionHistoryOpen && '-rotate-90',
                          )}
                        />
                      </button>
                      {interactionHistoryOpen ? (
                        <div className="no-scrollbar max-h-72 overflow-y-auto px-4 pb-3">
                          {threadDataLoading ? (
                            <p className="m-0 text-xs text-muted-foreground">Loading messages…</p>
                          ) : interactionHistoryMessages.length === 0 ? (
                            <p className="m-0 text-xs text-muted-foreground">No messages yet</p>
                          ) : (
                            <div className="flex flex-col">
                              {interactionHistoryMessages.map((m, i) => {
                                const isNewest = i === 0;
                                const isLast = i === interactionHistoryMessages.length - 1;
                                return (
                                  <div
                                    key={m.key}
                                    className={cn(
                                      'flex gap-3 py-1',
                                      isNewest && 'rounded-md bg-muted/40 px-1',
                                    )}
                                  >
                                    <div className="flex w-5 shrink-0 flex-col items-center">
                                      {!isNewest ? (
                                        <div className="w-px flex-1 bg-border" style={{ minHeight: 6 }} />
                                      ) : (
                                        <div style={{ minHeight: 4 }} />
                                      )}
                                      <div
                                        className={cn(
                                          'size-2 shrink-0 rounded-sm',
                                          isNewest
                                            ? 'bg-red-600 dark:bg-red-500'
                                            : 'bg-muted-foreground/45',
                                        )}
                                        aria-hidden
                                      />
                                      {!isLast ? (
                                        <div className="w-px flex-1 bg-border" style={{ minHeight: 14 }} />
                                      ) : null}
                                    </div>
                                    <div className="min-w-0 flex-1 pb-3 pr-0.5">
                                      <div className="truncate text-sm font-medium text-foreground">
                                        {historyMessageLineTitle(m.text)}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {m.role === 'user' ? (
                                          'Customer'
                                        ) : (
                                          <>
                                            {(m as InboxUIMessage).agentName ?? 'Unknown agent'}
                                            {(m as InboxUIMessage).sentByAi ? (
                                              <span className="ml-1 text-muted-foreground">· AI</span>
                                            ) : null}
                                          </>
                                        )}
                                      </div>
                                      <div className="mt-1 text-xs text-foreground">
                                        <span className="font-semibold">Status </span>
                                        <span className="font-normal">
                                          {m.role === 'user'
                                            ? 'Received'
                                            : (m.status ?? 'Sent')}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ) : null}
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

function ChatsPageHeader({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-start justify-between', className)}>
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
