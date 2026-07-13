import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router';
import { useAction, useMutation, useQuery } from 'convex/react';
import {
  ArrowLeft,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Check,
  Megaphone,
  CalendarClock,
  Send,
  Search,
  X,
  Plus,
  Repeat,
  ListOrdered,
} from 'lucide-react';
import { SiWhatsapp } from 'react-icons/si';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { WhatsAppTemplatePreview } from '@/components/WhatsAppTemplatePreview';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getLeadTemperatureStyle, type LeadTemperature } from '@/lib/leadTemperature';
import { getWhatsAppRateForCategory } from '@/lib/whatsappRates';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { MultiSelect, type MultiSelectGroup } from '@/components/ui/multi-select';
import { PlanFeatureGate } from '@/components/PlanFeatureGate';
import {
  FOLLOW_UP_MESSAGE_REQUIRED_ERROR,
  hasCompleteFollowUpMessages,
} from '../../shared/followUpMessageReadiness';

const DELAY_OPTIONS = [
  { label: '1 day', value: 24 },
  { label: '2 days', value: 48 },
  { label: '3 days', value: 72 },
  { label: '5 days', value: 120 },
  { label: '7 days', value: 168 },
];

const INTERVAL_OPTIONS = [
  { label: '1 day', value: 24 },
  { label: '2 days', value: 48 },
  { label: '3 days', value: 72 },
  { label: '5 days', value: 120 },
  { label: '7 days', value: 168 },
];


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

type MessageSubStep = 'strategy' | 'configure';

interface TemplatePickerPanelProps {
  filteredTemplates: any[];
  templatesLoading: boolean;
  templateSearchQuery: string;
  onTemplateSearchQueryChange: (query: string) => void;
  selectedKey: string;
  onSelect: (templateKey: string) => void;
  agentId: string | undefined;
}

