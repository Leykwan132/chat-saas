import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useAction, useMutation, useQuery } from 'convex/react';
import { usePaginatedQuery } from 'convex-helpers/react';
import {
  Bot,
  ChevronDown,
  Contact,
  FileText,
  Lock,
  MessageSquare,
  Pin,
  Plug,
  RotateCcw,
  Search,
  Sparkles,
  Tag,
  User,
  Users,
  Check,
} from 'lucide-react';
import { SiInstagram, SiMessenger, SiWhatsapp } from 'react-icons/si';
import { toast } from 'sonner';
import { ChatRow, type ConversationPlatform } from '@/components/ChatRow';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
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
import { usePermissions } from '@/hooks/usePermissions';
import { Permission } from '../../shared/permissions';

const PLATFORM_LABEL: Record<ConversationPlatform, string> = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  messenger: 'Messenger',
};

type InboxChatFilter = 'all' | 'open' | 'snoozed' | 'closed' | 'assigned_me';




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

function formatOrgMemberDisplayName(u: Doc<'users'>): string {
  const parts = [u.firstName, u.lastName].filter(Boolean);
  if (parts.length > 0) return parts.join(' ');
  return u.email;
}

function getTagColorClass(tag: string): { bg: string; text: string; dot: string } {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % 6;
  const dotColors = [
    'bg-blue-500 dark:bg-blue-400',
    'bg-emerald-500 dark:bg-emerald-400',
    'bg-violet-500 dark:bg-violet-400',
    'bg-amber-500 dark:bg-amber-400',
    'bg-rose-500 dark:bg-rose-400',
    'bg-cyan-500 dark:bg-cyan-400',
  ];
  return {
    bg: 'bg-zinc-100 dark:bg-zinc-800/80 border-zinc-200/80 dark:border-zinc-700/60 shadow-none',
    text: 'text-zinc-800 dark:text-zinc-200',
    dot: dotColors[index],
  };
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
  const { can, isLoading } = usePermissions();
  const connectedChannels = useQuery(api.channels.getConnectedForCurrentOrg, {});
  const linkedConversations = useQuery(
    api.conversations.listLinkedForCurrentOrg,
    connectedChannels !== undefined ? {} : 'skip',
  );
  const currentUser = useQuery(api.users.currentUser);

  const [selectedConversationId, setSelectedConversationId] = useState<
    Id<'conversations'> | null
  >(null);
  const [platformFilter, setPlatformFilter] = useState<'all' | ConversationPlatform>('all');
  const [combinedFilter, setCombinedFilter] = useState<string>('all');
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const [filterSearchInput, setFilterSearchInput] = useState('');

  const chatFilter = useMemo(() => {
    if (combinedFilter.startsWith('status:')) {
      return combinedFilter.slice(7) as InboxChatFilter;
    }
    return 'all';
  }, [combinedFilter]);

  const tagFilter = useMemo(() => {
    if (combinedFilter.startsWith('tag:')) {
      return combinedFilter.slice(4);
    }
    return 'all';
  }, [combinedFilter]);
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
  const setConversationAiEnabled = useMutation(api.conversations.setConversationAiEnabled);
  const setConversationLeadOwner = useMutation(api.conversations.setConversationLeadOwner);
  const addCustomerTag = useMutation(api.customers.addCustomerTag);
  const removeCustomerTag = useMutation(api.customers.removeCustomerTag);
  const teamUsers = useQuery(api.users.getUsers, {});
  const [assigneeSaving, setAssigneeSaving] = useState(false);

  const [tagMutationBusy, setTagMutationBusy] = useState(false);
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);
  const [tagSearchInput, setTagSearchInput] = useState('');

  const handleAddSpecificTag = async (tag: string) => {
    const raw = tag.trim();
    const customerId = selectedConversation?.customerId;
    if (!raw || !customerId) return;
    setTagMutationBusy(true);
    try {
      await addCustomerTag({
        customerId,
        tag: raw,
      });
      toast.success(`Tag "${raw}" added`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not add tag');
    } finally {
      setTagMutationBusy(false);
    }
  };

  const [interactionSummaryOpen, setInteractionSummaryOpen] = useState(false);
  const [tagsSectionOpen, setTagsSectionOpen] = useState(false);
  const [customerDetailsOpen, setCustomerDetailsOpen] = useState(false);
  const ensureWhatsappDemoInbox = useMutation(api.whatsappDemo.ensureInbox);
  const ensureAssignedAgent = useMutation(api.conversations.ensureAssignedAgent);
  const dashboardAgent = useQuery(
    api.agents.get,
    agentId ? { agentId: agentId as Id<'agents'> } : 'skip',
  );
  const textEntries = useQuery(
    api.knowledgeBase.listTextEntries,
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
    setPendingOutbound([]);
  }, [selectedConversationId]);



  const chatItems = useMemo(() => {
    if (!linkedConversations) return [];
    return linkedConversations.map((conv: any) => ({
      id: conv._id,
      name: conv.contactName ?? 'Unknown contact',
      message: conv.lastMessagePreview ?? '',
      time: formatRelative(conv.lastMessageAt),
      unread: conv.unreadCount,
      platform: conv.service as ConversationPlatform,
      requiresAction: conv.unreadCount > 0,
      conversationStatus: conv.status,
      assignedUserId: conv.assignedUserId,
      tags: conv.tags ?? [],
    }));
  }, [linkedConversations]);

  const allExistingTags = useMemo(() => {
    if (!linkedConversations) return [];
    const tagsSet = new Set<string>();
    for (const conv of linkedConversations) {
      if (conv.tags) {
        for (const tag of conv.tags) {
          tagsSet.add(tag);
        }
      }
    }
    return Array.from(tagsSet).sort();
  }, [linkedConversations]);

  const filteredChats = useMemo(() => {
    let list = chatItems;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c: any) =>
          c.name.toLowerCase().includes(q) ||
          c.message.toLowerCase().includes(q),
      );
    }
    if (platformFilter !== 'all') {
      list = list.filter((c: any) => c.platform === platformFilter);
    }
    if (chatFilter !== 'all') {
      if (chatFilter === 'assigned_me') {
        list = list.filter(
          (c: any) => c.assignedUserId === currentUser?.workosUserId,
        );
      } else {
        list = list.filter((c: any) => c.conversationStatus === chatFilter);
      }
    }
    if (tagFilter !== 'all') {
      list = list.filter((c: any) => c.tags.includes(tagFilter));
    }
    return list;
  }, [chatItems, searchQuery, platformFilter, chatFilter, tagFilter, currentUser?.workosUserId]);

  useEffect(() => {
    if (
      selectedConversationId &&
      !filteredChats.some((c: any) => c.id === selectedConversationId)
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

  const pinnedChats = filteredChats.filter((c: any) => pinnedIds.has(c.id as string));
  const unpinnedChats = filteredChats.filter((c: any) => !pinnedIds.has(c.id as string));

  const selectedName =
    selectedConversation?.contactName ??
    null;

  const selectedListItem = useMemo(
    () =>
      selectedConversationId
        ? chatItems.find((c: any) => c.id === selectedConversationId)
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



  const detailsPanelLoading =
    Boolean(selectedConversationId) && !conversationDocMatchesSelection;

  const displayHeaderName = selectedName ?? selectedListItem?.name ?? null;

  const currentWorkosUserId = currentUser?.workosUserId;

  const otherTeamUsers = useMemo(() => {
    if (!teamUsers) return [];
    if (!currentWorkosUserId) return teamUsers;
    return teamUsers.filter((m) => m.workosUserId !== currentWorkosUserId);
  }, [teamUsers, currentWorkosUserId]);

  const assignedMemberLabel = useMemo(() => {
    const wid = selectedConversation?.assignedUserId;
    if (!wid) return null;
    const u =
      teamUsers?.find((m) => m.workosUserId === wid) ??
      (currentUser?.workosUserId === wid ? currentUser : null);
    return u ? formatOrgMemberDisplayName(u) : 'Teammate';
  }, [selectedConversation?.assignedUserId, teamUsers, currentUser]);



  const handleAiToggle = async (enabled: boolean) => {
    if (!selectedConversationId) return;
    setAssigneeSaving(true);
    try {
      await setConversationAiEnabled({
        conversationId: selectedConversationId,
        enabled,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update AI replies');
    } finally {
      setAssigneeSaving(false);
    }
  };

  const handleLeadOwnerChange = async (workosUserId: string) => {
    if (!selectedConversationId) return;
    setAssigneeSaving(true);
    try {
      await setConversationLeadOwner({
        conversationId: selectedConversationId,
        workosUserId,
      });
      if (workosUserId === currentWorkosUserId) {
        toast.success('Conversation assigned to you');
      } else {
        toast.success('Conversation owner updated');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update assignee');
    } finally {
      setAssigneeSaving(false);
    }
  };



  const handleRemoveConversationTag = async (tag: string) => {
    const customerId = selectedConversation?.customerId;
    if (!customerId) return;
    setTagMutationBusy(true);
    try {
      await removeCustomerTag({
        customerId,
        tag,
      });
      toast.success('Tag removed');
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

  if (isLoading || connectedChannels === undefined) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
        <ChatsPageHeader />
        <div className="flex items-center justify-center py-20">
          <Spinner className="size-6 text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!can(Permission.CHATS_READ)) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
        <ChatsPageHeader />
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-card px-8 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
            <Lock className="size-6 text-muted-foreground" />
          </div>
          <div className="flex max-w-sm flex-col gap-1">
            <h2 className="text-lg font-semibold tracking-tight">
              Access Denied
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              You do not have permission to view conversations in this workspace.
            </p>
          </div>
        </div>
      </div>
    );
  }

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
            </div>            {/* Platform + Status + Tag: row layout, wrapping if needed */}
            <div className="flex w-full flex-wrap items-center gap-1.5">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 gap-1 px-3 font-normal text-xs"
                  >
                    <span className="truncate text-left">
                      {platformFilter === 'all' ? (
                        <span className="text-muted-foreground">Platform</span>
                      ) : (
                        <span className="text-foreground">{PLATFORM_LABEL[platformFilter]}</span>
                      )}
                    </span>
                    <ChevronDown className="size-3.5 shrink-0 opacity-50" />
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

              <Popover open={filterPopoverOpen} onOpenChange={setFilterPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 gap-1 px-3 font-normal text-xs"
                  >
                    <span className="truncate text-left">
                      {combinedFilter === 'all' ? (
                        <span className="text-muted-foreground">Filter</span>
                      ) : combinedFilter === 'status:assigned_me' ? (
                        <span className="flex items-center gap-1.5 text-foreground">
                          <User className="size-3.5 shrink-0 text-[#6366f1]" />
                          <span>Assigned to me</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-foreground truncate">
                          <span className={cn("size-1.5 rounded-full shrink-0", getTagColorClass(combinedFilter.slice(4)).dot)} />
                          <span className="truncate">{combinedFilter.slice(4)}</span>
                        </span>
                      )}
                    </span>
                    <ChevronDown className="size-3.5 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[200px] rounded-2xl shadow-lg border border-border bg-popover" align="end">
                  <Command className="p-1">
                    <CommandInput
                      placeholder="Search filters..."
                      value={filterSearchInput}
                      onValueChange={setFilterSearchInput}
                    />
                    <CommandList className="max-h-60 overflow-y-auto no-scrollbar">
                      <CommandEmpty>No filters found.</CommandEmpty>
                      
                      <CommandGroup heading="Filter">
                        <CommandItem
                          value="all"
                          onSelect={() => {
                            setCombinedFilter('all');
                            setFilterSearchInput('');
                            setFilterPopoverOpen(false);
                          }}
                          className="flex items-center justify-between text-xs cursor-pointer py-1.5 px-3 rounded-xl data-[selected=true]:bg-muted"
                        >
                          <span>All</span>
                          {combinedFilter === 'all' && <Check className="size-3 text-foreground shrink-0" />}
                        </CommandItem>
                        
                        <CommandItem
                          value="assigned_me"
                          onSelect={() => {
                            setCombinedFilter('status:assigned_me');
                            setFilterSearchInput('');
                            setFilterPopoverOpen(false);
                          }}
                          className="flex items-center justify-between text-xs cursor-pointer py-1.5 px-3 rounded-xl data-[selected=true]:bg-muted"
                        >
                          <div className="flex items-center gap-2">
                            <User className="size-3.5 shrink-0 text-[#6366f1]" />
                            <span>Assigned to me</span>
                          </div>
                          {combinedFilter === 'status:assigned_me' && <Check className="size-3 text-foreground shrink-0" />}
                        </CommandItem>
                      </CommandGroup>
                      
                      {(allExistingTags.length > 0 || (textEntries && textEntries.length > 0)) && (
                        <>
                          <CommandSeparator />
                          <CommandGroup heading="Tags">
                            {allExistingTags.map((tag) => {
                              const isSelected = combinedFilter === `tag:${tag}`;
                              return (
                                <CommandItem
                                  key={tag}
                                  value={tag}
                                  onSelect={() => {
                                    setCombinedFilter(`tag:${tag}`);
                                    setFilterSearchInput('');
                                    setFilterPopoverOpen(false);
                                  }}
                                  className="flex items-center justify-between text-xs cursor-pointer py-1.5 px-3 rounded-xl data-[selected=true]:bg-muted"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className={cn("size-1.5 rounded-full shrink-0", getTagColorClass(tag).dot)} />
                                    <span>{tag}</span>
                                  </div>
                                  {isSelected && <Check className="size-3 text-foreground shrink-0" />}
                                </CommandItem>
                              );
                            })}
                            
                            {textEntries && textEntries.map((entry) => {
                              const isSelected = combinedFilter === `tag:${entry.title}`;
                              return (
                                <CommandItem
                                  key={entry._id}
                                  value={entry.title}
                                  onSelect={() => {
                                    setCombinedFilter(`tag:${entry.title}`);
                                    setFilterSearchInput('');
                                    setFilterPopoverOpen(false);
                                  }}
                                  className="flex items-center justify-between text-xs cursor-pointer py-1.5 px-3 rounded-xl data-[selected=true]:bg-muted"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className={cn("size-1.5 rounded-full shrink-0", getTagColorClass(entry.title).dot)} />
                                    <span>{entry.title}</span>
                                  </div>
                                  {isSelected && <Check className="size-3 text-foreground shrink-0" />}
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
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
                    {pinnedChats.map((chat: any, index: number) => (
                      <ChatRow key={chat.id} chat={chat} index={index} total={pinnedChats.length} isSelected={selectedConversationId === chat.id} isPinned onSelect={setSelectedConversationId} onTogglePin={togglePin} />
                    ))}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px 6px', borderBottom: '1px solid var(--color-border)', borderTop: '1px solid var(--color-border)' }}>
                      <MessageSquare size={11} color="var(--color-foreground-subtle)" />
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-foreground-subtle)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>All</span>
                    </div>
                  </>
                )}

                {unpinnedChats.map((chat: any, index: number) => (
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
                  disabled={threadDataLoading || !canReplyFromInbox || !can(Permission.CHATS_REPLY)}
                  onChange={setDraftReply}
                  onSubmit={(message) => void handleSendReply(message)}
                  placeholder={
                    threadDataLoading
                      ? 'Loading conversation…'
                      : !can(Permission.CHATS_REPLY)
                        ? 'You do not have permission to reply to chats'
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
                        <span className="text-sm font-semibold text-foreground">Assignment</span>
                      </div>
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
                          <label htmlFor="ai-replies-switch-chat" className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                            <Bot className="size-4 text-muted-foreground" />
                            AI replies
                          </label>
                          <Switch
                            id="ai-replies-switch-chat"
                            checked={selectedConversation.assignToAiAgent}
                            onCheckedChange={(checked) => void handleAiToggle(checked)}
                            disabled={assigneeSaving || !can(Permission.CHATS_ASSIGN)}
                            className="shrink-0 data-[state=checked]:bg-emerald-600"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-xs text-muted-foreground">Assignee</p>
                            {selectedConversation.assignedUserId !== currentWorkosUserId && currentWorkosUserId ? (
                              <button
                                type="button"
                                onClick={() => void handleLeadOwnerChange(currentWorkosUserId)}
                                disabled={assigneeSaving}
                                className="text-xs font-semibold text-blue-600 hover:text-blue-500 hover:underline cursor-pointer disabled:opacity-50"
                              >
                                {assigneeSaving ? 'Assigning...' : 'Assign to me'}
                              </button>
                            ) : null}
                          </div>
                          {can(Permission.CHATS_ASSIGN) ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  disabled={assigneeSaving}
                                  className="h-auto min-h-10 w-full cursor-pointer justify-between gap-2 rounded-md border-border bg-background px-3 py-2.5 text-left text-sm font-normal shadow-none hover:bg-muted/40"
                                >
                                  <span className="flex min-w-0 flex-1 items-center gap-2">
                                    <User className="size-4 shrink-0 text-muted-foreground" />
                                    <span className="truncate text-foreground">
                                      {assignedMemberLabel ?? 'Select teammate'}
                                    </span>
                                  </span>
                                  <ChevronDown className="size-4 shrink-0 opacity-60" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="min-w-[12rem]">
                                {otherTeamUsers.length > 0 ? (
                                  <DropdownMenuGroup>
                                    {otherTeamUsers.map((u) => (
                                      <DropdownMenuItem
                                        key={u._id}
                                        className="cursor-pointer gap-2"
                                        onSelect={() =>
                                          void handleLeadOwnerChange(u.workosUserId)
                                        }
                                      >
                                        <User className="size-4 shrink-0 text-muted-foreground" />
                                        {formatOrgMemberDisplayName(u)}
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuGroup>
                                ) : (
                                  <div className="px-2.5 py-2 text-xs text-muted-foreground">
                                    No other teammates
                                  </div>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              disabled
                              className="h-auto min-h-10 w-full justify-start gap-2 px-3 py-2.5 text-sm font-normal"
                            >
                              <User className="size-4 shrink-0 text-muted-foreground" />
                              {assignedMemberLabel ?? 'Teammate'}
                            </Button>
                          )}
                        </div>
                      </div>
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
                        <span className="flex-1 text-sm font-semibold text-foreground">
                          Tags ({(selectedConversation.tags ?? []).length})
                        </span>
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
                            <div className="flex flex-wrap gap-1.5 py-1.5">
                              {(selectedConversation.tags ?? []).map((tag: any) => {
                                const colors = getTagColorClass(tag);
                                return (
                                  <span
                                    key={tag}
                                    className={cn(
                                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all shadow-none",
                                      colors.bg,
                                      colors.text
                                    )}
                                  >
                                    <span className={cn("size-1.5 rounded-full shrink-0", colors.dot)} />
                                    <span className="max-w-[120px] truncate" title={tag}>
                                      {tag}
                                    </span>
                                    <button
                                      type="button"
                                      className="ml-0.5 rounded-full p-0.5 hover:bg-black/5 dark:hover:bg-white/10 text-current opacity-60 hover:opacity-100 disabled:opacity-40"
                                      disabled={tagMutationBusy || !can(Permission.CHATS_TAG)}
                                      aria-label={`Remove tag ${tag}`}
                                      onClick={() => void handleRemoveConversationTag(tag)}
                                    >
                                      ×
                                    </button>
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="m-0 py-2 text-xs text-muted-foreground">
                              No tags yet.
                            </p>
                          )}
                          {can(Permission.CHATS_TAG) && (
                            <div className="mt-3 flex gap-2">
                              <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
                                <PopoverTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    disabled={tagMutationBusy}
                                    className="h-9 w-full justify-between gap-2 rounded-md border-border bg-background px-3 py-2 text-xs font-normal text-muted-foreground hover:text-foreground"
                                  >
                                    <span className="flex items-center gap-2">
                                      <Tag className="size-3.5 shrink-0" />
                                      <span>Select or create new one</span>
                                    </span>
                                    <ChevronDown className="size-4 shrink-0 opacity-60" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="p-0 w-[268px] rounded-2xl shadow-lg border border-border bg-popover" align="start">
                                  <Command className="p-1">
                                    <CommandInput
                                      placeholder="Select or create new one"
                                      value={tagSearchInput}
                                      onValueChange={setTagSearchInput}
                                    />
                                    <CommandList className="max-h-60 overflow-y-auto no-scrollbar">
                                      <CommandEmpty className="py-3 text-center text-xs text-muted-foreground">
                                        No tags found.
                                      </CommandEmpty>
                                      
                                      {allExistingTags.length > 0 && (
                                        <CommandGroup heading="Existing tags">
                                          {allExistingTags.map((tag) => {
                                            const isSelected = (selectedConversation.tags ?? []).includes(tag);
                                            return (
                                              <CommandItem
                                                key={tag}
                                                value={tag}
                                                onSelect={() => {
                                                  if (isSelected) {
                                                    void handleRemoveConversationTag(tag);
                                                  } else {
                                                    void handleAddSpecificTag(tag);
                                                  }
                                                }}
                                                className="flex items-center justify-between text-xs cursor-pointer py-1.5 px-3 rounded-xl data-[selected=true]:bg-muted"
                                              >
                                                <div className="flex items-center gap-2">
                                                  <span className={cn("size-1.5 rounded-full shrink-0", getTagColorClass(tag).dot)} />
                                                  <span>{tag}</span>
                                                </div>
                                                {isSelected && <Check className="size-3 text-foreground shrink-0" />}
                                              </CommandItem>
                                            );
                                          })}
                                        </CommandGroup>
                                      )}
                                      
                                      {textEntries && textEntries.length > 0 && (
                                        <CommandGroup heading="Text entries">
                                          {textEntries.map((entry) => {
                                            const isSelected = (selectedConversation.tags ?? []).includes(entry.title);
                                            return (
                                              <CommandItem
                                                key={entry._id}
                                                value={entry.title}
                                                onSelect={() => {
                                                  if (isSelected) {
                                                    void handleRemoveConversationTag(entry.title);
                                                  } else {
                                                    void handleAddSpecificTag(entry.title);
                                                  }
                                                }}
                                                className="flex items-center justify-between text-xs cursor-pointer py-1.5 px-3 rounded-xl data-[selected=true]:bg-muted"
                                              >
                                                <div className="flex items-center gap-2">
                                                  <span className={cn("size-1.5 rounded-full shrink-0", getTagColorClass(entry.title).dot)} />
                                                  <span>{entry.title}</span>
                                                </div>
                                                {isSelected && <Check className="size-3 text-foreground shrink-0" />}
                                              </CommandItem>
                                            );
                                          })}
                                        </CommandGroup>
                                      )}
                                    </CommandList>
                                    
                                    {tagSearchInput.trim() && !allExistingTags.some(t => t.toLowerCase() === tagSearchInput.trim().toLowerCase()) && (
                                      <div className="p-1 border-t border-border/50">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            void handleAddSpecificTag(tagSearchInput.trim());
                                            setTagSearchInput('');
                                            setTagPopoverOpen(false);
                                          }}
                                          className="flex w-full items-center gap-2 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-muted py-2 px-3 rounded-xl text-left"
                                        >
                                          <span>+</span>
                                          <span>Add new tag: "{tagSearchInput.trim()}"</span>
                                        </button>
                                      </div>
                                    )}
                                  </Command>
                                </PopoverContent>
                              </Popover>
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
        <h1 className="m-0 text-4xl font-semibold tracking-tight text-foreground">
          Messages
        </h1>
      </div>
    </div>
  );
}
