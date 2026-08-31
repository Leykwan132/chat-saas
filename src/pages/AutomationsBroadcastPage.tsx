import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router';
import { useMutation, useQuery } from 'convex/react';
import {
  ArrowLeft,
  Loader2,
  Megaphone,
  Plus,
  Check,
  Search,
  X,
  ChevronRight,
  ChevronLeft,
  FileText,
  Users,
  Send,
  User,
  CalendarClock,
  Globe,
  ScanFace,
} from 'lucide-react';
import { SiInstagram, SiMessenger, SiWhatsapp } from 'react-icons/si';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { api } from '../../convex/_generated/api';
import type { Doc, Id } from '../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { WhatsAppTemplatePreview } from '@/components/WhatsAppTemplatePreview';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { startOfDay } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import {
  MINUTES_PER_DAY,
  SCHEDULE_TIME_OPTIONS,
} from '@/lib/scheduleUtils';

import { getWhatsAppRateForCategory } from '@/lib/whatsappRates';
import {
  getLeadTemperatureStyle,
  LEAD_TEMPERATURE_TAGS,
  type LeadTemperature,
} from '@/lib/leadTemperature';
import { BroadcastMessagingLimitCard } from '@/components/broadcast/BroadcastMessagingLimitCard';

const DEFAULT_TEMPLATE_LANGUAGE = 'en_US';

const MAX_BATCH = 50;

type BroadcastScheduleMode = 'now' | 'later';

const BROADCAST_TIME_OPTIONS = SCHEDULE_TIME_OPTIONS.filter(
  (option) => Number(option.value) < MINUTES_PER_DAY,
);

function getDefaultScheduleParts(): { date: Date; timeMinutes: number } {
  const target = new Date(Date.now() + 60 * 60 * 1000);
  const date = startOfDay(target);
  let timeMinutes = target.getHours() * 60 + target.getMinutes();
  timeMinutes = Math.ceil(timeMinutes / 15) * 15;
  if (timeMinutes >= MINUTES_PER_DAY) {
    timeMinutes = MINUTES_PER_DAY - 15;
  }
  return { date, timeMinutes };
}

function combineScheduleDateTime(date: Date, timeMinutes: number): number {
  const result = new Date(date);
  const hours = Math.floor(timeMinutes / 60);
  const mins = timeMinutes % 60;
  result.setHours(hours, mins, 0, 0);
  return result.getTime();
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function timeOptionsForDate(date: Date | undefined) {
  if (!date) return BROADCAST_TIME_OPTIONS;
  const now = new Date();
  if (!isSameCalendarDay(date, now)) return BROADCAST_TIME_OPTIONS;
  const minMinutes = now.getHours() * 60 + now.getMinutes() + 1;
  return BROADCAST_TIME_OPTIONS.filter((option) => Number(option.value) >= minMinutes);
}

function formatScheduleLabel(timestampMs: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestampMs));
}

type ChannelDoc = Doc<'channels'>;

type TemplateRow = {
  name: string;
  language: string;
  status: string;
  category: string;
  components?: Array<{ type: string; text?: string }>;
};

type BroadcastCustomerRow = {
  customerId: Id<'customers'>;
  name?: string;
  phone: string;
  recipientLabel: string;
  tags: string[];
  leadTemperature?: LeadTemperature;
  service: Doc<'customers'>['service'];
  email?: string;
  assignedUserId?: string;
  assignToAiAgent?: boolean;
  assignedAgentName?: string;
};

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

const sourceBadgeInfo = {
  WhatsApp: { icon: SiWhatsapp, colorClass: 'text-[#25D366]' },
  Instagram: { icon: SiInstagram, colorClass: 'text-[#E4405F]' },
  Messenger: { icon: SiMessenger, colorClass: 'text-[#0866FF]' },
  Web: { icon: Globe, colorClass: 'text-foreground' },
  Avatar: { icon: ScanFace, colorClass: 'text-muted-foreground' },
  Manual: { icon: User, colorClass: 'text-zinc-500 dark:text-zinc-400' },
} as const;

function customerSourceLabel(
  service: BroadcastCustomerRow['service'],
): keyof typeof sourceBadgeInfo {
  switch (service) {
    case 'whatsapp':
      return 'WhatsApp';
    case 'instagram':
      return 'Instagram';
    case 'messenger':
      return 'Messenger';
    case 'web':
      return 'Web';
    case 'avatar':
      return 'Avatar';
    default:
      return 'Manual';
  }
}

function channelLabel(ch: ChannelDoc): string {
  return (
    ch.displayPhoneNumber ??
    ch.phoneNumberId ??
    ch.wabaId ??
    'WhatsApp'
  );
}