function TemplatePickerPanel({
  filteredTemplates,
  templatesLoading,
  templateSearchQuery,
  onTemplateSearchQueryChange,
  selectedKey,
  onSelect,
  agentId,
}: TemplatePickerPanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-3">
        <h3 className="m-0 text-xs font-semibold text-muted-foreground">Template</h3>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          asChild
          className="h-8 gap-1.5 px-2.5 text-xs"
        >
          <Link to={`/dashboard/${agentId}/templates/new`} target="_blank" rel="noopener noreferrer">
            <Plus className="size-3.5" />
            Create Template
          </Link>
        </Button>
      </div>

      <div className="relative shrink-0">
        <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search templates..."
          value={templateSearchQuery}
          onChange={(e) => onTemplateSearchQueryChange(e.target.value)}
          className="h-9.5 border border-neutral-300 bg-background pl-9 text-xs dark:border-neutral-700"
        />
        {templateSearchQuery && (
          <button
            type="button"
            onClick={() => onTemplateSearchQueryChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {templatesLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="py-10 text-center text-xs text-muted-foreground">
            No templates found.
          </div>
        ) : (
          filteredTemplates.map((t) => {
            const key = `${t.name}\t${t.language}`;
            const isSelected = selectedKey === key;
            return (
              <button
                key={`${t.name}-${t.language}`}
                type="button"
                onClick={() => onSelect(key)}
                className={cn(
                  'relative flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors',
                  isSelected
                    ? 'border-foreground bg-zinc-50 dark:bg-zinc-900/30'
                    : 'border-border bg-background hover:border-neutral-300 dark:hover:border-neutral-700',
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{t.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t.language} · {t.category.toLowerCase()}
                  </p>
                </div>
                {isSelected && (
                  <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                    <Check className="size-3" strokeWidth={3} />
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}


export default function AutomationsFollowUpPage() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const typedAgentId = agentId as Id<'agents'> | undefined;

  const [step, setStep] = useState(1);
  const [messageSubStep, setMessageSubStep] = useState<MessageSubStep>('strategy');
  const [channelId, setChannelId] = useState<Id<'channels'> | ''>('');
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [useSameMessage, setUseSameMessage] = useState(true);
  const [singleTemplateKey, setSingleTemplateKey] = useState<string>('');
  const [attempts, setAttempts] = useState<
    Array<{ attemptNumber: number; templateName: string; templateLanguage: string }>
  >([]);

  const [name, setName] = useState(() => {
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `Follow-up (${dateStr})`;
  });
  const [triggerDelayHours, setTriggerDelayHours] = useState(24); // default 1 day
  const [intervalHours, setIntervalHours] = useState(24); // default 1 day
  const [selectedAudience, setSelectedAudience] = useState<string[]>([
    'lead:Hot',
    'lead:Warm',
  ]);
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [templateSearchQuery, setTemplateSearchQuery] = useState('');

  // Pre-flight billing checklist states
  const [balanceChecked, setBalanceChecked] = useState(false);
  const [insufficientBalanceUnderstood, setInsufficientBalanceUnderstood] = useState(false);
  const [showChecklistError, setShowChecklistError] = useState(false);
  const [showMessageRequiredError, setShowMessageRequiredError] = useState(false);
  const [isActiveOnCreate, setIsActiveOnCreate] = useState(true);
  const messagesReady = hasCompleteFollowUpMessages(attempts);

  // Queries & Actions
  const channels = useQuery(api.channels.listForCurrentOrg, {});
  const createFollowUp = useMutation(api.whatsappFollowUp.createFollowUpRule);
  const listTemplatesAction = useAction(api.whatsappBroadcast.listTemplates);
  
  // Candidates for live count preview
  const candidates = useQuery(
    api.customers.listForAgentBroadcast,
    typedAgentId ? { agentId: typedAgentId } : 'skip'
  );

  const [templates, setTemplates] = useState<any[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  // Filter connected WhatsApp channels with required credentials
  const whatsappChannels = useMemo(() => {
    if (!channels) return [];
    return channels.filter(
      (ch) =>
        ch.service === 'whatsapp' &&
        ch.status === 'connected' &&
        Boolean(ch.wabaId?.trim()) &&
        Boolean(ch.phoneNumberId?.trim())
    );
  }, [channels]);

  // Set default channel when loaded
  useEffect(() => {
    if (whatsappChannels.length > 0 && !channelId) {
      setChannelId(whatsappChannels[0]._id);
    }
  }, [whatsappChannels, channelId]);

  // Reset checklist errors when step changes
  useEffect(() => {
    setShowChecklistError(false);
  }, [step]);



  // Load templates for selected channel
  useEffect(() => {
    if (!channelId) return;
    setTemplatesLoading(true);
    listTemplatesAction({ channelId })
      .then((res) => {
        setTemplates(res.templates ?? []);
      })
      .catch((err) => {
        toast.error('Failed to load templates: ' + err.message);
      })
      .finally(() => {
        setTemplatesLoading(false);
      });
  }, [channelId, listTemplatesAction]);

  const approvedTemplates = useMemo(() => {
    return templates.filter((t) => t.status === 'APPROVED');
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    const query = templateSearchQuery.trim().toLowerCase();
    if (!query) return approvedTemplates;
    return approvedTemplates.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        t.category.toLowerCase().includes(query) ||
        t.language.toLowerCase().includes(query)
    );
  }, [approvedTemplates, templateSearchQuery]);

  // Auto-align attempts when using the same message for all
  useEffect(() => {
    if (!useSameMessage) return;
    const [name, language] = singleTemplateKey.split('\t');
    setAttempts(() => {
      return Array.from({ length: maxAttempts }, (_, i) => ({
        attemptNumber: i + 1,
        templateName: name || '',
        templateLanguage: language || '',
      }));
    });
  }, [useSameMessage, singleTemplateKey, maxAttempts]);

  // Align attempts array with maxAttempts when customizing messages
  useEffect(() => {
    if (useSameMessage) return;
    setAttempts((prev) => {
      const next = [...prev];
      if (next.length > maxAttempts) {
        return next.slice(0, maxAttempts);
      }
      while (next.length < maxAttempts) {
        const attemptNumber = next.length + 1;
        next.push({
          attemptNumber,
          templateName: '',
          templateLanguage: '',
        });
      }
      return next;
    });
  }, [maxAttempts, useSameMessage]);

  const selectedAttemptTemplate = useMemo(() => {
    if (useSameMessage) {
      if (!singleTemplateKey) return null;
      const [name, language] = singleTemplateKey.split('\t');
      return templates.find((t) => t.name === name && t.language === language);
    }
    const activeAttempt = attempts[activePreviewIndex];
    if (!activeAttempt) return null;
    return templates.find(
      (t) => t.name === activeAttempt.templateName && t.language === activeAttempt.templateLanguage
    );
  }, [activePreviewIndex, templates, useSameMessage, singleTemplateKey, attempts]);

  // Live count matching leads
  // Extract unique customer tags for filtering
  const allTags = useMemo(() => {
    if (!candidates) return [];
    const tags = new Set<string>();
    candidates.forEach((c) => {
      if (c.tags) {
        c.tags.forEach((t) => tags.add(t));
      }
    });
    return Array.from(tags).sort();
  }, [candidates]);

  const selectedLeadTemperatures = useMemo(() => {
    return selectedAudience
      .filter((filter) => filter.startsWith('lead:'))
      .map((filter) => filter.slice(5) as LeadTemperature);
  }, [selectedAudience]);

  const selectedAudienceTags = useMemo(() => {
    return selectedAudience
      .filter((filter) => filter.startsWith('tag:'))
      .map((filter) => filter.slice(4));
  }, [selectedAudience]);

  const audienceSelectGroups = useMemo((): MultiSelectGroup[] => {
    const leadOptions = (['Hot', 'Warm', 'Cold'] as const).map((temp) => {
      const style = getLeadTemperatureStyle(temp);
      const Icon = style.icon;
      const isRecommended = temp === 'Hot' || temp === 'Warm';
      return {
        value: `lead:${temp}`,
        selectedLabel: (
          <span className="flex items-center gap-1.5">
            <Icon className={cn('size-3 shrink-0', style.iconClass)} />
            <span>{temp}</span>
          </span>
        ),
        label: (
          <span className="flex items-center gap-2">
            <Icon className={cn('size-3.5 shrink-0', style.iconClass)} />
            <span>{temp}</span>
            {isRecommended && (
              <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                Recommended
              </span>
            )}
          </span>
        ),
        searchValue: isRecommended ? `${temp} recommended` : temp,
      };
    });

    const tagOptions = allTags.map((tag) => ({
      value: `tag:${tag}`,
      label: (
        <span className="flex items-center gap-2">
          <span className={cn('size-1.5 shrink-0 rounded-full', getTagColorClass(tag).dot)} />
          <span>{tag}</span>
        </span>
      ),
      searchValue: tag,
    }));

    return [
      { label: 'Lead temperature', options: leadOptions },
      ...(tagOptions.length > 0 ? [{ label: 'Tags', options: tagOptions }] : []),
    ];
  }, [allTags]);

  const filteredCandidates = useMemo(() => {
    if (!candidates) return [];
    return candidates.filter((c) => {
      if (selectedLeadTemperatures.length > 0) {
        if (!c.leadTemperature || !selectedLeadTemperatures.includes(c.leadTemperature)) {
          return false;
        }
      }
      if (selectedAudienceTags.length > 0) {
        if (!c.tags || !c.tags.some((tag) => selectedAudienceTags.includes(tag))) {
          return false;
        }
      }
      return true;
    });
  }, [candidates, selectedLeadTemperatures, selectedAudienceTags]);

  const filteredCandidatesCount = useMemo(() => {
    return filteredCandidates.length;
  }, [filteredCandidates]);

  const estimatedCostPerCustomer = useMemo(() => {
    return attempts.reduce((total, att) => {
      if (!att.templateName) return total;
      const template = approvedTemplates.find(
        (t) => t.name === att.templateName && t.language === att.templateLanguage,
      );
      return total + getWhatsAppRateForCategory(template?.category);
    }, 0);
  }, [attempts, approvedTemplates]);

  const handleSelectTemplateForAttempt = (index: number, templateKey: string) => {
    const [name, language] = templateKey.split('\t');
    setAttempts((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        templateName: name,
        templateLanguage: language,
      };
      return next;
    });
  };

  const handleDifferentMessagesNext = () => {
    const firstMissingIndex = attempts.findIndex((att) => !att.templateName);
    if (firstMissingIndex !== -1) {
      setActivePreviewIndex(firstMissingIndex);
      toast.error(`Please select a message for Follow-up ${firstMissingIndex + 1}.`);
      return;
    }
    setStep(3);
  };

  const handleSubmit = async () => {
    if (!channelId) {
      toast.error('Please select a WhatsApp channel.');
      return;
    }
    if (selectedAudience.length === 0) {
      toast.error('Please select who to follow up with.');
      return;
    }

    if (isActiveOnCreate && !messagesReady) {
      setShowMessageRequiredError(true);
      return;
    }

    if (!balanceChecked || !insufficientBalanceUnderstood) {
      setShowChecklistError(true);
      return;
    }

    setSubmitting(true);
    try {
      await createFollowUp({
        agentId: typedAgentId!,
        channelId,
        name: name.trim(),
        attempts,
        maxAttempts,
        triggerDelayHours,
        intervalHours,
        audienceLeadTemperatures: selectedLeadTemperatures,
        audienceTags: selectedAudienceTags.length > 0 ? selectedAudienceTags : undefined,
        isActive: isActiveOnCreate,
        estimatedCostPerCustomer,
      });
      toast.success(
        isActiveOnCreate ? 'Follow-up created and turned on' : 'Follow-up created (paused)',
      );
      navigate(`/dashboard/${agentId}/follow-ups`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create follow-up rule');
    } finally {
      setSubmitting(false);
    }
  };

  const handleActiveOnCreateChange = (next: boolean) => {
    if (next && !messagesReady) {
      setShowMessageRequiredError(true);
      return;
    }
    setShowMessageRequiredError(false);
    setIsActiveOnCreate(next);
  };

  if (!typedAgentId) return null;

  if (channels === undefined) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Beautiful Broadcast-style empty state when no connected WhatsApp channels
  if (whatsappChannels.length === 0) {
    return (
      <PlanFeatureGate featureKey="follow_ups" featureName="Follow-ups">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <Button variant="ghost" size="sm" className="-ml-2 w-fit gap-1 text-muted-foreground hover:text-foreground" asChild>
          <Link to={`/dashboard/${agentId}/follow-ups`}>
            <ArrowLeft className="size-4" />
            Back to Follow-ups
          </Link>
        </Button>
        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center animate-fade-in">
          <Megaphone className="mx-auto size-10 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold text-foreground">
            Connect WhatsApp first
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Follow-up rules use your WhatsApp Business account. Connect a WhatsApp
            channel with a phone number and WABA, then return here.
          </p>
          <Button className="mt-6" asChild>
            <Link to={`/dashboard/${agentId}/channels`}>Open Channels</Link>
          </Button>
        </div>
        </div>
      </PlanFeatureGate>
    );
  }

  return (
    <PlanFeatureGate featureKey="follow_ups" featureName="Follow-ups">
      <div className="mx-auto flex h-[calc(100vh-120px)] max-h-[calc(100vh-120px)] w-full max-w-7xl flex-col gap-6 overflow-hidden animate-fade-in px-2 sm:px-4 md:px-6">
      <div className="shrink-0">
        <Button variant="ghost" size="sm" className="-ml-2 gap-1 text-muted-foreground hover:text-foreground" asChild>
          <Link to={`/dashboard/${agentId}/follow-ups`}>
            <ArrowLeft className="size-4" />
            Back to Follow-ups
          </Link>
        </Button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-8 overflow-hidden md:grid-cols-4 md:items-stretch">
        {/* LEFT COLUMN: STAGES CHECKLIST (md:col-span-1 - Borderless & Equal Height) */}
        <div className="md:col-span-1 rounded-2xl border-0 bg-gradient-to-b from-zinc-100/80 via-zinc-50/50 to-zinc-100/30 dark:from-zinc-900/20 dark:to-zinc-950/5 p-6 overflow-hidden relative flex flex-col justify-start min-h-[360px] animate-fade-in shadow-none">
          
          <div className="relative z-10 mb-8 border-b border-border/60 pb-5">
            <h2 className="text-sm font-semibold text-foreground m-0">
              Follow-up setup
            </h2>
          </div>

          <div className="relative z-10 flex flex-col gap-8 pl-1">
            {/* Vertical timeline connecting line */}
            <div className="absolute left-[14px] top-3.5 bottom-3.5 w-0.5 bg-border/80 dark:bg-border/30 -z-10" />

            {/* Stage 1 Check item */}
            <div
              onClick={() => step > 1 && setStep(1)}
              className={cn("flex items-center gap-4", step > 1 && "cursor-pointer")}
            >
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
                <CalendarClock className={`size-4 shrink-0 ${step === 1 ? 'text-primary' : step > 1 ? 'text-foreground' : 'text-muted-foreground'}`} />
                <h3 className={`text-base font-semibold leading-none ${step === 1 ? 'text-primary' : step > 1 ? 'text-foreground' : 'text-muted-foreground'}`}>
                  Setup
                </h3>
              </div>
            </div>

            {/* Stage 2 Check item */}
            <div
              onClick={() => step > 2 && setStep(2)}
              className={cn("flex items-center gap-4", step > 2 && "cursor-pointer")}
            >
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
                <Megaphone className={`size-4 shrink-0 ${step === 2 ? 'text-primary' : step > 2 ? 'text-foreground' : 'text-muted-foreground'}`} />
                <h3 className={`text-base font-semibold leading-none ${step === 2 ? 'text-primary' : step > 2 ? 'text-foreground' : 'text-muted-foreground'}`}>
                  Messages
                </h3>
              </div>
            </div>

            {/* Stage 3 Check item */}
            <div className="flex items-center gap-4">
              <div className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold transition-all ${
                step === 3
                  ? 'bg-foreground text-background border border-foreground shadow-sm scale-105'
                  : 'border border-muted bg-background text-muted-foreground'
              }`}>
                3
              </div>
              <div className="flex items-center gap-2">
                <Send className={`size-4 shrink-0 ${step === 3 ? 'text-primary' : 'text-muted-foreground'}`} />
                <h3 className={`text-base font-semibold leading-none ${step === 3 ? 'text-primary' : 'text-muted-foreground'}`}>
                  Review
                </h3>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: ACTIVE FLOW (md:col-span-3) */}
        <div className="md:col-span-3 flex min-h-0 flex-1 flex-col gap-6 bg-background rounded-2xl border border-border p-6 shadow-2xs">
          
          <div className="mb-2 shrink-0 border-b border-border/80 pb-4">
            <h1 className="m-0 text-3xl font-semibold tracking-tight text-foreground leading-tight">
              {step === 1 && 'Setup'}
              {step === 2 && messageSubStep === 'strategy' && 'Messages'}
              {step === 2 && messageSubStep === 'configure' && (useSameMessage ? 'Select a message' : 'Select messages')}
              {step === 3 && 'Review'}
            </h1>
            {step === 2 && messageSubStep === 'configure' && (
              <p className="mt-1.5 text-sm text-muted-foreground">
                {useSameMessage
                  ? `This message will be sent for all ${maxAttempts} follow-up${maxAttempts > 1 ? 's' : ''}.`
                  : `Choose a message for each follow-up.`}
              </p>
            )}
          </div>

          {/* STEP 1: Setup */}
          {step === 1 && (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden animate-fade-in">
              <div className="flex shrink-0 flex-col gap-8 pt-2 pr-1">
                {/* Follow-up details */}
                <div className="w-full space-y-4">
                  <h3 className="text-base font-bold text-foreground">Follow-up details</h3>
                  <div className="flex max-w-xl flex-col gap-2.5">
                    <Label htmlFor="followup-name" className="text-xs font-semibold text-foreground">
                      Name
                    </Label>
                    <Input
                      id="followup-name"
                      type="text"
                      placeholder="Enter name..."
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-10 text-sm font-semibold bg-background border border-neutral-300 dark:border-neutral-700 px-4"
                    />
                    <p className="text-[11px] text-muted-foreground leading-normal">
                      Give this follow-up a descriptive name to identify it later.
                    </p>
                  </div>
                </div>

                {/* Attempts + trigger schedule */}
                <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-8">
                {/* Left Column: Attempts settings (lg:col-span-5) */}
                <div className="w-full space-y-4 lg:col-span-5">
                  <h3 className="text-base font-bold text-foreground">Follow-up limit</h3>
                  
                  <div className="flex max-w-xs flex-col gap-2.5">
                    <Label htmlFor="max-attempts" className="text-xs font-semibold text-foreground">
                      Maximum follow-ups per customer
                    </Label>
                    <Select
                      value={String(maxAttempts)}
                      onValueChange={(val) => setMaxAttempts(Number(val))}
                    >
                      <SelectTrigger id="max-attempts" className="h-12 text-sm font-semibold bg-background border border-neutral-300 dark:border-neutral-700 px-4">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 10 }, (_, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>
                            {i + 1} attempt{i > 0 ? 's' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Right Column: Schedule settings (lg:col-span-7) */}
                <div className="w-full space-y-4 border-t border-border pt-6 lg:col-span-7 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
                  <h3 className="text-base font-bold text-foreground">Trigger schedule</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Initial Delay Dropdown */}
                    <div className="flex flex-col gap-2.5">
                      <Label htmlFor="trigger-delay" className="text-xs font-semibold text-foreground">
                        Start after
                      </Label>
                      <Select
                        value={String(triggerDelayHours)}
                        onValueChange={(val) => setTriggerDelayHours(Number(val))}
                      >
                        <SelectTrigger id="trigger-delay" className="h-12 text-sm font-semibold bg-background border border-neutral-300 dark:border-neutral-700 px-4">
                          <SelectValue placeholder="Select delay" />
                        </SelectTrigger>
                        <SelectContent>
                          {DELAY_OPTIONS.map((opt) => (
                            <SelectItem key={`trig-${opt.value}`} value={String(opt.value)}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Interval Frequency Dropdown */}
                    <div className="flex flex-col gap-2.5">
                      <Label htmlFor="interval-delay" className="text-xs font-semibold text-foreground">
                        Follow up every
                      </Label>
                      <Select
                        value={String(intervalHours)}
                        onValueChange={(val) => setIntervalHours(Number(val))}
                      >
                        <SelectTrigger id="interval-delay" className="h-12 text-sm font-semibold bg-background border border-neutral-300 dark:border-neutral-700 px-4">
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          {INTERVAL_OPTIONS.map((opt) => (
                            <SelectItem key={`int-${opt.value}`} value={String(opt.value)}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                </div>

                {/* Who to follow up with */}
                <div className="w-full space-y-4">
                  <h3 className="text-base font-bold text-foreground">Who to follow up with</h3>
                  <div className="flex max-w-xl flex-col gap-2.5">
                    <Label htmlFor="followup-audience" className="text-xs font-semibold text-foreground">
                      Select audiences
                    </Label>
                    <MultiSelect
                      value={selectedAudience}
                      onValueChange={setSelectedAudience}
                      groups={audienceSelectGroups}
                      placeholder="Select lead temperatures and tags..."
                      searchPlaceholder="Search lead temperatures or tags..."
                      triggerClassName="h-12"
                      emptyLabel="No matching audiences found."
                    />
                    {selectedAudience.length > 0 && (
                      <p className="text-[11px] font-semibold text-foreground">
                        {candidates === undefined
                          ? 'Calculating matching customers...'
                          : `${filteredCandidatesCount} customer${filteredCandidatesCount === 1 ? '' : 's'} match`}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-auto flex shrink-0 flex-col gap-6 pt-6">
              {/* Dynamic Summary Sentence Card */}
              <div className="bg-zinc-50 dark:bg-zinc-900/30 border border-border/80 rounded-xl p-5 shadow-2xs">
                <p className="m-0 text-sm text-muted-foreground leading-relaxed animate-fade-in">
                  This follow-up sends up to <strong className="text-base font-semibold text-foreground bg-primary/5 dark:bg-primary/10 px-1.5 py-0.5 rounded-md mx-0.5">{maxAttempts} follow-up message{maxAttempts > 1 ? 's' : ''}</strong> to the customer. It starts <strong className="text-base font-semibold text-foreground bg-primary/5 dark:bg-primary/10 px-1.5 py-0.5 rounded-md mx-0.5">{DELAY_OPTIONS.find(opt => opt.value === triggerDelayHours)?.label ?? `${triggerDelayHours} hours`}</strong> after the last message and will reattempt every <strong className="text-base font-semibold text-foreground bg-primary/5 dark:bg-primary/10 px-1.5 py-0.5 rounded-md mx-0.5">{INTERVAL_OPTIONS.find(opt => opt.value === intervalHours)?.label ?? `${intervalHours} hours`}</strong>.
                </p>
              </div>

              <div className="flex justify-end border-t border-border pt-5">
                <Button
                  type="button"
                  onClick={() => {
                    if (!name.trim()) {
                      toast.error('Please enter a name for this follow-up.');
                      return;
                    }
                    if (selectedAudience.length === 0) {
                      toast.error('Please select who to follow up with.');
                      return;
                    }
                    setMessageSubStep('strategy');
                    setStep(2);
                  }}
                  className="gap-2 cursor-pointer h-10 px-5 font-bold transition-all active:scale-[0.98]"
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              </div>
              </div>
            </div>
          )}

          {/* STEP 2: Messages */}
          {step === 2 && messageSubStep === 'strategy' && (
            <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden animate-fade-in justify-between">
              <div className="flex min-h-0 flex-1 flex-col gap-6 pt-2">
                <p className="text-sm text-muted-foreground">
                  How do you want to message customers who haven&apos;t replied?
                </p>

                <div className="grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setUseSameMessage(true);
                      setActivePreviewIndex(0);
                      setTemplateSearchQuery('');
                      setMessageSubStep('configure');
                    }}
                    className={cn(
                      'flex flex-col items-start gap-3 rounded-2xl border p-6 text-left transition-colors',
                      'border-border bg-zinc-50/80 hover:border-neutral-400 dark:bg-zinc-900/20 dark:hover:border-neutral-600',
                    )}
                  >
                    <div className="flex size-10 items-center justify-center rounded-xl border border-border bg-background text-foreground">
                      <Repeat className="size-5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-base font-semibold text-foreground">Same message</h4>
                      <p className="text-sm text-muted-foreground">
                        Send one template every time.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setUseSameMessage(false);
                      setActivePreviewIndex(0);
                      setTemplateSearchQuery('');
                      setMessageSubStep('configure');
                    }}
                    className={cn(
                      'flex flex-col items-start gap-3 rounded-2xl border p-6 text-left transition-colors',
                      'border-border bg-zinc-50/80 hover:border-neutral-400 dark:bg-zinc-900/20 dark:hover:border-neutral-600',
                    )}
                  >
                    <div className="flex size-10 items-center justify-center rounded-xl border border-border bg-background text-foreground">
                      <ListOrdered className="size-5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-base font-semibold text-foreground">Different messages</h4>
                      <p className="text-sm text-muted-foreground">
                        Use a new template for each follow-up.
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              <div className="flex shrink-0 justify-between border-t border-border pt-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="h-10 gap-2 px-4 font-bold transition-all active:scale-[0.98] cursor-pointer"
                >
                  <ChevronLeft className="size-4" />
                  Back
                </Button>
              </div>
            </div>
          )}

          {step === 2 && messageSubStep === 'configure' && useSameMessage && (
            <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden animate-fade-in justify-between">
              <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-hidden lg:grid-cols-12 lg:items-stretch">
                <div className="flex h-full min-h-0 flex-col overflow-hidden lg:col-span-7">
                  <TemplatePickerPanel
                    filteredTemplates={filteredTemplates}
                    templatesLoading={templatesLoading}
                    templateSearchQuery={templateSearchQuery}
                    onTemplateSearchQueryChange={setTemplateSearchQuery}
                    selectedKey={singleTemplateKey}
                    onSelect={setSingleTemplateKey}
                    agentId={agentId}
                  />
                </div>
                <div className="flex h-full min-h-0 flex-col items-center justify-start lg:col-span-5">
                  <WhatsAppTemplatePreview
                    templateName={selectedAttemptTemplate?.name}
                    components={selectedAttemptTemplate?.components}
                    isLoading={templatesLoading}
                    emptyMessage="Select a template to preview"
                    className="max-w-[360px]"
                  />
                </div>
              </div>

              <div className="flex shrink-0 justify-between border-t border-border pt-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMessageSubStep('strategy')}
                  className="h-10 gap-2 px-4 font-bold transition-all active:scale-[0.98] cursor-pointer"
                >
                  <ChevronLeft className="size-4" />
                  Back
                </Button>
                <Button
                  type="button"
                  disabled={!singleTemplateKey || attempts.some((a) => !a.templateName)}
                  onClick={() => setStep(3)}
                  className="h-10 gap-2 px-5 font-bold transition-all active:scale-[0.98] cursor-pointer"
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && messageSubStep === 'configure' && !useSameMessage && (
            <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden animate-fade-in justify-between">
              <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-hidden lg:grid-cols-12 lg:items-stretch">
                <div className="flex h-full min-h-0 flex-col overflow-hidden lg:col-span-7">
                  <p className="mb-3 shrink-0 text-sm font-semibold text-foreground">Follow-up</p>
                  <div className="mb-4 flex flex-wrap justify-start gap-3">
                    {attempts.map((att, index) => {
                      const isActive = activePreviewIndex === index;
                      const isComplete = Boolean(att.templateName);
                      return (
                        <button
                          key={att.attemptNumber}
                          type="button"
                          onClick={() => {
                            setActivePreviewIndex(index);
                            setTemplateSearchQuery('');
                          }}
                          className={cn(
                            'flex size-14 items-center justify-center rounded-lg border-2 transition-colors',
                            isComplete
                              ? 'border-emerald-800 bg-emerald-800 dark:border-emerald-900 dark:bg-emerald-900'
                              : isActive
                                ? 'border-foreground bg-zinc-100 dark:bg-zinc-900/40'
                                : 'border-border bg-background hover:border-neutral-400 dark:hover:border-neutral-600',
                          )}
                        >
                          {isComplete ? (
                            <Check className="size-5 text-white" strokeWidth={2.5} />
                          ) : (
                            <span
                              className={cn(
                                'text-sm font-semibold',
                                isActive ? 'text-foreground' : 'text-muted-foreground',
                              )}
                            >
                              {att.attemptNumber}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <TemplatePickerPanel
                    filteredTemplates={filteredTemplates}
                    templatesLoading={templatesLoading}
                    templateSearchQuery={templateSearchQuery}
                    onTemplateSearchQueryChange={setTemplateSearchQuery}
                    selectedKey={
                      attempts[activePreviewIndex]?.templateName
                        ? `${attempts[activePreviewIndex].templateName}\t${attempts[activePreviewIndex].templateLanguage}`
                        : ''
                    }
                    onSelect={(key) => handleSelectTemplateForAttempt(activePreviewIndex, key)}
                    agentId={agentId}
                  />
                </div>

                <div className="flex h-full min-h-0 flex-col items-center justify-start lg:col-span-5">
                  <WhatsAppTemplatePreview
                    templateName={selectedAttemptTemplate?.name}
                    components={selectedAttemptTemplate?.components}
                    isLoading={templatesLoading}
                    emptyMessage="Select a template to preview"
                    className="max-w-[360px]"
                  />
                </div>
              </div>

              <div className="flex shrink-0 justify-between border-t border-border pt-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMessageSubStep('strategy')}
                  className="h-10 gap-2 px-4 font-bold transition-all active:scale-[0.98] cursor-pointer"
                >
                  <ChevronLeft className="size-4" />
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={handleDifferentMessagesNext}
                  className="h-10 gap-2 px-5 font-bold transition-all active:scale-[0.98] cursor-pointer"
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}


          {/* STEP 3: Review */}
          {step === 3 && (
            <div className="flex min-h-0 flex-1 flex-col justify-between gap-4 overflow-hidden animate-fade-in">
              <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-hidden lg:grid-cols-12 lg:items-start">
                <div className="flex flex-col gap-10 lg:col-span-7">
                  <section className="flex flex-col gap-3">
                    <h3 className="m-0 border-b border-border pb-2 text-xs font-bold text-muted-foreground">
                      Summary
                    </h3>
                    <div className="grid gap-2 text-sm">
                      <div className="flex items-baseline justify-between gap-4 border-b border-dashed border-border/60 pb-1.5">
                        <span className="shrink-0 text-muted-foreground">Name</span>
                        <span className="truncate text-foreground">{name}</span>
                      </div>
                      <div className="flex items-baseline justify-between gap-4 border-b border-dashed border-border/60 pb-1.5">
                        <span className="shrink-0 text-muted-foreground">WhatsApp Channel</span>
                        <span className="flex items-center gap-1.5 truncate text-foreground">
                          <SiWhatsapp className="size-3.5 shrink-0 text-[#25D366]" />
                          {(() => {
                            const ch = whatsappChannels.find((c) => c._id === channelId);
                            return ch ? (ch.displayPhoneNumber ?? ch.phoneNumberId ?? 'WhatsApp') : 'WhatsApp';
                          })()}
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-4 border-b border-dashed border-border/60 pb-1.5">
                        <span className="shrink-0 text-muted-foreground">Audience</span>
                        <div className="flex flex-wrap items-center justify-end gap-1">
                          {selectedLeadTemperatures.map((temp) => {
                            const style = getLeadTemperatureStyle(temp);
                            const Icon = style.icon;
                            return (
                              <span
                                key={temp}
                                className={cn(
                                  'inline-flex h-5 items-center gap-1 rounded-full px-2 py-0 text-[10px] font-semibold leading-none',
                                  style.bg,
                                  style.text,
                                )}
                              >
                                <Icon className={cn('size-2.5 shrink-0', style.iconClass)} />
                                {temp}
                              </span>
                            );
                          })}
                          {selectedAudienceTags.map((tag) => {
                            const tagStyle = getTagColorClass(tag);
                            return (
                              <span
                                key={tag}
                                className={cn(
                                  'inline-flex h-5 items-center gap-1 rounded-full px-2 py-0 text-[10px] font-semibold leading-none',
                                  tagStyle.bg,
                                  tagStyle.text,
                                )}
                              >
                                <span className={cn('size-1.5 shrink-0 rounded-full', tagStyle.dot)} />
                                {tag}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex items-baseline justify-between gap-4 border-b border-dashed border-border/60 pb-1.5">
                        <span className="shrink-0 text-muted-foreground">First follow-up starts</span>
                        <span className="text-right text-foreground">
                          {DELAY_OPTIONS.find((opt) => opt.value === triggerDelayHours)?.label ?? `${triggerDelayHours} hours`} after no reply
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between gap-4 border-b border-dashed border-border/60 pb-1.5">
                        <span className="shrink-0 text-muted-foreground">Follow-up interval</span>
                        <span className="text-foreground">
                          Every {INTERVAL_OPTIONS.find(opt => opt.value === intervalHours)?.label ?? `${intervalHours} hours`}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between gap-4 border-b border-dashed border-border/60 pb-1.5">
                        <span className="shrink-0 text-muted-foreground">Maximum follow-ups</span>
                        <span className="text-foreground">{maxAttempts}</span>
                      </div>
                      <div className="flex items-baseline justify-between gap-4 border-b border-dashed border-border/60 pb-1.5">
                        <span className="shrink-0 text-muted-foreground">Message strategy</span>
                        <span className="text-right text-foreground">
                          {useSameMessage ? 'Same message' : 'Different messages'}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between gap-4 pt-0.5">
                        <span className="font-semibold text-foreground">Est. cost per customer</span>
                        <span className="font-semibold text-foreground">
                          {attempts.some((att) => !att.templateName)
                            ? '—'
                            : `RM ${estimatedCostPerCustomer.toFixed(2)}`}
                        </span>
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

                      <div className="flex items-center justify-between gap-4 border-t border-border/60 pt-2">
                        <span className="text-[11px] text-muted-foreground">Start sending follow-ups right away</span>
                        <Switch
                          checked={isActiveOnCreate}
                          onCheckedChange={handleActiveOnCreateChange}
                          aria-label="Start sending follow-ups right away"
                          className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-input"
                        />
                      </div>
                    </div>
                    {showMessageRequiredError && !messagesReady && (
                      <p className="text-[11px] font-semibold text-destructive">
                        {FOLLOW_UP_MESSAGE_REQUIRED_ERROR}
                      </p>
                    )}
                    {showChecklistError && (
                      <p className="text-[11px] font-semibold text-destructive animate-fade-in">
                        Please confirm all checklist items before creating this follow-up.
                      </p>
                    )}
                  </section>
                </div>

                <section className="flex flex-col gap-3 lg:col-span-5">
                  <h3 className="m-0 border-b border-border pb-2 text-xs font-bold text-muted-foreground">
                    Message Preview
                  </h3>
                  <WhatsAppTemplatePreview
                    templateName={attempts[0]?.templateName}
                    components={
                      templates.find(
                        (t) =>
                          t.name === attempts[0]?.templateName &&
                          t.language === attempts[0]?.templateLanguage,
                      )?.components
                    }
                    isLoading={templatesLoading}
                    emptyMessage="No template selected"
                    className="max-w-[360px]"
                  />
                </section>
              </div>

              <div className="flex shrink-0 justify-between border-t border-border pt-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(2)}
                  disabled={submitting}
                  className="h-10 gap-2 px-4 font-bold transition-all active:scale-[0.98] cursor-pointer"
                >
                  <ChevronLeft className="size-4" />
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className={cn(
                    'h-10 gap-2 px-6 font-bold bg-primary text-primary-foreground shadow-md transition-all active:scale-[0.98] hover:bg-primary-hover cursor-pointer',
                    (!balanceChecked || !insufficientBalanceUnderstood) && 'cursor-not-allowed opacity-50 hover:bg-primary',
                  )}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create follow-up'
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </PlanFeatureGate>
  );
}
