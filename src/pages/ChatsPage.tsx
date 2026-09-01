import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { useAction, useMutation, useQuery } from 'convex/react';
import { usePaginatedQuery } from 'convex-helpers/react';
import {
  Bot,
  ChevronDown,
  Clock,
  Contact,
  FileText,
  Globe,
  Lock,
  MessageSquare,
  MessageSquareDot,
  PanelRightClose,
  PanelRightOpen,
  Plug,
  Sparkles,
  Tag,
  User,
  UserX,
  Check,
  AlertCircle,
  Plus,
  ScanFace,
  type LucideIcon,
} from 'lucide-react';
import { isLeadTemperatureTag, getLeadTemperatureStyle, isReservedTemperatureTag, type LeadTemperature } from '@/lib/leadTemperature';
import { SiInstagram, SiMessenger, SiWhatsapp } from 'react-icons/si';
import { toast } from 'sonner';
import { type Chat, type ConversationPlatform } from '@/components/ChatRow';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Spinner } from '@/components/ui/spinner';
import { ShineBorder } from '@/components/ui/shine-border';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { api } from '../../convex/_generated/api';
import type { Doc, Id } from '../../convex/_generated/dataModel';
import { cn } from '@/lib/utils';
import { getPlatformIconClassName } from '@/lib/platformIconStyles';
import {
  hasVisibleInboxContent,
  type InboxUIMessage,
} from '@/lib/inboxOptimistic';
import { Conversation } from '@/components/ai-elements/conversation';
import { Shimmer } from '@/components/ai-elements/shimmer';
import {
  InboxConversationList,
  type InboxConversationSort,
} from '@/components/inbox/InboxConversationList';
import { InboxMobileConversationSwitcher } from '@/components/inbox/InboxMobileConversationSwitcher';
import { InboxMobileDetailsSheet } from '@/components/inbox/InboxMobileDetailsSheet';
import { InboxDemoPreview } from '@/components/inbox/InboxDemoPreview';
import type { InboxActiveFilter } from '@/components/inbox/InboxActiveFilterChips';
import {
  InboxChatAreaSkeleton,
  InboxFilterSidebarSkeleton,
  InboxPageSkeleton,
} from '@/components/inbox/InboxPageSkeleton';
import {
  InboxBookingDetailsCard,
} from '@/components/inbox/InboxBookingDetailsCard';
import { InboxCustomerBookingsSection } from '@/components/inbox/InboxCustomerBookingsSection';
import { CreateCustomerBookingDialog } from '@/components/inbox/CreateCustomerBookingDialog';
import { InboxCustomerBookingDetailsDialog } from '@/components/inbox/InboxCustomerBookingDetailsDialog';
import { runInboxLeadStatusUpdate } from '@/components/inbox/inboxLeadStatusToast';
import {
  getMostRecentCustomerBooking,
  type CustomerBookingHistoryItem,
} from '@/components/inbox/customerBookingsModel';
import { BookedCheckIcon } from '@/components/booking/BookingDetailsPanel';
import {
  InboxFilterSidebar,
  type AssignmentFilter,
} from '@/components/inbox/InboxFilterSidebar';
import {
  inboxChatGridClassName,
  inboxColumnClassName,
  inboxColumnHeaderClassName,
  inboxColumnScrollClassName,
} from '@/components/inbox/inboxLayout';
import { InboxReplyInput } from '@/components/inbox/InboxReplyInput';
import { ConversationWindowBanner } from '@/components/inbox/ConversationWindowBanner';
import { InboxThreadMessages } from '@/components/inbox/InboxThreadMessages';
import { InboxActionHistory } from '@/components/inbox/InboxActionHistory';
import { AvatarConversationTag } from '@/components/inbox/AvatarConversationTag';
import {
  buildInboxEscalationMarkers,
} from '@/components/inbox/inboxEscalationMarkers';
import { type PromptInputMessage } from '@/components/ai-elements/prompt-input';
import { usePermissions } from '@/hooks/usePermissions';
import { Permission } from '../../shared/permissions';

const FILTER_SIDEBAR_STORAGE_KEY = 'inbox-filter-sidebar-open';

const INBOX_PLATFORM_LABEL: Record<ConversationPlatform, string> = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  messenger: 'Messenger',
  web: 'Web',
  avatar: 'Avatar',
};

type InboxChatListItem = Chat & {
  assignedUserId?: string;
  lastMessageAt: number;
};

function sortInboxChats(
  chats: InboxChatListItem[],
  order: InboxConversationSort,
): InboxChatListItem[] {
  return [...chats].sort((a, b) =>
    order === 'newest'
      ? b.lastMessageAt - a.lastMessageAt
      : a.lastMessageAt - b.lastMessageAt,
  );
}

function readFilterSidebarOpen(): boolean {
  try {
    const value = localStorage.getItem(FILTER_SIDEBAR_STORAGE_KEY);
    return value === null ? true : value === 'true';
  } catch {
    return true;
  }
}

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

function formatOrgMemberDisplayName(user: Doc<'users'>): string {
  const parts = [user.firstName, user.lastName].filter(Boolean);
  if (parts.length > 0) return parts.join(' ');
  return user.email;
}

function getTagColorClass(): { bg: string; text: string; dot: string } {
  return {
    bg: 'bg-zinc-100 dark:bg-zinc-800/80 border-zinc-200/80 dark:border-zinc-700/60 shadow-none',
    text: 'text-zinc-600 dark:text-zinc-400',
    dot: 'bg-zinc-400 dark:bg-zinc-500',
  };
}