function TemplateListSkeleton() {
  return (
    <div className="flex min-h-0 max-h-[min(28rem,calc(100vh-22rem))] flex-1 flex-col gap-4 overflow-hidden lg:max-h-none">
      <div className="flex shrink-0 flex-col gap-2 px-1">
        <Skeleton className="h-9.5 w-full rounded-lg" />
        <Skeleton className="h-3 w-36" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden px-1 py-0.5">
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-4 rounded-xl border border-border p-4"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-3.5 w-[55%] max-w-48" />
              <div className="flex gap-1.5">
                <Skeleton className="h-4 w-10 rounded-full" />
                <Skeleton className="h-4 w-16 rounded-full" />
              </div>
            </div>
            <Skeleton className="h-5 w-14 shrink-0 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

function RecipientListSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="bg-muted/40">
            <th className="w-10 px-3.5 py-3">
              <Skeleton className="size-4 rounded" />
            </th>
            <th className="px-3 py-3">
              <Skeleton className="h-3 w-24" />
            </th>
            <th className="px-3 py-3">
              <Skeleton className="h-3 w-20" />
            </th>
            <th className="px-3 py-3">
              <Skeleton className="h-3 w-24" />
            </th>
            <th className="px-3 py-3">
              <Skeleton className="h-3 w-16" />
            </th>
            <th className="px-3 py-3">
              <Skeleton className="h-3 w-12" />
            </th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 6 }, (_, i) => (
            <tr key={i} className="border-t border-border/80">
              <td className="px-3.5 py-2.5">
                <Skeleton className="size-4 rounded" />
              </td>
              <td className="px-3 py-2.5">
                <Skeleton className="h-3.5 w-32" />
              </td>
              <td className="px-3 py-2.5">
                <Skeleton className="h-3.5 w-24" />
              </td>
              <td className="px-3 py-2.5">
                <Skeleton className="h-3 w-28" />
              </td>
              <td className="px-3 py-2.5">
                <Skeleton className="h-5 w-20 rounded-full" />
              </td>
              <td className="px-3 py-2.5">
                <div className="flex gap-1">
                  <Skeleton className="h-4 w-10 rounded-full" />
                  <Skeleton className="h-4 w-14 rounded-full" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AutomationsBroadcastPage() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const channels = useQuery(api.channels.listForCurrentOrg, {});
  const createTemplate = useMutation(api.whatsappTemplates.createLocalTemplate);
  const scheduleTemplateBatch = useMutation(api.whatsappBroadcast.scheduleTemplateBatch);

  const whatsappReady = useMemo(() => {
    if (!channels) return [];
    return channels.filter(
      (c: any) =>
        c.service === 'whatsapp' &&
        c.status === 'connected' &&
        Boolean(c.wabaId?.trim()) &&
        Boolean(c.phoneNumberId?.trim()),
    );
  }, [channels]);

  // Wizard and filters state
  const [step, setStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [templateSearchQuery, setTemplateSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('ALL');
  const [selectedLeadTemperature, setSelectedLeadTemperature] = useState<
    'ALL' | LeadTemperature
  >('ALL');
  const [balanceChecked, setBalanceChecked] = useState(false);
  const [insufficientBalanceUnderstood, setInsufficientBalanceUnderstood] = useState(false);
  const [showChecklistError, setShowChecklistError] = useState(false);
  const [showRecipientError, setShowRecipientError] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<BroadcastScheduleMode>('now');
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(
    () => getDefaultScheduleParts().date,
  );
  const [scheduledTimeMinutes, setScheduledTimeMinutes] = useState(() =>
    String(getDefaultScheduleParts().timeMinutes),
  );

  const [channelId, setChannelId] = useState<Id<'channels'> | ''>('');
  const [selectedTemplateKey, setTemplateKey] = useState(''); // "name\tlanguage"
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());
  const [sendBusy, setSendBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [tplName, setTplName] = useState('');
  const [tplLang, setTplLang] = useState(DEFAULT_TEMPLATE_LANGUAGE);
  const [tplCategory, setTplCategory] = useState('UTILITY');
  const [tplBody, setTplBody] = useState('');

  useEffect(() => {
    if (!channelId && whatsappReady.length > 0) {
      setChannelId(whatsappReady[0]._id);
    }
  }, [channelId, whatsappReady]);

  const customers = useQuery(
    api.customers.listForAgentBroadcast,
    agentId ? { agentId: agentId as Id<'agents'> } : 'skip',
  );
  const teamUsers = useQuery(api.users.getUsers, {});


  const templatesQuery = useQuery(
    api.whatsappTemplateQueries.listApprovedForChannel,
    channelId ? { channelId: channelId as Id<'channels'> } : 'skip',
  );
  const templates: TemplateRow[] = useMemo(() => templatesQuery ?? [], [templatesQuery]);
  const templatesLoading = Boolean(channelId) && templatesQuery === undefined;
  const templateKey = templates.some(
    (template) => `${template.name}\t${template.language}` === selectedTemplateKey,
  )
    ? selectedTemplateKey
    : templates[0]
      ? `${templates[0].name}\t${templates[0].language}`
      : '';

  useEffect(() => {
    setShowChecklistError(false);
  }, [step]);

  const selectedTemplate = useMemo(() => {
    if (!templateKey) return null;
    const [name, language] = templateKey.split('\t');
    if (!name || !language) return null;
    return templates.find((t) => t.name === name && t.language === language) ?? null;
  }, [templateKey, templates]);

  // Extract unique customer tags for filtering
  const allTags = useMemo(() => {
    if (!customers) return [];
    const tags = new Set<string>();
    customers.forEach((c) => {
      c.tags.forEach((t) => tags.add(t));
    });
    return Array.from(tags).sort();
  }, [customers]);

  // Filter customers by tag and search query (matches Customers page search)
  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    const q = searchQuery.trim().toLowerCase();
    return customers.filter((c) => {
      if (
        selectedLeadTemperature !== 'ALL' &&
        c.leadTemperature !== selectedLeadTemperature
      ) {
        return false;
      }

      if (selectedTag !== 'ALL' && !c.tags.includes(selectedTag)) {
        return false;
      }

      if (!q) return true;

      const haystack = [c.name, c.email, c.recipientLabel]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [customers, searchQuery, selectedLeadTemperature, selectedTag]);

  const selectedCount = selectedCustomerIds.size;

  const selectedCustomerIdsForSend = useMemo(() => {
    return Array.from(selectedCustomerIds) as Id<'customers'>[];
  }, [selectedCustomerIds]);
  const currentMessageRate = useMemo(() => {
    return getWhatsAppRateForCategory(selectedTemplate?.category);
  }, [selectedTemplate]);
  const estimatedCostRm = selectedCount * currentMessageRate;
  const overLimit = selectedCount > MAX_BATCH;

  const availableTimeOptions = useMemo(
    () => timeOptionsForDate(scheduledDate),
    [scheduledDate],
  );

  const scheduledAtMs = useMemo(() => {
    if (scheduleMode !== 'later' || !scheduledDate) return null;
    const minutes = Number(scheduledTimeMinutes);
    if (Number.isNaN(minutes)) return null;
    return combineScheduleDateTime(scheduledDate, minutes);
  }, [scheduleMode, scheduledDate, scheduledTimeMinutes]);

  const sendNowPreviewLabel = useMemo(() => {
    return formatScheduleLabel(Date.now());
  }, [step]);

  const scheduleSummaryLabel = useMemo(() => {
    if (scheduleMode === 'now') return 'Send now';
    if (scheduledAtMs === null) return '—';
    return formatScheduleLabel(scheduledAtMs);
  }, [scheduleMode, scheduledAtMs]);

  const canProceedFromSchedule =
    scheduleMode === 'now' ||
    (scheduledAtMs !== null && scheduledAtMs - Date.now() >= 60_000);

  const toggleCustomer = (customerId: Id<'customers'>) => {
    setSelectedCustomerIds((prev) => {
      const next = new Set(prev);
      if (next.has(customerId)) next.delete(customerId);
      else next.add(customerId);
      return next;
    });
  };

  const isAllFilteredSelected = useMemo(() => {
    if (filteredCustomers.length === 0) return false;
    return filteredCustomers.every((c) =>
      selectedCustomerIds.has(c.customerId),
    );
  }, [filteredCustomers, selectedCustomerIds]);

  const isSomeFilteredSelected = useMemo(() => {
    return filteredCustomers.some((c) =>
      selectedCustomerIds.has(c.customerId),
    );
  }, [filteredCustomers, selectedCustomerIds]);

  const toggleAllFiltered = () => {
    if (filteredCustomers.length === 0) return;
    if (isAllFilteredSelected) {
      setSelectedCustomerIds((prev) => {
        const next = new Set(prev);
        filteredCustomers.forEach((c) => next.delete(c.customerId));
        return next;
      });
    } else {
      setSelectedCustomerIds((prev) => {
        const next = new Set(prev);
        filteredCustomers.forEach((c) => next.add(c.customerId));
        return next;
      });
    }
  };

  const handleCreateTemplate = async () => {
    if (!channelId) return;
    const n = tplName.trim();
    const b = tplBody.trim();
    if (!n || !b) {
      toast.error('Template name and body are required.');
      return;
    }
    setCreateBusy(true);
    try {
      await createTemplate({
        channelId: channelId as Id<'channels'>,
        name: n,
        language: tplLang.trim() || DEFAULT_TEMPLATE_LANGUAGE,
        purpose: tplCategory === 'MARKETING' ? 'broadcasting' : 'follow_up',
        components: [{ type: 'BODY', text: b }],
      });
      toast.success('Template submitted to Meta for review.');
      setCreateOpen(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
    } finally {
      setCreateBusy(false);
    }
  };

  useEffect(() => {
    if (selectedCount > 0) {
      setShowRecipientError(false);
    }
  }, [selectedCount]);

  useEffect(() => {
    if (step !== 2) {
      setShowRecipientError(false);
    }
  }, [step]);

  const handleRecipientsNext = () => {
    if (selectedCount === 0) {
      setShowRecipientError(true);
      return;
    }
    if (overLimit) {
      return;
    }
    setShowRecipientError(false);
    setStep(3);
  };

  const handleSend = async () => {
    if (!channelId || !selectedTemplate || !agentId) {
      toast.error('Select an account and template.');
      return;
    }
    if (selectedCount === 0) {
      toast.error('Select at least one recipient.');
      return;
    }
    if (overLimit) {
      toast.error(`Select at most ${MAX_BATCH} recipients per send.`);
      return;
    }
    if (!balanceChecked || !insufficientBalanceUnderstood) {
      setShowChecklistError(true);
      return;
    }
    setSendBusy(true);
    try {
      if (scheduleMode === 'later') {
        if (scheduledAtMs === null) {
          toast.error('Choose a valid date and time.');
          setSendBusy(false);
          return;
        }
        await scheduleTemplateBatch({
          agentId: agentId as Id<'agents'>,
          channelId: channelId as Id<'channels'>,
          templateName: selectedTemplate.name,
          templateLanguage: selectedTemplate.language,
          customerIds: selectedCustomerIdsForSend,
          scheduledAt: scheduledAtMs,
        });
        toast.success(`Broadcast scheduled for ${formatScheduleLabel(scheduledAtMs)}.`);
        navigate(`/dashboard/${agentId}/broadcast`);
        return;
      }

      // "Send now" case is also scheduled immediately in the background
      const nowMs = Date.now();
      await scheduleTemplateBatch({
        agentId: agentId as Id<'agents'>,
        channelId: channelId as Id<'channels'>,
        templateName: selectedTemplate.name,
        templateLanguage: selectedTemplate.language,
        customerIds: selectedCustomerIdsForSend,
        scheduledAt: nowMs,
      });
      toast.success(`Broadcast send started in the background.`);
      navigate(`/dashboard/${agentId}/broadcast`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
    } finally {
      setSendBusy(false);
    }
  };

  const approvedTemplates = useMemo(() => {
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(templateSearchQuery.toLowerCase())
    );
  }, [templates, templateSearchQuery]);

  const underReviewTemplates: TemplateRow[] = [];

  if (channels === undefined) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (whatsappReady.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <Button variant="ghost" size="sm" className="-ml-2 w-fit gap-1 text-muted-foreground hover:text-foreground" asChild>
          <Link to={`/dashboard/${agentId}/broadcast`}>
            <ArrowLeft className="size-4" />
            Back to Broadcast
          </Link>
        </Button>
        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center animate-fade-in">
          <Megaphone className="mx-auto size-10 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold text-foreground">
            Connect WhatsApp first
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Broadcast uses your WhatsApp Business account. Connect a WhatsApp
            channel with a phone number and WABA, then return here.
          </p>
          <Button className="mt-6" asChild>
            <Link to={`/dashboard/${agentId}/channels`}>Open Channels</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-120px)] max-h-[calc(100vh-120px)] w-full max-w-7xl flex-col gap-6 overflow-hidden animate-fade-in px-2 sm:px-4 md:px-6">
      <div className="shrink-0">
        <Button variant="ghost" size="sm" className="-ml-2 gap-1 text-muted-foreground hover:text-foreground" asChild>
          <Link to={`/dashboard/${agentId}/broadcast`}>
            <ArrowLeft className="size-4" />
            Back to Broadcast
          </Link>
        </Button>
      </div>

      {/* Grid Layout: Stages Checklist on Left (1/4 width), Flow on Right (3/4 width) */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-8 overflow-hidden md:grid-cols-4 md:items-stretch">
        
        {/* LEFT COLUMN: STAGES CHECKLIST (md:col-span-1 - Borderless & Equal Height) */}
        <div className="md:col-span-1 rounded-2xl border-0 bg-gradient-to-b from-zinc-100/80 via-zinc-50/50 to-zinc-100/30 dark:from-zinc-900/20 dark:to-zinc-950/5 p-6 overflow-hidden relative flex flex-col justify-start min-h-[360px] animate-fade-in shadow-none">
          
          <div className="relative z-10 mb-8 border-b border-border/60 pb-5">
            <h2 className="text-sm font-semibold text-foreground m-0">
              Broadcast setup
            </h2>
          </div>

          <div className="relative z-10 flex flex-col gap-8 pl-1">
            {/* Vertical timeline connecting line */}
            <div className="absolute left-[14px] top-3.5 bottom-3.5 w-0.5 bg-border/80 dark:bg-border/30 -z-10" />

            {/* Stage 1 Check item */}
            <div className="flex items-center gap-4">
              <div className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold transition-all ${
                step > 1
                  ? 'bg-emerald-600 border border-emerald-600 text-white'
                  : step === 1
                  ? 'bg-foreground text-background border border-foreground shadow-sm'
                  : 'border border-muted bg-background text-muted-foreground'
              }`}>
                {step > 1 ? (
                  <Check className="size-3" strokeWidth={4.5} />
                ) : (
                  '1'
                )}
              </div>
              <div className="flex items-center gap-2">
                <FileText className={`size-4 shrink-0 ${step === 1 ? 'text-primary' : step > 1 ? 'text-foreground' : 'text-muted-foreground'}`} />
                <h3 className={`text-base font-semibold leading-none ${step === 1 ? 'text-primary' : step > 1 ? 'text-foreground' : 'text-muted-foreground'}`}>
                  Select template
                </h3>
              </div>
            </div>

            {/* Stage 2 Check item */}
            <div className="flex items-center gap-4">
              <div className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold transition-all ${
                step > 2
                  ? 'bg-emerald-600 border border-emerald-600 text-white'
                  : step === 2
                  ? 'bg-foreground text-background border border-foreground shadow-sm scale-105'
                  : 'border border-muted bg-background text-muted-foreground'
              }`}>
                {step > 2 ? (
                  <Check className="size-3" strokeWidth={4.5} />
                ) : (
                  '2'
                )}
              </div>
              <div className="flex items-center gap-2">
                <Users className={`size-4 shrink-0 ${step === 2 ? 'text-primary' : step > 2 ? 'text-foreground' : 'text-muted-foreground'}`} />
                <h3 className={`text-base font-semibold leading-none ${step === 2 ? 'text-primary' : step > 2 ? 'text-foreground' : 'text-muted-foreground'}`}>
                  Recipients
                </h3>
                {selectedCount > 0 && (
                  <Badge variant="secondary" className="text-[8px] font-bold py-0 px-1 bg-primary/10 text-primary select-none">
                    {selectedCount} selected
                  </Badge>
                )}
              </div>
            </div>

            {/* Stage 3 Check item */}
            <div className="flex items-center gap-4">
              <div className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold transition-all ${
                step > 3
                  ? 'bg-emerald-600 border border-emerald-600 text-white'
                  : step === 3
                  ? 'bg-foreground text-background border border-foreground shadow-sm scale-105'
                  : 'border border-muted bg-background text-muted-foreground'
              }`}>
                {step > 3 ? (
                  <Check className="size-3" strokeWidth={4.5} />
                ) : (
                  '3'
                )}
              </div>
              <div className="flex items-center gap-2">
                <CalendarClock className={`size-4 shrink-0 ${step === 3 ? 'text-primary' : step > 3 ? 'text-foreground' : 'text-muted-foreground'}`} />
                <h3 className={`text-base font-semibold leading-none ${step === 3 ? 'text-primary' : step > 3 ? 'text-foreground' : 'text-muted-foreground'}`}>
                  Schedule
                </h3>
              </div>
            </div>

            {/* Stage 4 Check item */}
            <div className="flex items-center gap-4">
              <div className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold transition-all ${
                step === 4
                  ? 'bg-foreground text-background border border-foreground shadow-sm scale-105'
                  : 'border border-muted bg-background text-muted-foreground'
              }`}>
                4
              </div>
              <div className="flex items-center gap-2">
                <Send className={`size-4 shrink-0 ${step === 4 ? 'text-primary' : 'text-muted-foreground'}`} />
                <h3 className={`text-base font-semibold leading-none ${step === 4 ? 'text-primary' : 'text-muted-foreground'}`}>
                  Review & send
                </h3>
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-6">
            <BroadcastMessagingLimitCard channelId={channelId} />
          </div>
        </div>

        {/* RIGHT COLUMN: ACTIVE FLOW (md:col-span-3) */}
        <div className="md:col-span-3 flex min-h-0 flex-1 flex-col gap-6 bg-background rounded-2xl border border-border p-6 shadow-2xs">
          
          {/* Header of Active Step */}
          <div className="mb-2 shrink-0 border-b border-border/80 pb-4">
            <h1 className="m-0 text-3xl font-semibold tracking-tight text-foreground leading-tight">
              {step === 1
                ? 'Select template'
                : step === 2
                  ? 'Recipients'
                  : step === 3
                    ? 'Schedule'
                    : 'Review & send'}
            </h1>
          </div>

          {/* STEP 1 FORM */}
          {step === 1 && (
            <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden animate-fade-in justify-between">
              
              {/* 2-Column layout for template list & preview */}
              <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-hidden lg:grid-cols-12 lg:items-stretch">
                
                {/* Left Column: Template List (lg:col-span-7) */}
                <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden lg:col-span-7">
                  <div className="flex shrink-0 items-center justify-between gap-3">
                    <h3 className="m-0 text-xs font-semibold text-muted-foreground">
                      Templates
                    </h3>
                    {!templatesLoading && templates.length > 0 && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={!channelId}
                        onClick={() => setCreateOpen(true)}
                        className="h-8 text-xs px-2.5 gap-1.5"
                      >
                        <Plus className="size-3.5" />
                        Create Template
                      </Button>
                    )}
                  </div>

                  {/* Template search bar at the top */}
                  {!templatesLoading && templates.length > 0 && (
                    <div className="flex shrink-0 flex-col gap-2 px-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Search templates..."
                          value={templateSearchQuery}
                          onChange={(e) => setTemplateSearchQuery(e.target.value)}
                          className="pl-9 h-9.5 text-xs bg-background border border-neutral-300 dark:border-neutral-700"
                        />
                        {templateSearchQuery && (
                          <button
                            onClick={() => setTemplateSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            <X className="size-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground/60 font-medium px-0.5">
                        Showing {approvedTemplates.length + underReviewTemplates.length} of {templates.length} templates
                      </div>
                    </div>
                  )}

                  {/* Templates List */}
                  {templatesLoading ? (
                    <TemplateListSkeleton />
                  ) : templates.length === 0 ? (
                    <Empty className="border border-dashed bg-muted/10 py-10 rounded-xl w-full">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <FileText className="size-5" />
                        </EmptyMedia>
                        <EmptyTitle className="text-sm font-semibold">No templates found</EmptyTitle>
                        <EmptyDescription className="text-xs">
                          Create a template to get started.
                        </EmptyDescription>
                      </EmptyHeader>
                      <EmptyContent>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setCreateOpen(true)}
                          className="h-8.5 text-xs px-3 gap-1.5"
                        >
                          <Plus className="size-3.5" />
                          Create Template
                        </Button>
                      </EmptyContent>
                    </Empty>
                  ) : approvedTemplates.length === 0 && underReviewTemplates.length === 0 ? (
                    <div className="text-center py-12 text-xs text-muted-foreground">
                      No templates match your search query.
                    </div>
                  ) : (
                    <div className="min-h-0 max-h-[min(28rem,calc(100vh-22rem))] flex-1 overflow-y-auto overscroll-y-contain px-1 py-1.5 lg:max-h-none">
                      <div className="flex flex-col gap-2.5">
                      {/* Approved templates list */}
                      {approvedTemplates.map((t) => {
                        const isSelected = templateKey === `${t.name}\t${t.language}`;
                        return (
                          <div
                            key={`${t.name}-${t.language}`}
                            onClick={() => setTemplateKey(`${t.name}\t${t.language}`)}
                            className={`relative flex items-center justify-between rounded-xl border p-4 cursor-pointer text-left transition-all hover:shadow-2xs active:scale-[0.99] gap-4 ${
                              isSelected
                                ? 'border-foreground bg-zinc-50 dark:bg-zinc-900/30'
                                : 'border-border bg-background hover:border-border-hover'
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-3 w-full">
                                <h3 className="m-0 text-xs font-bold text-foreground truncate">
                                  {t.name}
                                </h3>
                                <Badge className="bg-emerald-600 hover:bg-emerald-600 text-[9px] font-bold py-0.5 px-1.5 text-white select-none capitalize shrink-0">
                                  {t.status.toLowerCase()}
                                </Badge>
                              </div>
                              <div className="mt-1 flex flex-wrap gap-1.5">
                                <Badge variant="outline" className="text-[9px] font-semibold py-0 px-1 text-muted-foreground select-none">
                                  {t.language}
                                </Badge>
                                <Badge variant="outline" className="text-[9px] font-semibold py-0 px-1 text-muted-foreground select-none">
                                  {t.category}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Under review templates list */}
                      {underReviewTemplates.map((t) => {
                        return (
                          <div
                            key={`${t.name}-${t.language}`}
                            className="relative flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 p-4 opacity-70 text-left cursor-not-allowed select-none gap-4"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-3 w-full">
                                <h3 className="m-0 text-xs font-bold text-muted-foreground truncate">
                                  {t.name}
                                </h3>
                                <Badge variant="secondary" className="text-[9px] font-bold py-0.5 px-1.5 capitalize shrink-0">
                                  {t.status.toLowerCase()}
                                </Badge>
                              </div>
                              <div className="mt-1 flex flex-wrap gap-1.5">
                                <Badge variant="outline" className="text-[9px] font-semibold py-0 px-1 text-muted-foreground select-none">
                                  {t.language}
                                </Badge>
                                <Badge variant="outline" className="text-[9px] font-semibold py-0 px-1 text-muted-foreground select-none">
                                  {t.category}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column: WhatsApp Preview (lg:col-span-5) */}
                <div className="flex h-full min-h-0 flex-col lg:col-span-5">
                  <WhatsAppTemplatePreview
                    templateName={selectedTemplate?.name}
                    components={selectedTemplate?.components}
                    isLoading={templatesLoading}
                    emptyMessage="Select a template to view preview"
                  />
                </div>
              </div>

              {/* Wizard Control */}
              <div className="mt-4 flex shrink-0 justify-end border-t border-border pt-5">
                <Button
                  type="button"
                  disabled={!selectedTemplate}
                  onClick={() => setStep(2)}
                  className="gap-2 px-5 py-2.5 font-bold cursor-pointer transition-all active:scale-[0.98]"
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2 FORM */}
          {step === 2 && (
            <div className="flex flex-col gap-5 animate-fade-in flex-1 justify-between">
              <div className="flex flex-col gap-4">
                {customers === undefined ? (
                  <RecipientListSkeleton />
                ) : customers.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-10">
                    No customers with a phone number yet. Add a phone on the Customers page to
                    include them in broadcasts.
                  </p>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="relative w-full sm:max-w-xs">
                        <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Search name, email, or phone..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9 h-9 text-xs"
                        />
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            <X className="size-3" />
                          </button>
                        )}
                      </div>

                      <Select
                        value={selectedLeadTemperature}
                        onValueChange={(value) =>
                          setSelectedLeadTemperature(value as 'ALL' | LeadTemperature)
                        }
                      >
                        <SelectTrigger
                          className="w-fit shrink-0 max-w-[220px] bg-background border-border"
                        >
                          <SelectValue asChild>
                            <span className="flex items-center gap-1.5 min-w-0">
                              {selectedLeadTemperature === 'ALL' ? (
                                <span>All temperatures</span>
                              ) : (
                                (() => {
                                  const style = getLeadTemperatureStyle(selectedLeadTemperature);
                                  const Icon = style.icon;
                                  return (
                                    <>
                                      <Icon
                                        className={cn('size-3 shrink-0', style.iconClass)}
                                      />
                                      <span>{selectedLeadTemperature}</span>
                                    </>
                                  );
                                })()
                              )}
                            </span>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent
                          align="start"
                          className="min-w-[var(--radix-select-trigger-width)]"
                        >
                          <SelectItem value="ALL">All temperatures</SelectItem>
                          {LEAD_TEMPERATURE_TAGS.map((temperature) => {
                            const style = getLeadTemperatureStyle(temperature);
                            const Icon = style.icon;
                            return (
                              <SelectItem
                                key={temperature}
                                value={temperature}
                                textValue={temperature}
                              >
                                <span className="flex items-center gap-1.5">
                                  <Icon
                                    className={cn('size-3.5 shrink-0', style.iconClass)}
                                  />
                                  <span>{temperature}</span>
                                </span>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>

                      {allTags.length > 0 && (
                        <Select value={selectedTag} onValueChange={setSelectedTag}>
                          <SelectTrigger
                            className="w-fit shrink-0 max-w-[200px] bg-background border-border"
                          >
                            <SelectValue asChild>
                              <span className="flex items-center gap-1.5 min-w-0">
                                {selectedTag === 'ALL' ? (
                                  <span>All tags</span>
                                ) : (
                                  <>
                                    <span
                                      className={cn(
                                        'size-1.5 rounded-full shrink-0',
                                        getTagColorClass(selectedTag).dot,
                                      )}
                                    />
                                    <span className="truncate">{selectedTag}</span>
                                  </>
                                )}
                              </span>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent
                            align="start"
                            className="min-w-[var(--radix-select-trigger-width)]"
                          >
                            <SelectItem value="ALL">All tags</SelectItem>
                            {allTags.map((tag) => (
                              <SelectItem key={tag} value={tag} textValue={tag}>
                                <span className="flex items-center gap-1.5">
                                  <span
                                    className={cn(
                                      'size-1.5 rounded-full shrink-0',
                                      getTagColorClass(tag).dot,
                                    )}
                                  />
                                  <span className="truncate">{tag}</span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    {/* Recipient Selection Table */}
                    <div
                      className="overflow-hidden rounded-xl border border-border"
                      style={{ background: 'var(--color-surface)', fontSize: '13px' }}
                    >
                      <table className="w-full border-collapse">
                        <thead>
                          <tr style={{ background: 'var(--color-surface-hover)' }}>
                            <th className="w-10 px-3.5 py-3 text-left">
                              <input
                                type="checkbox"
                                className="rounded border-border cursor-pointer text-primary"
                                checked={
                                  filteredCustomers.length > 0 && isAllFilteredSelected
                                }
                                ref={(el) => {
                                  if (el) {
                                    el.indeterminate =
                                      isSomeFilteredSelected && !isAllFilteredSelected;
                                  }
                                }}
                                onChange={toggleAllFiltered}
                                disabled={filteredCustomers.length === 0}
                                aria-label="Select all filtered customers"
                              />
                            </th>
                            <th className="px-3 py-3 text-left text-2xs font-bold text-muted-foreground">
                              Customer name
                            </th>
                            <th className="px-3 py-3 text-left text-2xs font-bold text-muted-foreground">
                              Assignee
                            </th>
                            <th className="px-3 py-3 text-left text-2xs font-bold text-muted-foreground">
                              Phone number
                            </th>
                            <th className="px-3 py-3 text-left text-2xs font-bold text-muted-foreground">
                              Source
                            </th>
                            <th className="px-3 py-3 text-left text-2xs font-bold text-muted-foreground">
                              Temperature
                            </th>
                            <th className="px-3 py-3 text-left text-2xs font-bold text-muted-foreground">
                              Tags
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredCustomers.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="text-center py-8 text-muted-foreground text-xs">
                                No customers match the current search filters.
                              </td>
                            </tr>
                          ) : (
                            filteredCustomers.map((row: BroadcastCustomerRow) => {
                              const isSelected = selectedCustomerIds.has(row.customerId);
                              const sourceLabel = customerSourceLabel(row.service);
                              const SourceIcon = sourceBadgeInfo[sourceLabel].icon;
                              return (
                                <tr
                                  key={row.customerId}
                                  onClick={() => toggleCustomer(row.customerId)}
                                  className={`cursor-pointer border-t border-border/80 transition-colors hover:bg-accent/30 ${
                                    isSelected ? 'bg-primary/5' : ''
                                  }`}
                                >
                                  <td className="px-3.5 py-2.5" onClick={(e) => e.stopPropagation()}>
                                    <input
                                      type="checkbox"
                                      className="rounded border-border cursor-pointer text-primary"
                                      checked={isSelected}
                                      onChange={() => toggleCustomer(row.customerId)}
                                      aria-label={`Select ${row.name ?? row.recipientLabel}`}
                                    />
                                  </td>
                                  <td className="px-3 py-2.5 font-semibold text-foreground">
                                    {row.name?.trim() || 'Unnamed customer'}
                                  </td>
                                  <td className="px-3 py-2.5">
                                    {row.assignToAiAgent ? (
                                      <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                                        <Users className="size-3.5 shrink-0 text-primary" />
                                        <span className="truncate max-w-[120px]">
                                          {row.assignedAgentName ?? 'AI agent'}
                                        </span>
                                      </div>
                                    ) : row.assignedUserId ? (
                                      (() => {
                                        const u = teamUsers?.find(
                                          (m) => m.workosUserId === row.assignedUserId,
                                        );
                                        const label = u
                                          ? [u.firstName, u.lastName].filter(Boolean).join(' ') ||
                                            u.email
                                          : 'Teammate';
                                        return (
                                          <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                                            <User className="size-3.5 shrink-0 text-[#6366f1]" />
                                            <span className="truncate max-w-[120px]" title={label}>
                                              {label}
                                            </span>
                                          </div>
                                        );
                                      })()
                                    ) : (
                                      <span className="text-xs font-normal text-muted-foreground/60">
                                        Unassigned
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2.5 font-mono text-2xs text-muted-foreground">
                                    {row.recipientLabel}
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <Badge variant="outline" className="text-[10px] font-medium">
                                      <SourceIcon
                                        data-icon="inline-start"
                                        className={sourceBadgeInfo[sourceLabel].colorClass}
                                      />
                                      {sourceLabel}
                                    </Badge>
                                  </td>
                                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                                    {row.leadTemperature ? (
                                      (() => {
                                        const temperature = row.leadTemperature;
                                        const style = getLeadTemperatureStyle(temperature);
                                        const Icon = style.icon;
                                        return (
                                          <Badge
                                            variant="secondary"
                                            onClick={() => {
                                              setSelectedLeadTemperature((current) =>
                                                current === temperature
                                                  ? 'ALL'
                                                  : temperature,
                                              );
                                            }}
                                            className={cn(
                                              'cursor-pointer gap-1.5 py-0 px-1.5 text-[9px] font-semibold',
                                              style.bg,
                                              style.text,
                                            )}
                                          >
                                            <Icon
                                              className={cn('size-3 shrink-0', style.iconClass)}
                                            />
                                            {temperature}
                                          </Badge>
                                        );
                                      })()
                                    ) : (
                                      <span className="text-muted-foreground/30 text-xs select-none">—</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex flex-wrap gap-1">
                                      {row.tags && row.tags.length > 0 ? (
                                        row.tags.map((t: string) => (
                                          <Badge
                                            key={t}
                                            variant="secondary"
                                            onClick={() => {
                                              setSelectedTag((current) =>
                                                current === t ? 'ALL' : t,
                                              );
                                            }}
                                            className="text-[9px] font-semibold py-0 px-1.5 cursor-pointer bg-background text-muted-foreground hover:bg-primary/10 hover:text-primary border border-border"
                                          >
                                            {t}
                                          </Badge>
                                        ))
                                      ) : (
                                        <span className="text-muted-foreground/30 text-xs select-none">—</span>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center justify-between text-[9px] text-muted-foreground/60 mt-1 px-1 font-normal leading-tight">
                      <span>
                        Showing {filteredCustomers.length} of {customers.length} customers with phone
                      </span>
                      <span>
                        {selectedCount} selected · max {MAX_BATCH} per batch
                        {overLimit ? (
                          <span className="ml-1 font-bold text-destructive">
                            (Reduce selection by {selectedCount - MAX_BATCH})
                          </span>
                        ) : null}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Wizard Controls */}
              <div className="mt-4 flex flex-col gap-2 border-t border-border pt-5">
                {showRecipientError && (
                  <p className="text-right text-[11px] font-semibold text-destructive animate-fade-in">
                    Please select at least one customer.
                  </p>
                )}
                <div className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="gap-2 cursor-pointer h-10 px-4 font-bold"
                >
                  <ChevronLeft className="size-4" />
                  Back
                </Button>
                <Button
                  type="button"
                  disabled={overLimit}
                  onClick={handleRecipientsNext}
                  className="gap-2 cursor-pointer h-10 px-5 font-bold transition-all active:scale-[0.98]"
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 FORM — Schedule */}
          {step === 3 && (
            <div className="flex min-h-0 flex-1 flex-col justify-between overflow-hidden animate-fade-in">
              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                <div className="flex max-w-2xl flex-col gap-5">
                <RadioGroup
                  value={scheduleMode}
                  onValueChange={(value) => setScheduleMode(value as BroadcastScheduleMode)}
                  className="gap-5"
                >
                  {/* Radio option 1: Send now */}
                  <div className="flex items-start gap-3.5 group">
                    <RadioGroupItem
                      value="now"
                      id="schedule-now"
                      className="mt-4 shrink-0 focus:ring-primary cursor-pointer"
                    />
                    <Label
                      htmlFor="schedule-now"
                      className="flex-1 cursor-pointer font-normal"
                    >
                      <div className={cn(
                        "flex flex-col justify-between rounded-2xl border p-4.5 transition-all duration-200 select-none shadow-2xs hover:shadow-xs",
                        scheduleMode === 'now'
                          ? "border-primary bg-primary/5 dark:bg-primary/950/10 ring-1 ring-primary/20"
                          : "border-border bg-card hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50/50 dark:hover:bg-neutral-900/50"
                      )}>
                        <div>
                          <h4 className="font-semibold text-lg text-foreground leading-snug">
                            Send now
                          </h4>
                          <p className="text-xs text-muted-foreground font-normal mt-1 leading-normal">
                            Send your broadcast to selected contacts immediately.
                          </p>
                        </div>
                      </div>
                    </Label>
                  </div>

                  {/* Radio option 2: Schedule for later */}
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start gap-3.5 group">
                      <RadioGroupItem
                        value="later"
                        id="schedule-later"
                        className="mt-4 shrink-0 focus:ring-primary cursor-pointer"
                      />
                      <Label
                        htmlFor="schedule-later"
                        className="flex-1 cursor-pointer font-normal"
                      >
                        <div className={cn(
                          "flex flex-col justify-between rounded-2xl border p-4.5 transition-all duration-200 select-none shadow-2xs hover:shadow-xs",
                          scheduleMode === 'later'
                            ? "border-primary bg-primary/5 dark:bg-primary/950/10 ring-1 ring-primary/20"
                            : "border-border bg-card hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50/50 dark:hover:bg-neutral-900/50"
                        )}>
                          <div>
                            <h4 className="font-semibold text-lg text-foreground leading-snug">
                              Schedule for later
                            </h4>
                            <p className="text-xs text-muted-foreground font-normal mt-1 leading-normal">
                              Set a future date and time for your broadcast to go out.
                            </p>
                          </div>

                          {/* Date/Time pickers: nested inside the card container when selected */}
                          {scheduleMode === 'later' && (
                            <div
                              className="mt-4.5 flex flex-col gap-4 border-t border-dashed border-border/80 pt-4.5 animate-in fade-in slide-in-from-top-2 duration-200"
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                            >
                              <div className="flex flex-wrap items-start gap-6">
                                <div className="w-fit overflow-hidden rounded-xl border border-border bg-card shadow-2xs">
                                  <Calendar
                                    mode="single"
                                    selected={scheduledDate}
                                    onSelect={(date) => {
                                      if (!date) return;
                                      setScheduledDate(date);
                                      const options = timeOptionsForDate(date);
                                      if (
                                        !options.some(
                                          (option) => option.value === scheduledTimeMinutes,
                                        )
                                      ) {
                                        setScheduledTimeMinutes(options[0]?.value ?? '0');
                                      }
                                    }}
                                    disabled={{ before: startOfDay(new Date()) }}
                                  />
                                </div>
                                <div className="flex flex-col gap-2 pt-1">
                                  <Label className="text-xs font-bold text-muted-foreground">
                                    Time
                                  </Label>
                                  <Select
                                    value={scheduledTimeMinutes}
                                    onValueChange={setScheduledTimeMinutes}
                                  >
                                    <SelectTrigger className="w-[7.5rem] bg-card border-border" size="sm" hideIcon>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {availableTimeOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                          {option.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </Label>
                    </div>
                  </div>
                </RadioGroup>

                {/* Preview below the selection when Send Now is selected */}
                {scheduleMode === 'now' && (
                  <div className="text-sm text-muted-foreground bg-muted/40 p-3.5 rounded-xl border border-border/80 w-full animate-in fade-in slide-in-from-top-1 duration-200">
                    <span>
                      Broadcast will be processed and sent immediately (approx. <span className="font-semibold text-foreground">{sendNowPreviewLabel}</span>).
                    </span>
                  </div>
                )}

                {/* Preview below the selection when Schedule for Later is selected */}
                {scheduleMode === 'later' && scheduledAtMs !== null && (
                  <div className="text-sm text-muted-foreground bg-muted/40 p-3.5 rounded-xl border border-border/80 w-full animate-in fade-in slide-in-from-top-1 duration-200">
                    <span>
                      Broadcast will be processed and sent on{' '}
                      <span className="font-bold text-foreground">
                        {formatScheduleLabel(scheduledAtMs)}
                      </span>.
                    </span>
                  </div>
                )}
                </div>
              </div>

              <div className="mt-4 flex shrink-0 justify-between border-t border-border pt-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="gap-2 cursor-pointer h-10 px-4 font-bold"
                >
                  <ChevronLeft className="size-4" />
                  Back
                </Button>
                <Button
                  type="button"
                  disabled={!canProceedFromSchedule}
                  onClick={() => setStep(4)}
                  className="gap-2 cursor-pointer h-10 px-5 font-bold transition-all active:scale-[0.98]"
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4 FORM — Review & send */}
          {step === 4 && (
            <div className="flex min-h-0 flex-1 flex-col justify-between gap-4 overflow-hidden animate-fade-in">
              <div className="no-scrollbar grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-y-auto lg:grid-cols-[3fr_2fr] lg:items-start">
                <div className="flex flex-col gap-10">
                  <section className="flex flex-col gap-3">
                    <h3 className="m-0 border-b border-border pb-2 text-xs font-bold text-muted-foreground">
                      Summary
                    </h3>
                    <div className="grid gap-2 text-sm">
                      <div className="flex items-baseline justify-between gap-4 border-b border-dashed border-border/60 pb-1.5">
                        <span className="shrink-0 text-muted-foreground">Sender</span>
                        <span className="flex items-center gap-1.5 truncate text-foreground">
                          <SiWhatsapp className="size-3.5 shrink-0 text-[#25D366]" />
                          {whatsappReady.find((c) => c._id === channelId)
                            ? channelLabel(whatsappReady.find((c) => c._id === channelId)!)
                            : '—'}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between gap-4 border-b border-dashed border-border/60 pb-1.5">
                        <span className="shrink-0 text-muted-foreground">Total recipients</span>
                        <span className="text-foreground">{selectedCount}</span>
                      </div>
                      <div className="flex items-baseline justify-between gap-4 border-b border-dashed border-border/60 pb-1.5">
                        <span className="shrink-0 text-muted-foreground">Schedule</span>
                        <span className="truncate text-right text-foreground">{scheduleSummaryLabel}</span>
                      </div>
                      <div className="flex items-baseline justify-between gap-4 border-b border-dashed border-border/60 pb-1.5">
                        <span className="shrink-0 text-muted-foreground">Rate per message</span>
                        <span className="text-foreground">RM {Number(currentMessageRate.toFixed(4))}</span>
                      </div>
                      <div className="flex items-baseline justify-between gap-4 pt-0.5">
                        <span className="font-semibold text-foreground">Est. final cost</span>
                        <span className="font-semibold text-foreground">RM {estimatedCostRm.toFixed(2)}</span>
                      </div>
                    </div>
                  </section>

                  <section className="flex flex-col gap-3">
                    <h3 className="m-0 border-b border-border pb-2 text-xs font-bold text-muted-foreground">
                      Pre-Flight Checklist
                    </h3>
                    <div className="flex flex-col gap-2">
                      <div
                        onClick={() => {
                          const nextVal = !balanceChecked;
                          setBalanceChecked(nextVal);
                          if (nextVal && insufficientBalanceUnderstood) {
                            setShowChecklistError(false);
                          }
                        }}
                        className="flex cursor-pointer select-none items-center gap-2 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <div
                          className={cn(
                            'flex size-3.5 shrink-0 items-center justify-center rounded-sm border transition-all duration-150',
                            balanceChecked
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-neutral-300 bg-background dark:border-neutral-700',
                          )}
                        >
                          {balanceChecked && <Check className="size-2.5 stroke-[3]" />}
                        </div>
                        <span>My Meta billing balance has sufficient funds.</span>
                      </div>

                      <div
                        onClick={() => {
                          const nextVal = !insufficientBalanceUnderstood;
                          setInsufficientBalanceUnderstood(nextVal);
                          if (balanceChecked && nextVal) {
                            setShowChecklistError(false);
                          }
                        }}
                        className="flex cursor-pointer select-none items-center gap-2 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <div
                          className={cn(
                            'flex size-3.5 shrink-0 items-center justify-center rounded-sm border transition-all duration-150',
                            insufficientBalanceUnderstood
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-neutral-300 bg-background dark:border-neutral-700',
                          )}
                        >
                          {insufficientBalanceUnderstood && <Check className="size-2.5 stroke-[3]" />}
                        </div>
                        <span>I acknowledge that insufficient funds will cause delivery failure.</span>
                      </div>
                    </div>
                    {showChecklistError && (
                      <p className="text-[11px] font-semibold text-destructive animate-fade-in">
                        {scheduleMode === 'later'
                          ? 'Please confirm all checklist items before scheduling.'
                          : 'Please confirm all checklist items before sending.'}
                      </p>
                    )}
                  </section>

                </div>

                <section className="flex min-h-0 flex-col gap-3">
                  <h3 className="m-0 border-b border-border pb-2 text-xs font-bold text-muted-foreground">
                    Message Preview
                  </h3>
                  <WhatsAppTemplatePreview
                    templateName={selectedTemplate?.name}
                    components={selectedTemplate?.components}
                    isLoading={templatesLoading}
                    emptyMessage="Select a template to view preview"
                    fillWidth
                    className="w-full"
                  />
                </section>
              </div>

              <div className="flex shrink-0 justify-between border-t border-border pt-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(3)}
                  disabled={sendBusy}
                  className="h-10 gap-2 px-4 font-bold transition-all active:scale-[0.98] cursor-pointer"
                >
                  <ChevronLeft className="size-4" />
                  Back
                </Button>
                <Button
                  type="button"
                  disabled={sendBusy || selectedCount === 0 || overLimit}
                  onClick={() => void handleSend()}
                  className={cn(
                    'h-10 gap-2 px-6 font-bold bg-primary text-primary-foreground shadow-md transition-all active:scale-[0.98] hover:bg-primary-hover cursor-pointer',
                    (!balanceChecked || !insufficientBalanceUnderstood) && 'cursor-not-allowed opacity-50 hover:bg-primary',
                  )}
                >
                  {sendBusy ? <Loader2 className="size-4 animate-spin" /> : null}
                  {scheduleMode === 'later' ? 'Schedule broadcast' : 'Send now'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CREATE TEMPLATE DIALOG */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create message template</DialogTitle>
            <DialogDescription>
              Submits a utility-style template to Meta for review. Category and
              content must comply with WhatsApp policies.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2 text-left">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tpl-name">Name</Label>
              <Input
                id="tpl-name"
                value={tplName}
                onChange={(e) => setTplName(e.target.value)}
                disabled={createBusy}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tpl-lang">Language</Label>
                <Input
                  id="tpl-lang"
                  value={tplLang}
                  onChange={(e) => setTplLang(e.target.value)}
                  disabled={createBusy}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tpl-cat">Category</Label>
                <Input
                  id="tpl-cat"
                  value={tplCategory}
                  onChange={(e) => setTplCategory(e.target.value)}
                  disabled={createBusy}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tpl-body">Body</Label>
              <Textarea
                id="tpl-body"
                rows={4}
                value={tplBody}
                onChange={(e) => setTplBody(e.target.value)}
                disabled={createBusy}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={createBusy}>
              Cancel
            </Button>
            <Button onClick={() => void handleCreateTemplate()} disabled={createBusy} className="gap-2">
              {createBusy ? <Loader2 className="size-4 animate-spin" /> : null}
              Submit to Meta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={sendBusy} onOpenChange={() => {}}>
        <DialogContent
          showCloseButton={false}
          className="pointer-events-none gap-3 rounded-lg px-6 py-12 text-center sm:max-w-sm"
          onInteractOutside={(e: Event) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onKeyDown={(e) => e.preventDefault()}
        >
          <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Loader2 className="size-5 animate-spin" />
          </div>
          <DialogHeader className="gap-1 text-center">
            <DialogTitle className="text-lg font-semibold">
              Preparing broadcast
            </DialogTitle>
            <DialogDescription className="text-sm leading-5 text-muted-foreground">
              Setting up recipients and scheduling delivery.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