function PlatformMenuIcon({
  platform,
  size = 16,
}: {
  platform: ConversationPlatform;
  size?: number;
}) {
  const common = {
    size,
    className: cn('shrink-0', getPlatformIconClassName(platform)),
  } as const;
  switch (platform) {
    case 'whatsapp':
      return <SiWhatsapp {...common} />;
    case 'instagram':
      return <SiInstagram {...common} />;
    case 'messenger':
      return <SiMessenger {...common} />;
    case 'web':
      return <Globe size={size} className={getPlatformIconClassName(platform)} />;
    case 'avatar':
      return <ScanFace size={size} className={getPlatformIconClassName(platform)} />;
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

function DetailsPanelRailButton({
  label,
  icon: Icon,
  marker,
  iconClassName,
  onClick,
}: {
  label: string;
  icon?: LucideIcon;
  marker?: boolean;
  iconClassName?: string;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClick}
          className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
          aria-label={label}
        >
          {marker ? (
            <BookedCheckIcon />
          ) : Icon ? (
            <Icon className={cn('size-4', iconClassName)} />
          ) : null}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left">{label}</TooltipContent>
    </Tooltip>
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
  const [searchParams] = useSearchParams();
  const typedAgentId = agentId as Id<'agents'> | undefined;
  const { can, isLoading } = usePermissions();
  const connectedChannels = useQuery(
    api.channels.getConnectedForCurrentOrg,
    typedAgentId ? { agentId: typedAgentId } : {},
  );
  const linkedConversations = useQuery(
    api.conversations.listLinkedForCurrentOrg,
    connectedChannels !== undefined
      ? typedAgentId
        ? { agentId: typedAgentId }
        : {}
      : 'skip',
  );
  const bookingConversationIds = useQuery(
    api.appointmentBooking.currentBooking.listActiveBookingConversationIdsForCurrentOrg,
    connectedChannels !== undefined ? {} : 'skip',
  );
  const currentUser = useQuery(api.users.currentUser);

  const [selectedConversationId, setSelectedConversationId] = useState<
    Id<'conversations'> | null
  >(null);
  const [mobileConversationSwitcherOpen, setMobileConversationSwitcherOpen] = useState(false);
  const [mobileConversationSearchQuery, setMobileConversationSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<'all' | ConversationPlatform>('all');
  const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>('all');
  const [escalatedActive, setEscalatedActive] = useState(false);
  const [bookingActive, setBookingActive] = useState(false);
  const [activeLeads, setActiveLeads] = useState<LeadTemperature[]>([]);
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [filterSidebarOpen, setFilterSidebarOpen] = useState(readFilterSidebarOpen);

  const handleToggleLead = (lead: LeadTemperature) => {
    setActiveLeads((prev) =>
      prev.includes(lead) ? prev.filter((item) => item !== lead) : [...prev, lead],
    );
  };

  const handleToggleTag = (tag: string) => {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag],
    );
  };

  useEffect(() => {
    try {
      localStorage.setItem(FILTER_SIDEBAR_STORAGE_KEY, String(filterSidebarOpen));
    } catch {
      // ignore storage errors
    }
  }, [filterSidebarOpen]);
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [conversationSort, setConversationSort] =
    useState<InboxConversationSort>('newest');
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
  const markRead = useAction(api.conversations.markReadAndSendSeen);
  const setConversationAiEnabled = useMutation(api.conversations.setConversationAiEnabled);
  const setConversationLeadOwner = useMutation(api.conversations.setConversationLeadOwner);
  const resolveEscalation = useMutation(api.conversations.resolveEscalation);
  const addCustomerTag = useMutation(api.customers.addCustomerTag);
  const removeCustomerTag = useMutation(api.customers.removeCustomerTag);
  const updateCustomer = useMutation(api.customers.update);
  const teamUsers = useQuery(api.users.getUsers, {});
  const [assigneeSaving, setAssigneeSaving] = useState(false);

  const [tagMutationBusy, setTagMutationBusy] = useState(false);
  const [leadStatusSaving, setLeadStatusSaving] = useState(false);
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);
  const [tagSearchInput, setTagSearchInput] = useState('');
  const [resolveConfirmOpen, setResolveConfirmOpen] = useState(false);
  const [resolveBusy, setResolveBusy] = useState(false);

  const [isEditingCustomerDetails, setIsEditingCustomerDetails] = useState(false);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerPhone, setEditCustomerPhone] = useState('');
  const [editCustomerEmail, setEditCustomerEmail] = useState('');
  const [isSavingCustomerDetails, setIsSavingCustomerDetails] = useState(false);

  const handleAddSpecificTag = async (tag: string) => {
    const raw = tag.trim();
    const customerId = selectedConversation?.customerId;
    if (!raw || !customerId) return;
    setTagMutationBusy(true);
    try {
      await addCustomerTag({
        customerId,
        tag: raw,
        conversationId: selectedConversation._id,
      });
      toast.success(`Tag "${raw}" added`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not add tag');
    } finally {
      setTagMutationBusy(false);
    }
  };

  const [interactionSummaryOpen, setInteractionSummaryOpen] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [generatedSummary, setGeneratedSummary] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [tagsSectionOpen, setTagsSectionOpen] = useState(false);
  const [customerDetailsOpen, setCustomerDetailsOpen] = useState(false);
  const [bookingsOpen, setBookingsOpen] = useState(false);
  const [createBookingOpen, setCreateBookingOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [detailsPanelOpen, setDetailsPanelOpen] = useState(true);
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);
  const [logSectionOpen, setLogSectionOpen] = useState(false);
  const ensureAssignedAgent = useMutation(api.conversations.ensureAssignedAgent);
  const textEntries = useQuery(
    api.knowledgeBase.listTextEntries,
    agentId ? { agentId: agentId as Id<'agents'> } : 'skip',
  );

  const selectedConversation = useQuery(
    api.conversations.get,
    selectedConversationId ? { conversationId: selectedConversationId } : 'skip',
  );

  const generateThreadSummary = useAction(api.chat.inboxActions.generateThreadSummary);

  const threadId = selectedConversation?.threadId;

  const sendReply = useAction(api.chat.inboxActions.sendReply);
  const reactToMessage = useAction(api.chat.inboxActions.reactToMessage);
  const removeReactionFromMessage = useAction(api.chat.inboxActions.removeReactionFromMessage);

  const { results: threadMessages, status: threadMessagesStatus, loadMore: loadMoreThreadMessages } = usePaginatedQuery(
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

  const customerBookings = useQuery(
    api.appointmentBooking.customerBookings.listForConversation,
    selectedConversationId ? { conversationId: selectedConversationId } : 'skip',
  ) as CustomerBookingHistoryItem[] | undefined;
  const mostRecentBooking = getMostRecentCustomerBooking(customerBookings ?? []);
  const selectedBooking = customerBookings?.find((booking) => booking.bookingId === selectedBookingId) ?? null;

  const conversationLogs = useQuery(
    api.conversationLogs.listByConversation,
    selectedConversationId ? { conversationId: selectedConversationId } : 'skip',
  );

  const connectedPlatforms = useMemo(() => {
    const seen = new Set<ConversationPlatform>();
    const order: ConversationPlatform[] = ['whatsapp', 'instagram', 'messenger', 'web', 'avatar'];
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
    setGeneratedSummary(null);
    setSummaryError(null);
    setIsGeneratingSummary(false);
    setIsEditingCustomerDetails(false);
  }, [selectedConversationId]);

  const handleGenerateSummary = async () => {
    if (!selectedConversationId || isGeneratingSummary) return;
    setIsGeneratingSummary(true);
    setSummaryError(null);
    try {
      const result = await generateThreadSummary({
        conversationId: selectedConversationId,
      });
      setGeneratedSummary(result.summary);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not generate summary';
      setSummaryError(message);
      toast.error(message);
    } finally {
      setIsGeneratingSummary(false);
    }
  };



  const bookingConversationIdSet = useMemo(() => {
    if (!bookingConversationIds) return new Set<string>();
    return new Set(bookingConversationIds.map((id) => id as string));
  }, [bookingConversationIds]);

  const chatItems = useMemo((): InboxChatListItem[] => {
    if (!linkedConversations) return [];
    return linkedConversations.map((conv) => ({
      id: conv._id,
      name: conv.contactName ?? 'Unknown contact',
      message: conv.lastMessagePreview && conv.lastMessagePreview.trim() !== ''
        ? conv.lastMessagePreview
        : 'Click to view the conversation...',
      time: formatRelative(conv.lastMessageAt),
      lastMessageAt: conv.lastMessageAt,
      unread: conv.unreadCount,
      platform: conv.service as ConversationPlatform,
      requiresAction: conv.unreadCount > 0,
      conversationStatus: conv.status,
      assignedUserId: conv.assignedUserId,
      tags: conv.tags ?? [],
      leadTemperature: conv.leadTemperature,
      hasBooking: conv.status === 'booked' || bookingConversationIdSet.has(conv._id as string),
      escalation: conv.escalation,
    }));
  }, [linkedConversations, bookingConversationIdSet]);

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

  const filterCounts = useMemo(() => {
    const counts = {
      all: chatItems.length,
      unread: 0,
      assigned_me: 0,
      unassigned: 0,
      escalated: 0,
      booking: 0,
      byPlatform: {} as Partial<Record<ConversationPlatform, number>>,
      byLead: {} as Partial<Record<LeadTemperature, number>>,
      byTag: {} as Record<string, number>,
    };
    for (const chat of chatItems) {
      if (chat.unread > 0) {
        counts.unread += 1;
      }
      if (chat.assignedUserId === currentUser?.workosUserId) {
        counts.assigned_me += 1;
      }
      if (!chat.assignedUserId) {
        counts.unassigned += 1;
      }
      if (chat.conversationStatus === 'requires_user_input') {
        counts.escalated += 1;
      }
      if (chat.conversationStatus === 'booked' || bookingConversationIdSet.has(chat.id as string)) {
        counts.booking += 1;
      }
      counts.byPlatform[chat.platform] = (counts.byPlatform[chat.platform] ?? 0) + 1;
      if (chat.leadTemperature) {
        counts.byLead[chat.leadTemperature] =
          (counts.byLead[chat.leadTemperature] ?? 0) + 1;
      }
      for (const tag of chat.tags ?? []) {
        counts.byTag[tag] = (counts.byTag[tag] ?? 0) + 1;
      }
    }
    return counts;
  }, [chatItems, currentUser?.workosUserId, bookingConversationIdSet]);

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
    if (assignmentFilter === 'unread') {
      list = list.filter((c) => c.unread > 0);
    } else if (assignmentFilter === 'assigned_me') {
      list = list.filter((c) => c.assignedUserId === currentUser?.workosUserId);
    } else if (assignmentFilter === 'unassigned') {
      list = list.filter((c) => !c.assignedUserId);
    }
    if (escalatedActive) {
      list = list.filter((c) => c.conversationStatus === 'requires_user_input');
    }
    if (bookingActive) {
      list = list.filter((c) => c.conversationStatus === 'booked' || bookingConversationIdSet.has(c.id as string));
    }
    if (activeTags.length > 0) {
      list = list.filter(
        (c) => c.tags && activeTags.every((tag) => c.tags!.includes(tag)),
      );
    }
    if (activeLeads.length > 0) {
      list = list.filter(
        (c) =>
          c.leadTemperature &&
          activeLeads.every((lead) => c.leadTemperature === lead),
      );
    }
    return list;
  }, [
    chatItems,
    searchQuery,
    platformFilter,
    assignmentFilter,
    escalatedActive,
    bookingActive,
    activeTags,
    activeLeads,
    currentUser?.workosUserId,
    bookingConversationIdSet,
  ]);

  const mobileSwitcherChats = useMemo(() => {
    const query = mobileConversationSearchQuery.trim().toLowerCase();
    if (!query) return filteredChats;
    return filteredChats.filter(
      (chat) =>
        chat.name.toLowerCase().includes(query) ||
        chat.message.toLowerCase().includes(query),
    );
  }, [filteredChats, mobileConversationSearchQuery]);

  useEffect(() => {
    if (mobileConversationSwitcherOpen) return;
    if (
      selectedConversationId &&
      !filteredChats.some((c: any) => c.id === selectedConversationId)
    ) {
      setSelectedConversationId(null);
    }
  }, [filteredChats, mobileConversationSwitcherOpen, selectedConversationId]);

  const togglePin = (id: Id<'conversations'>) => {
    const key = id as string;
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleMobileConversationSwitcherOpenChange = (open: boolean) => {
    setMobileConversationSwitcherOpen(open);
    if (!open) setMobileConversationSearchQuery('');
  };

  const pinnedChats = useMemo(
    () =>
      sortInboxChats(
        filteredChats.filter((c) => pinnedIds.has(c.id as string)),
        conversationSort,
      ),
    [filteredChats, pinnedIds, conversationSort],
  );
  const unpinnedChats = useMemo(
    () =>
      sortInboxChats(
        filteredChats.filter((c) => !pinnedIds.has(c.id as string)),
        conversationSort,
      ),
    [filteredChats, pinnedIds, conversationSort],
  );

  const activeInboxFilters = useMemo((): InboxActiveFilter[] => {
    const filters: InboxActiveFilter[] = [];
    if (assignmentFilter === 'assigned_me') {
      filters.push({
        id: 'assignment:assigned_me',
        label: 'Assigned to me',
        icon: <User className="text-muted-foreground" />,
      });
    } else if (assignmentFilter === 'unread') {
      filters.push({
        id: 'assignment:unread',
        label: 'Unread',
        icon: <MessageSquareDot className="text-muted-foreground" />,
      });
    } else if (assignmentFilter === 'unassigned') {
      filters.push({
        id: 'assignment:unassigned',
        label: 'Unassigned',
        icon: <UserX className="text-muted-foreground" />,
      });
    }
    if (platformFilter !== 'all') {
      const PlatformIcon =
        platformFilter === 'whatsapp'
          ? SiWhatsapp
          : platformFilter === 'instagram'
            ? SiInstagram
            : SiMessenger;
      filters.push({
        id: `platform:${platformFilter}`,
        label: INBOX_PLATFORM_LABEL[platformFilter],
        icon: (
          <PlatformIcon className={cn('shrink-0', getPlatformIconClassName(platformFilter))} />
        ),
      });
    }
    if (escalatedActive) {
      filters.push({
        id: 'status:escalated',
        label: 'Escalated',
        icon: <AlertCircle className="text-amber-500" />,
      });
    }
    if (bookingActive) {
      filters.push({
        id: 'status:booking',
        label: 'Booked',
        icon: <BookedCheckIcon size="xs" />,
      });
    }
    for (const lead of activeLeads) {
      const style = getLeadTemperatureStyle(lead);
      const LeadIcon = style.icon;
      filters.push({
        id: `lead:${lead}`,
        label: lead,
        icon: <LeadIcon className={style.iconClass} />,
      });
    }
    for (const tag of activeTags) {
      filters.push({
        id: `tag:${tag}`,
        label: tag,
        icon: <Tag className="text-muted-foreground" />,
      });
    }
    return filters;
  }, [
    assignmentFilter,
    platformFilter,
    escalatedActive,
    bookingActive,
    activeLeads,
    activeTags,
  ]);

  const handleRemoveInboxFilter = (id: string) => {
    if (
      id === 'assignment:assigned_me' ||
      id === 'assignment:unassigned' ||
      id === 'assignment:unread'
    ) {
      setAssignmentFilter('all');
      return;
    }
    if (id.startsWith('platform:')) {
      setPlatformFilter('all');
      return;
    }
    if (id === 'status:escalated') {
      setEscalatedActive(false);
      return;
    }
    if (id === 'status:booking') {
      setBookingActive(false);
      return;
    }
    if (id.startsWith('lead:')) {
      const lead = id.slice('lead:'.length) as LeadTemperature;
      setActiveLeads((prev) => prev.filter((item) => item !== lead));
      return;
    }
    if (id.startsWith('tag:')) {
      const tag = id.slice('tag:'.length);
      setActiveTags((prev) => prev.filter((item) => item !== tag));
    }
  };

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
  const escalationMarkers = useMemo(() => {
    return buildInboxEscalationMarkers(conversationLogs);
  }, [conversationLogs]);
  const [pendingEscalationFocusId, setPendingEscalationFocusId] = useState<string | null>(null);

  const focusEscalation = useCallback((escalationId: string) => {
    const marker = document.getElementById(`inbox-escalation-${escalationId}`);
    if (!marker) {
      setPendingEscalationFocusId(escalationId);
      return;
    }
    marker.scrollIntoView({ behavior: 'smooth', block: 'center' });
    marker.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (!pendingEscalationFocusId) return;
    const marker = document.getElementById(`inbox-escalation-${pendingEscalationFocusId}`);
    if (marker) {
      marker.scrollIntoView({ behavior: 'smooth', block: 'center' });
      marker.focus({ preventScroll: true });
      setPendingEscalationFocusId(null);
      return;
    }
    if (threadMessagesStatus === 'CanLoadMore') {
      void loadMoreThreadMessages(80);
      return;
    }
    if (threadMessagesStatus !== 'LoadingMore' && threadMessagesStatus !== 'LoadingFirstPage') {
      setPendingEscalationFocusId(null);
    }
  }, [loadMoreThreadMessages, pendingEscalationFocusId, threadMessagesStatus, visibleThreadMessages]);



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
    const promise = setConversationAiEnabled({
      conversationId: selectedConversationId,
      enabled,
    });
    toast.promise(promise, {
      loading: enabled ? 'Enabling AI replies…' : 'Disabling AI replies…',
      success: enabled ? 'AI replies enabled' : 'AI replies disabled',
      error: (e) => e instanceof Error ? e.message : 'Could not update AI replies',
    });
    try {
      await promise;
    } catch (e) {
      // Ignored here as toast.promise handles display
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



  const handleExpandDetailsSection = (
    section?: 'assignee' | 'customer' | 'tags' | 'summary' | 'log',
  ) => {
    setDetailsPanelOpen(true);
    if (section === 'customer') setCustomerDetailsOpen(true);
    if (section === 'tags') setTagsSectionOpen(true);
    if (section === 'summary') setInteractionSummaryOpen(true);
    if (section === 'log') setLogSectionOpen(true);
  };

  const handleCreateTagFromFilters = () => {
    if (!can(Permission.CHATS_TAG)) {
      toast.error('You do not have permission to add tags.');
      return;
    }
    if (!selectedConversationId) {
      toast.info('Select a conversation first to create a tag.');
      return;
    }
    handleExpandDetailsSection('tags');
    setTagPopoverOpen(true);
  };

  const handleLeadStatusChange = async (value: string) => {
    const customerId = selectedConversation?.customerId;
    if (!customerId) return;
    setLeadStatusSaving(true);
    try {
      await runInboxLeadStatusUpdate(() => updateCustomer({
        customerId,
        leadTemperature: value === 'None' ? null : (value as LeadTemperature),
        conversationId: selectedConversation._id,
      }));
    } finally {
      setLeadStatusSaving(false);
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
        conversationId: selectedConversation._id,
      });
      toast.success('Tag removed');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not remove tag');
    } finally {
      setTagMutationBusy(false);
    }
  };

  const handleStartEditCustomerDetails = () => {
    setEditCustomerName(customerSidebarDetails?.name ?? '');
    setEditCustomerPhone(customerSidebarDetails?.phone ?? '');
    setEditCustomerEmail(customerSidebarDetails?.email ?? '');
    setIsEditingCustomerDetails(true);
  };

  const handleSaveCustomerDetails = async () => {
    const customerId = customerSidebarDetails?.customerId;
    if (!customerId) return;
    setIsSavingCustomerDetails(true);
    try {
      await updateCustomer({
        customerId,
        name: editCustomerName,
        phone: editCustomerPhone,
        email: editCustomerEmail,
        conversationId: selectedConversation?._id,
      });
      toast.success('Customer details updated');
      setIsEditingCustomerDetails(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update customer details');
    } finally {
      setIsSavingCustomerDetails(false);
    }
  };

  const handleResolveEscalation = async () => {
    if (!selectedConversationId) return;
    setResolveBusy(true);
    try {
      await resolveEscalation({ conversationId: selectedConversationId });
      toast.success('Conversation marked as resolved');
      setResolveConfirmOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not resolve escalation');
    } finally {
      setResolveBusy(false);
    }
  };



  const canReplyFromInbox =
    selectedConversation?.service === 'whatsapp' ||
    selectedConversation?.service === 'instagram' ||
    selectedConversation?.service === 'messenger' ||
    selectedConversation?.service === 'web';

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
      service !== 'messenger' &&
      service !== 'web'
    ) {
      toast.error(
        'Sending from the inbox is available for connected channels only right now.',
      );
      return;
    }
    const isMetaService =
      service === 'whatsapp' ||
      service === 'instagram' ||
      service === 'messenger';
    // Guard: Meta 24-hour conversation window
    const lastCustomerMessageAt = selectedConversation?.lastCustomerMessageAt;
    const WINDOW_MS = 24 * 60 * 60 * 1000;
    const windowClosed =
      lastCustomerMessageAt === undefined ||
      Date.now() - lastCustomerMessageAt >= WINDOW_MS;
    if (isMetaService && windowClosed) {
      toast.error(
        'Conversation window closed. Sending outside the window violates Meta policy — your account could be banned. Use a template message to re-open the conversation.',
        { duration: 6000 },
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
        agentName: currentUser ? formatOrgMemberDisplayName(currentUser) : '',
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

  const handleReactToMessage = async (message: InboxUIMessage, emoji: string) => {
    if (!selectedConversationId || !message.ledgerMessageId) {
      throw new Error('This message cannot be reacted to yet');
    }
    await reactToMessage({
      conversationId: selectedConversationId,
      messageId: message.ledgerMessageId as Id<'messages'>,
      emoji: emoji as '👍' | '❤️' | '🙏' | '✅' | '🤝',
    });
  };

  const handleRemoveReactionFromMessage = async (message: InboxUIMessage) => {
    if (!selectedConversationId || !message.ledgerMessageId) return;
    try {
      await removeReactionFromMessage({
        conversationId: selectedConversationId,
        messageId: message.ledgerMessageId as Id<'messages'>,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not remove reaction');
    }
  };

  const conversationsStillLoading = linkedConversations === undefined;

  const kbTagTitles = useMemo(
    () => (textEntries ?? []).map((entry) => entry.title),
    [textEntries],
  );

  const userTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const tag of allExistingTags) {
      if (!isLeadTemperatureTag(tag)) {
        tagSet.add(tag);
      }
    }
    for (const title of kbTagTitles) {
      if (!isLeadTemperatureTag(title)) {
        tagSet.add(title);
      }
    }
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
  }, [allExistingTags, kbTagTitles]);

  if (isLoading || connectedChannels === undefined) {
    return <InboxPageSkeleton />;
  }

  if (!can(Permission.CHATS_READ)) {
    return (
      <div className="flex h-full flex-col gap-6 px-8 py-8">
        <ChatsPageHeader />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-card px-8 text-center">
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

  if (import.meta.env.DEV && searchParams.get('dummyData') === 'true') {
    return <InboxDemoPreview />;
  }

  if (connectedChannels.length === 0) {
    return (
      <div className="flex h-full flex-col gap-6 px-8 py-8">
        <ChatsPageHeader />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-card px-8 text-center">
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
    <div className="flex h-full max-h-full min-h-0 w-full overflow-hidden">
      <div className="hidden md:contents">
        {conversationsStillLoading ? (
          <InboxFilterSidebarSkeleton />
        ) : (
          <InboxFilterSidebar
            open={filterSidebarOpen}
            onOpenChange={setFilterSidebarOpen}
            assignmentFilter={assignmentFilter}
            onAssignmentFilterChange={setAssignmentFilter}
            platformFilter={platformFilter}
            onPlatformFilterChange={setPlatformFilter}
            escalatedActive={escalatedActive}
            onEscalatedActiveChange={setEscalatedActive}
            bookingActive={bookingActive}
            onBookingActiveChange={setBookingActive}
            activeLeads={activeLeads}
            onToggleLead={handleToggleLead}
            activeTags={activeTags}
            onToggleTag={handleToggleTag}
            connectedPlatforms={connectedPlatforms}
            userTags={userTags}
            counts={filterCounts}
            canCreateTag={can(Permission.CHATS_TAG)}
            onCreateTagClick={handleCreateTagFromFilters}
          />
        )}

        <InboxConversationList
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          conversationSort={conversationSort}
          onConversationSortChange={setConversationSort}
          loading={conversationsStillLoading}
          filteredChats={filteredChats}
          pinnedChats={pinnedChats}
          unpinnedChats={unpinnedChats}
          totalConversationCount={chatItems.length}
          selectedConversationId={selectedConversationId}
          onSelectConversation={setSelectedConversationId}
          onTogglePin={togglePin}
          activeFilters={activeInboxFilters}
          onRemoveActiveFilter={handleRemoveInboxFilter}
        />
      </div>

      {!selectedConversationId ? (
        <div className="flex min-w-0 flex-1 md:hidden">
          <InboxConversationList
            fullWidth
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            conversationSort={conversationSort}
            onConversationSortChange={setConversationSort}
            loading={conversationsStillLoading}
            filteredChats={filteredChats}
            pinnedChats={pinnedChats}
            unpinnedChats={unpinnedChats}
            totalConversationCount={chatItems.length}
            selectedConversationId={selectedConversationId}
            onSelectConversation={setSelectedConversationId}
            onTogglePin={togglePin}
            activeFilters={activeInboxFilters}
            onRemoveActiveFilter={handleRemoveInboxFilter}
          />
        </div>
      ) : null}

      {/* Chat Window */}
      <div className={cn(inboxColumnClassName, 'min-h-0 min-w-0 flex-1 bg-background', !selectedConversationId && 'hidden md:flex')}>
          {selectedConversationId ? (
            <div className={cn(inboxChatGridClassName, 'min-w-0')}>
              {/* Chat Header */}
              <div className={cn(inboxColumnHeaderClassName, 'row-start-1 justify-between px-4')}>
                <div className="flex min-w-0 flex-1 items-center md:hidden">
                  <InboxMobileConversationSwitcher
                    open={mobileConversationSwitcherOpen}
                    onOpenChange={handleMobileConversationSwitcherOpenChange}
                    customerName={displayHeaderName ?? 'Conversations'}
                  >
                    <InboxConversationList
                      fullWidth
                      searchQuery={mobileConversationSearchQuery}
                      onSearchQueryChange={setMobileConversationSearchQuery}
                      conversationSort={conversationSort}
                      onConversationSortChange={setConversationSort}
                      loading={conversationsStillLoading}
                      filteredChats={mobileSwitcherChats}
                      pinnedChats={mobileSwitcherChats.filter((chat) => pinnedIds.has(chat.id as string))}
                      unpinnedChats={mobileSwitcherChats.filter((chat) => !pinnedIds.has(chat.id as string))}
                      totalConversationCount={chatItems.length}
                      selectedConversationId={selectedConversationId}
                      onSelectConversation={(conversationId) => {
                        setSelectedConversationId(conversationId);
                        setMobileConversationSearchQuery('');
                        setMobileConversationSwitcherOpen(false);
                      }}
                      onTogglePin={togglePin}
                      activeFilters={activeInboxFilters}
                      onRemoveActiveFilter={handleRemoveInboxFilter}
                    />
                  </InboxMobileConversationSwitcher>
                </div>
                <div className="hidden min-w-0 flex-1 items-center md:flex">
                  {displayHeaderName ? (
                    <div className="flex min-w-0 items-center gap-2">
                      <h2 className="m-0 truncate text-sm font-semibold text-foreground">
                        {displayHeaderName}
                      </h2>
                      {selectedConversation?.escalation && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 transition-all shadow-none dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-400">
                          <AlertCircle className="size-2.5 shrink-0 text-amber-500" />
                          <span>Escalated</span>
                        </span>
                      )}
                      {(() => {
                        const leadTemp = customerSidebarDetails?.leadTemperature;
                        if (!leadTemp) return null;
                        const style = getLeadTemperatureStyle(leadTemp);
                        const Icon = style.icon;
                        return (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium transition-all shadow-none shrink-0",
                              style.bg,
                              style.text
                            )}
                          >
                            <Icon className={cn("size-2.5 shrink-0", style.iconClass)} />
                            <span>{leadTemp}</span>
                          </span>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="h-6 max-w-[200px] flex-1 rounded-md bg-muted motion-safe:animate-pulse" aria-hidden />
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2.5">
                  {selectedConversation ? (
                    <div className="inline-flex h-8 w-fit shrink-0 items-center gap-1 px-0 shadow-none">
                      <label
                        htmlFor="mobile-ai-replies-switch"
                        className={cn(
                          'inline-flex cursor-pointer select-none items-center gap-1.5 text-xs font-normal text-muted-foreground md:hidden',
                          (assigneeSaving || !can(Permission.CHATS_ASSIGN)) && 'cursor-not-allowed',
                        )}
                      >
                        <Bot className="size-3.5 shrink-0" />
                        <span>AI</span>
                      </label>
                      <Switch
                        id="mobile-ai-replies-switch"
                        checked={selectedConversation.assignToAiAgent}
                        onCheckedChange={(checked) => void handleAiToggle(checked)}
                        disabled={assigneeSaving || !can(Permission.CHATS_ASSIGN)}
                        className="shrink-0 data-[state=checked]:bg-emerald-600 md:hidden"
                      />
                      <label
                        htmlFor="ai-replies-switch-chat"
                        className={cn(
                          'hidden cursor-pointer select-none items-center gap-1.5 text-xs font-normal text-muted-foreground md:inline-flex',
                          (assigneeSaving || !can(Permission.CHATS_ASSIGN)) && 'cursor-not-allowed',
                        )}
                      >
                        <Bot className="size-3.5 shrink-0" />
                        AI replies
                      </label>
                      <Switch
                        id="ai-replies-switch-chat"
                        checked={selectedConversation.assignToAiAgent}
                        onCheckedChange={(checked) => void handleAiToggle(checked)}
                        disabled={assigneeSaving || !can(Permission.CHATS_ASSIGN)}
                        className="hidden shrink-0 data-[state=checked]:bg-emerald-600 md:inline-flex"
                      />
                      <InboxMobileDetailsSheet
                        open={mobileDetailsOpen}
                        onOpenChange={setMobileDetailsOpen}
                        customerName={customerSidebarDetails?.name ?? displayHeaderName ?? 'Customer'}
                        platform={customerSidebarDetails?.platformLabel ?? selectedConversation.service}
                        phone={customerSidebarDetails?.phone}
                        email={customerSidebarDetails?.email}
                        status={selectedConversation.status.replaceAll('_', ' ')}
                        leadTemperature={customerSidebarDetails?.leadTemperature}
                        tags={customerSidebarDetails?.tags ?? selectedConversation.tags ?? []}
                      />
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="relative row-start-2 min-h-0 overflow-hidden">
                <Conversation className="absolute inset-0 min-h-0">
                  {threadDataLoading ? (
                    <ChatThreadLoading />
                  ) : (
                    <InboxThreadMessages
                      messages={visibleThreadMessages}
                      escalationMarkers={escalationMarkers}
                      emptyTitle="No messages in this conversation yet."
                      emptyDescription="When customers message you, the thread appears here."
                      onReact={handleReactToMessage}
                      onRemoveReaction={handleRemoveReactionFromMessage}
                    />
                  )}
                </Conversation>
              </div>

              {/* Chat Input — pinned to bottom of the chat column */}
              <div className="row-start-3 flex w-full min-w-0 flex-col gap-3 border-t border-border bg-background p-4">
                {mostRecentBooking ? (
                  <InboxBookingDetailsCard
                    booking={{
                      ...mostRecentBooking,
                      service: {
                        name: mostRecentBooking.service.name,
                        fields: mostRecentBooking.service.fields ?? [],
                      },
                    }}
                    variant="compact"
                    canManage={can(Permission.CALENDAR_MANAGE)}
                    agentId={agentId}
                    onOpenDetails={() => setSelectedBookingId(mostRecentBooking.bookingId)}
                  />
                ) : null}
                {selectedConversation?.escalation && (
                  <div className="relative flex max-h-28 items-start justify-between gap-4 overflow-y-auto rounded-lg border border-border bg-muted/40 p-3 text-xs shadow-none">
                    <ShineBorder shineColor={['#DC2626', '#EF4444', '#F87171']} />
                    <div className="flex items-start gap-2.5 min-w-0">
                      <AlertCircle className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="font-semibold text-foreground">Human Escalation</span>
                        <span className="text-muted-foreground truncate" title={selectedConversation.escalation.question}>
                          Question: {selectedConversation.escalation.question}
                        </span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="bg-foreground hover:bg-foreground/90 text-background font-medium shadow-none transition-colors cursor-pointer shrink-0"
                      onClick={() => setResolveConfirmOpen(true)}
                    >
                      Resolve
                    </Button>
                  </div>
                )}
                <div className={cn(
                  'flex flex-col w-full',
                  canReplyFromInbox && 'rounded-2xl border border-border bg-input/50 focus-within:border-ring overflow-hidden [&_[data-slot=input-group]]:bg-transparent [&_[data-slot=input-group]]:border-none [&_[data-slot=input-group]]:shadow-none [&_[data-slot=input-group]]:ring-0'
                )}>
                  <ConversationWindowBanner
                    lastCustomerMessageAt={selectedConversation?.lastCustomerMessageAt}
                    service={selectedConversation?.service ?? ''}
                    agentId={agentId}
                  />
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
            </div>
          ) : conversationsStillLoading ? (
            <InboxChatAreaSkeleton />
          ) : (
            <div className="flex h-full flex-1 flex-col items-center justify-center bg-background text-muted-foreground">
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', border: '1px solid var(--color-border)' }}>
                <MessageSquare size={28} />
              </div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--color-foreground)' }}>No chat selected</h3>
              <p style={{ margin: '8px 0 0', fontSize: '13px' }}>Select a conversation from the list to start replying</p>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Details */}
        {selectedConversationId && (
          <div
            className={cn(
              inboxColumnClassName,
              'hidden min-h-0 shrink-0 border-l border-border bg-background transition-[width] duration-200 ease-out md:flex',
              detailsPanelOpen ? 'w-[300px]' : 'w-12',
            )}
          >
            <div
              className={cn(
                inboxColumnHeaderClassName,
                'shrink-0',
                detailsPanelOpen ? 'justify-between px-3' : 'justify-center px-2',
              )}
            >
              {detailsPanelOpen ? (
                <>
                  <h2 className="m-0 text-sm font-semibold text-foreground">Details</h2>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setDetailsPanelOpen(false)}
                    className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label="Collapse details"
                  >
                    <PanelRightClose className="size-4" />
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setDetailsPanelOpen(true)}
                  className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
                  aria-label="Expand details"
                >
                  <PanelRightOpen className="size-4" />
                </Button>
              )}
            </div>

            {!detailsPanelOpen ? (
              <div className="flex flex-1 flex-col items-center gap-0.5 py-2">
                {selectedConversation?.escalation ? (
                  <DetailsPanelRailButton
                    label="Escalation"
                    icon={AlertCircle}
                    onClick={() => handleExpandDetailsSection('assignee')}
                  />
                ) : null}
                <DetailsPanelRailButton
                  label="Assignee"
                  icon={User}
                  onClick={() => handleExpandDetailsSection('assignee')}
                />
                <DetailsPanelRailButton
                  label="Customer details"
                  icon={Contact}
                  onClick={() => handleExpandDetailsSection('customer')}
                />
                <DetailsPanelRailButton
                  label="Tags"
                  icon={Tag}
                  onClick={() => handleExpandDetailsSection('tags')}
                />
                <DetailsPanelRailButton
                  label="Summary"
                  icon={FileText}
                  onClick={() => handleExpandDetailsSection('summary')}
                />
                <DetailsPanelRailButton
                  label="Action History"
                  icon={Clock}
                  onClick={() => handleExpandDetailsSection('log')}
                />
                {mostRecentBooking ? (
                  <DetailsPanelRailButton
                    label="Booked"
                    marker
                    onClick={() => setDetailsPanelOpen(true)}
                  />
                ) : null}
              </div>
            ) : (
            <div className={cn(inboxColumnScrollClassName, 'no-scrollbar')}>
              {detailsPanelLoading ? (
                <DetailsPanelSkeleton />
              ) : (
                selectedConversation && (
                  <div className="flex min-h-0 flex-col pb-4">
                    <div className="px-4 pb-3 pt-4">
                      {selectedConversation.escalation && (
                        <div className="relative mb-4 overflow-hidden rounded-lg border border-border bg-muted/40 p-3 text-xs space-y-2.5 shadow-none">
                          <ShineBorder shineColor={['#DC2626', '#EF4444', '#F87171']} />
                          <div className="flex items-center gap-2">
                            <AlertCircle className="size-4 text-muted-foreground shrink-0" />
                            <span className="text-base font-semibold text-foreground">Human Escalation</span>
                          </div>
                          <div>
                            <span className="font-medium text-muted-foreground">Unsure Question:</span>
                            <p className="mt-0.5 text-sm text-foreground leading-relaxed break-words">
                              {selectedConversation.escalation.question}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium text-muted-foreground">AI Context:</span>
                            <p className="mt-0.5 text-sm text-foreground leading-relaxed break-words">
                              {selectedConversation.escalation.context}
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            className="w-full bg-foreground hover:bg-foreground/90 text-background font-medium shadow-none transition-colors cursor-pointer"
                            onClick={() => setResolveConfirmOpen(true)}
                          >
                            Resolve
                          </Button>
                        </div>
                      )}
                      <div className="flex flex-col gap-3">
                        {can(Permission.CALENDAR_MANAGE) ? (
                          <Button
                            type="button"
                            size="sm"
                            className="h-10 w-full gap-2 px-4"
                            onClick={() => setCreateBookingOpen(true)}
                          >
                            <Plus className="size-3.5" />
                            Create booking
                          </Button>
                        ) : null}
                        <div>
                          <div className="mb-1.5 flex items-center justify-between">
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
                        <div className="flex flex-col gap-2.5 text-sm">
                          <div className="flex items-center justify-between gap-4">
                            <span className="shrink-0 text-muted-foreground">Lead Status</span>
                            {selectedConversation?.customerId ? (
                              <Select
                                value={customerSidebarDetails?.leadTemperature ?? 'None'}
                                onValueChange={(value) => void handleLeadStatusChange(value)}
                                disabled={leadStatusSaving || customerSidebarDetails === undefined}
                              >
                                <SelectTrigger className="!h-10 py-1.5 border-border bg-background text-xs font-medium shadow-none">
                                  <SelectValue asChild>
                                    <span className="flex items-center gap-1.5">
                                      {customerSidebarDetails?.leadTemperature ? (
                                        (() => {
                                          const style = getLeadTemperatureStyle(
                                            customerSidebarDetails.leadTemperature,
                                          );
                                          const Icon = style.icon;
                                          return (
                                            <Icon
                                              className={cn('size-3 shrink-0', style.iconClass)}
                                            />
                                          );
                                        })()
                                      ) : null}
                                      <span>
                                        {customerSidebarDetails?.leadTemperature ?? 'None'}
                                      </span>
                                    </span>
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent align="end">
                                  <SelectItem value="None">None</SelectItem>
                                  {(['Hot', 'Warm', 'Cold'] as const).map((status) => {
                                    const style = getLeadTemperatureStyle(status);
                                    const Icon = style.icon;
                                    return (
                                      <SelectItem key={status} value={status}>
                                        <span className="flex items-center gap-1.5">
                                          <Icon className={cn('size-3 shrink-0', style.iconClass)} />
                                          {status}
                                        </span>
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="min-w-0 truncate text-right font-medium text-foreground">
                                —
                              </span>
                            )}
                          </div>
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
                          ) : isEditingCustomerDetails ? (
                            <div className="flex flex-col gap-3 text-sm">
                              <div className="flex flex-col gap-1">
                                <label className="text-[11px] font-medium text-muted-foreground">Name</label>
                                <input
                                  type="text"
                                  value={editCustomerName}
                                  onChange={(e) => setEditCustomerName(e.target.value)}
                                  className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                  placeholder="Name"
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[11px] font-medium text-muted-foreground">Phone number</label>
                                <input
                                  type="text"
                                  value={editCustomerPhone}
                                  onChange={(e) => setEditCustomerPhone(e.target.value)}
                                  className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                  placeholder="Phone number"
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[11px] font-medium text-muted-foreground">Email</label>
                                <input
                                  type="email"
                                  value={editCustomerEmail}
                                  onChange={(e) => setEditCustomerEmail(e.target.value)}
                                  className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                  placeholder="Email"
                                />
                              </div>
                              <div className="flex gap-2 justify-end pt-1">
                                <button
                                  type="button"
                                  onClick={() => setIsEditingCustomerDetails(false)}
                                  className="rounded px-2.5 py-1 text-xs font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground cursor-pointer"
                                  disabled={isSavingCustomerDetails}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={handleSaveCustomerDetails}
                                  className="rounded px-2.5 py-1 text-xs font-medium bg-black hover:bg-black/90 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 flex items-center gap-1 cursor-pointer disabled:opacity-50 border border-zinc-900 dark:border-zinc-100"
                                  disabled={isSavingCustomerDetails}
                                >
                                  <Check className="size-3 shrink-0" />
                                  {isSavingCustomerDetails ? 'Saving…' : 'Save'}
                                </button>
                              </div>
                            </div>
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
                                <span className="inline-flex min-w-0 items-center justify-end gap-1.5 truncate text-right font-medium text-foreground">
                                  {selectedConversation?.service === 'whatsapp' ||
                                  selectedConversation?.service === 'instagram' ||
                                  selectedConversation?.service === 'messenger' ||
                                  selectedConversation?.service === 'web' ||
                                  selectedConversation?.service === 'avatar' ? (
                                    <PlatformMenuIcon
                                      platform={selectedConversation.service}
                                      size={14}
                                    />
                                  ) : null}
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
                              <div className="flex justify-between gap-4">
                                <span className="shrink-0 text-muted-foreground">Email</span>
                                <span className="min-w-0 truncate text-right font-medium text-foreground">
                                  {customerSidebarDetails?.email?.trim()
                                    ? customerSidebarDetails.email
                                    : '—'}
                                </span>
                              </div>
                              <div className="flex justify-end pt-1">
                                <button
                                  type="button"
                                  onClick={handleStartEditCustomerDetails}
                                  className="rounded px-2.5 py-1 text-xs font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground cursor-pointer"
                                >
                                  Edit details
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>

                    <Separator />

                    <InboxCustomerBookingsSection
                      bookings={customerBookings ?? []}
                      loading={customerBookings === undefined}
                      open={bookingsOpen}
                      onOpenChange={setBookingsOpen}
                      onSelect={(booking) => setSelectedBookingId(booking.bookingId)}
                    />

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
                          Tags ({((selectedConversation.tags ?? []).filter((t: string) => !isLeadTemperatureTag(t))).length + (selectedConversation.service === 'avatar' ? 1 : 0)})
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
                          {selectedConversation.service === 'avatar' ? (
                            <div className="flex flex-wrap gap-1.5 py-1.5">
                              <AvatarConversationTag />
                            </div>
                          ) : null}
                          {((selectedConversation.tags ?? []).filter((t: string) => !isLeadTemperatureTag(t))).length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 py-1.5">
                              {((selectedConversation.tags ?? []).filter((t: string) => !isLeadTemperatureTag(t))).map((tag: any) => {
                                const colors = getTagColorClass();
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
                          ) : selectedConversation.service !== 'avatar' ? (
                            <p className="m-0 py-2 text-xs text-muted-foreground">
                              No tags yet.
                            </p>
                          ) : null}
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
                                                  <span className={cn("size-1.5 rounded-full shrink-0", getTagColorClass().dot)} />
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
                                                  <span className={cn("size-1.5 rounded-full shrink-0", getTagColorClass().dot)} />
                                                  <span>{entry.title}</span>
                                                </div>
                                                {isSelected && <Check className="size-3 text-foreground shrink-0" />}
                                              </CommandItem>
                                            );
                                          })}
                                        </CommandGroup>
                                      )}
                                    </CommandList>
                                    
                                    {tagSearchInput.trim() &&
                                       !isReservedTemperatureTag(tagSearchInput) &&
                                       !allExistingTags.some(t => t.toLowerCase() === tagSearchInput.trim().toLowerCase()) && (
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

                    <InboxActionHistory
                      open={logSectionOpen}
                      logs={conversationLogs?.map((log) => ({
                        id: log._id,
                        action: log.action,
                        metadata: log.metadata,
                        performedAt: log.performedAt,
                        actorType: log.actorType,
                        actorName: log.actorName,
                      }))}
                      onOpenChange={setLogSectionOpen}
                      onFocusEscalation={focusEscalation}
                    />

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
                          Summary
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
                          <div className="pl-4 border-l border-violet-200 dark:border-violet-800 space-y-2.5">
                            {generatedSummary ? (
                              <p className="text-sm text-foreground/90 font-normal leading-relaxed whitespace-pre-wrap block w-full">
                                {generatedSummary}
                              </p>
                            ) : isGeneratingSummary ? (
                              <Shimmer
                                duration={1.5}
                                spread={3}
                                className="text-sm font-normal italic"
                                aria-busy
                                aria-live="polite"
                              >
                                Generating summary…
                              </Shimmer>
                            ) : summaryError ? (
                              <div className="space-y-2">
                                <p className="text-sm text-destructive">{summaryError}</p>
                                <button
                                  type="button"
                                  onClick={() => void handleGenerateSummary()}
                                  disabled={isGeneratingSummary}
                                  className="text-sm font-medium text-blue-600 hover:text-blue-500 hover:underline cursor-pointer disabled:opacity-50 dark:text-blue-400 dark:hover:text-blue-300"
                                >
                                  Generate AI summary
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => void handleGenerateSummary()}
                                disabled={isGeneratingSummary}
                                className="text-sm font-medium text-blue-600 hover:text-blue-500 hover:underline cursor-pointer disabled:opacity-50 dark:text-blue-400 dark:hover:text-blue-300"
                              >
                                Generate AI summary
                              </button>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>

                  </div>
                )
              )}
            </div>
            )}
          </div>
        )}

      {selectedConversationId ? (
        <CreateCustomerBookingDialog
          open={createBookingOpen}
          onOpenChange={setCreateBookingOpen}
          conversationId={selectedConversationId}
        />
      ) : null}
      <InboxCustomerBookingDetailsDialog
        booking={selectedBooking}
        open={selectedBookingId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedBookingId(null);
        }}
        canManage={can(Permission.CALENDAR_MANAGE)}
        agentId={agentId}
      />

      <Dialog open={resolveConfirmOpen} onOpenChange={setResolveConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Resolve escalation?</DialogTitle>
            <DialogDescription>
              This will clear the human escalation and resume AI replies for this conversation.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              disabled={resolveBusy}
              onClick={() => setResolveConfirmOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={resolveBusy}
              className="bg-foreground hover:bg-foreground/90 text-background font-medium shadow-none"
              onClick={() => void handleResolveEscalation()}
            >
              {resolveBusy ? <Spinner className="size-4" /> : 'Resolve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ChatsPageHeader({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-start justify-between', className)}>
      <div>
        <h1 className="m-0 font-title text-3xl font-normal tracking-tight text-foreground">
          Inbox
        </h1>
      </div>
    </div>
  );
}
