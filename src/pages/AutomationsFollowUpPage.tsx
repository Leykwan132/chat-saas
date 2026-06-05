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
  Pencil,
  Plus,
} from 'lucide-react';
import { SiWhatsapp } from 'react-icons/si';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getLeadTemperatureStyle, type LeadTemperature } from '@/lib/leadTemperature';
import { getWhatsAppRateForCategory } from '@/lib/whatsappRates';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { MultiSelect, type MultiSelectGroup } from '@/components/ui/multi-select';

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


export default function AutomationsFollowUpPage() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const typedAgentId = agentId as Id<'agents'> | undefined;

  const [step, setStep] = useState(1);
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
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [templateSearchQuery, setTemplateSearchQuery] = useState('');

  // Pre-flight billing checklist states
  const [balanceChecked, setBalanceChecked] = useState(false);
  const [insufficientBalanceUnderstood, setInsufficientBalanceUnderstood] = useState(false);
  const [showChecklistError, setShowChecklistError] = useState(false);
  const [isActiveOnCreate, setIsActiveOnCreate] = useState(true);

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

  const selectedTemplateBodyText = useMemo(() => {
    if (!selectedAttemptTemplate) return '';
    const bodyComp = selectedAttemptTemplate.components?.find((c: any) => c.type === 'BODY');
    return bodyComp?.text ?? 'No body text content preview available.';
  }, [selectedAttemptTemplate]);



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

  const handleSubmit = async () => {
    if (!channelId) {
      toast.error('Please select a WhatsApp channel.');
      return;
    }
    if (selectedAudience.length === 0) {
      toast.error('Please select who to follow up with.');
      return;
    }

    const invalidAttempts = attempts.filter((att) => !att.templateName);
    if (invalidAttempts.length > 0) {
      toast.error('Please select a template for all attempts.');
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
    );
  }

  return (
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
              {step === 2 && 'Messages'}
              {step === 3 && 'Review'}
            </h1>
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
          {step === 2 && (
            <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden animate-fade-in justify-between">
              
              {/* Option for same or different messages */}
              <div className="flex flex-col gap-3.5 max-w-xl shrink-0">
                <RadioGroup
                  value={useSameMessage ? 'same' : 'different'}
                  onValueChange={(val) => setUseSameMessage(val === 'same')}
                  className="flex flex-col gap-4 w-full"
                >
                  {/* Option 1: Same message */}
                  <div className="flex items-start gap-3.5 group">
                    <RadioGroupItem
                      value="same"
                      id="strategy-same"
                      className="mt-4 shrink-0 focus:ring-primary cursor-pointer"
                    />
                    <Label
                      htmlFor="strategy-same"
                      className="flex-1 cursor-pointer font-normal"
                    >
                      <div className={cn(
                        "flex flex-col justify-between rounded-2xl border p-4.5 transition-all duration-200 select-none shadow-2xs hover:shadow-xs",
                        useSameMessage
                          ? "border-primary bg-primary/5 dark:bg-primary/950/10 ring-1 ring-primary/20"
                          : "border-border bg-card hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50/50 dark:hover:bg-neutral-900/50"
                      )}>
                        <div>
                          <h4 className="font-semibold text-base text-foreground leading-snug">
                            Same message
                          </h4>
                          <p className="text-xs text-muted-foreground font-normal mt-1 leading-normal">
                            Use one message for all of the follow-ups.
                          </p>
                          {useSameMessage && (
                            <div
                              className="mt-4 pt-4 border-t border-dashed border-border/80 flex flex-col gap-2.5 animate-in fade-in duration-200"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center gap-4">
                                <span className="text-xs font-semibold text-foreground w-24 shrink-0">
                                  Follow up
                                </span>
                                <div className="flex items-center gap-3">
                                  {!attempts[0]?.templateName ? (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActivePreviewIndex(0);
                                        setCustomizeOpen(true);
                                      }}
                                      className="text-xs font-semibold cursor-pointer h-9 px-3 bg-background hover:bg-muted"
                                    >
                                      Select message
                                    </Button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActivePreviewIndex(0);
                                        setCustomizeOpen(true);
                                      }}
                                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-muted/60 hover:bg-muted text-xs font-semibold text-foreground hover:text-primary transition-all cursor-pointer font-mono"
                                    >
                                      <span className="truncate max-w-[240px]" title={attempts[0].templateName}>
                                        {attempts[0].templateName}
                                      </span>
                                      <Pencil className="size-3 text-muted-foreground shrink-0" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </Label>
                  </div>

                  {/* Option 2: Different message */}
                  <div className="flex items-start gap-3.5 group">
                    <RadioGroupItem
                      value="different"
                      id="strategy-different"
                      className="mt-4 shrink-0 focus:ring-primary cursor-pointer"
                    />
                    <Label
                      htmlFor="strategy-different"
                      className="flex-1 cursor-pointer font-normal"
                    >
                      <div className={cn(
                        "flex flex-col justify-between rounded-2xl border p-4.5 transition-all duration-200 select-none shadow-2xs hover:shadow-xs",
                        !useSameMessage
                          ? "border-primary bg-primary/5 dark:bg-primary/950/10 ring-1 ring-primary/20"
                          : "border-border bg-card hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50/50 dark:hover:bg-neutral-900/50"
                      )}>
                        <div>
                          <h4 className="font-semibold text-base text-foreground leading-snug">
                            Different message
                          </h4>
                          <p className="text-xs text-muted-foreground font-normal mt-1 leading-normal">
                            Use multiple messages for different steps.
                          </p>
                          {!useSameMessage && (
                            <div
                              className="mt-4 pt-4 border-t border-dashed border-border/80 flex flex-col gap-3 animate-in fade-in duration-200"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {attempts.map((att, index) => (
                                <div key={att.attemptNumber} className="flex items-center gap-4">
                                  <span className="text-xs font-semibold text-foreground w-24 shrink-0">
                                    Follow up {att.attemptNumber}
                                  </span>
                                  <div className="flex items-center gap-3">
                                    {!att.templateName ? (
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActivePreviewIndex(index);
                                          setCustomizeOpen(true);
                                        }}
                                        className="text-xs font-semibold cursor-pointer h-9 px-3 bg-background hover:bg-muted"
                                      >
                                        Select message
                                      </Button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActivePreviewIndex(index);
                                          setCustomizeOpen(true);
                                        }}
                                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-muted/60 hover:bg-muted text-xs font-semibold text-foreground hover:text-primary transition-all cursor-pointer font-mono"
                                      >
                                        <span className="truncate max-w-[240px]" title={att.templateName}>
                                          {att.templateName}
                                        </span>
                                        <Pencil className="size-3 text-muted-foreground shrink-0" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Wizard control buttons */}
              <div className="mt-8 flex shrink-0 justify-between border-t border-border pt-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="gap-2 cursor-pointer h-10 px-4 font-bold transition-all active:scale-[0.98]"
                >
                  <ChevronLeft className="size-4" />
                  Back
                </Button>
                <Button
                  type="button"
                  disabled={attempts.some(a => !a.templateName) || attempts.length === 0}
                  onClick={() => setStep(3)}
                  className="gap-2 cursor-pointer h-10 px-5 font-bold transition-all active:scale-[0.98]"
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}


          {/* STEP 3: Review */}
          {step === 3 && (
            <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden animate-fade-in justify-between">
              <div className="flex min-h-0 flex-1 flex-col pr-1">
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <div className="flex flex-col gap-4">
                    <h3 className="m-0 text-xs font-bold text-muted-foreground border-b border-border pb-2.5">
                      Summary
                    </h3>

                    <div className="grid gap-3.5 text-sm">
                      <div className="flex justify-between items-baseline border-b border-dashed border-border/60 pb-2">
                        <span className="text-muted-foreground">Name</span>
                        <span className="text-foreground font-semibold truncate max-w-[240px]">{name}</span>
                      </div>
                      <div className="flex justify-between items-baseline border-b border-dashed border-border/60 pb-2">
                        <span className="text-muted-foreground">WhatsApp Channel</span>
                        <span className="text-foreground font-semibold flex items-center gap-1.5">
                          <SiWhatsapp className="size-3.5 text-[#25D366]" />
                          {(() => {
                            const ch = whatsappChannels.find(c => c._id === channelId);
                            return ch ? (ch.displayPhoneNumber ?? ch.phoneNumberId ?? 'WhatsApp') : 'WhatsApp';
                          })()}
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline border-b border-dashed border-border/60 pb-2">
                        <span className="text-muted-foreground">First follow-up starts</span>
                        <span className="text-foreground font-semibold">
                          {DELAY_OPTIONS.find(opt => opt.value === triggerDelayHours)?.label ?? `${triggerDelayHours} hours`} after no reply
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline border-b border-dashed border-border/60 pb-2">
                        <span className="text-muted-foreground">Follow-up interval</span>
                        <span className="text-foreground font-semibold">
                          Every {INTERVAL_OPTIONS.find(opt => opt.value === intervalHours)?.label ?? `${intervalHours} hours`}
                        </span>
                      </div>
                      <div className="flex justify-between items-start gap-4 border-b border-dashed border-border/60 pb-2">
                        <span className="text-muted-foreground shrink-0">Who to follow up with</span>
                        <div className="flex flex-wrap items-center gap-1.5 justify-end">
                          {selectedLeadTemperatures.map((temp) => {
                            const style = getLeadTemperatureStyle(temp);
                            const Icon = style.icon;
                            return (
                              <span
                                key={temp}
                                className={cn(
                                  'inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 py-0 text-[10px] font-semibold leading-none',
                                  style.bg,
                                  style.text,
                                )}
                              >
                                <Icon className={cn('size-3 shrink-0', style.iconClass)} />
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
                                'inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 py-0 text-[10px] font-semibold leading-none',
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
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 mt-6">
                    <h3 className="m-0 text-xs font-bold text-muted-foreground border-b border-border pb-2.5">
                      Estimated cost
                    </h3>
                    <div className="grid gap-3.5 text-sm">
                      <div className="flex justify-between items-baseline border-b border-dashed border-border/60 pb-2">
                        <span className="text-muted-foreground">Maximum follow-ups per customer</span>
                        <span className="text-foreground font-semibold">{maxAttempts}</span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-muted-foreground">Estimated cost per customer</span>
                        <span className="text-foreground font-semibold">
                          {attempts.some((att) => !att.templateName)
                            ? '—'
                            : `RM ${estimatedCostPerCustomer.toFixed(2)}`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pre-Flight Checklist */}
                <div className="mt-6 flex shrink-0 flex-col gap-4">
                    <h3 className="m-0 text-xs font-bold text-muted-foreground border-b border-border pb-2.5">
                      Pre-Flight Checklist
                    </h3>
                    <div className="flex flex-col gap-2.5">
                      <div
                        onClick={() => {
                          const nextVal = !balanceChecked;
                          setBalanceChecked(nextVal);
                          if (nextVal && insufficientBalanceUnderstood) {
                            setShowChecklistError(false);
                          }
                        }}
                        className="flex items-center gap-2 cursor-pointer select-none text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <div className={cn(
                          "flex size-3.5 items-center justify-center rounded-sm border transition-all duration-150 shrink-0",
                          balanceChecked
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-neutral-300 dark:border-neutral-700 bg-background"
                        )}>
                          {balanceChecked && <Check className="size-2.5 stroke-[3]" />}
                        </div>
                        <span>
                          My Meta billing balance has sufficient funds.
                        </span>
                      </div>

                      <div
                        onClick={() => {
                          const nextVal = !insufficientBalanceUnderstood;
                          setInsufficientBalanceUnderstood(nextVal);
                          if (balanceChecked && nextVal) {
                            setShowChecklistError(false);
                          }
                        }}
                        className="flex items-center gap-2 cursor-pointer select-none text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <div className={cn(
                          "flex size-3.5 items-center justify-center rounded-sm border transition-all duration-150 shrink-0",
                          insufficientBalanceUnderstood
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-neutral-300 dark:border-neutral-700 bg-background"
                        )}>
                          {insufficientBalanceUnderstood && <Check className="size-2.5 stroke-[3]" />}
                        </div>
                        <span>
                          I acknowledge that insufficient funds will cause delivery failure.
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4 border-t border-border/60 pt-3">
                        <span className="text-[11px] text-muted-foreground">
                          Start sending follow-ups right away
                        </span>
                        <Switch
                          checked={isActiveOnCreate}
                          onCheckedChange={setIsActiveOnCreate}
                          aria-label="Start sending follow-ups right away"
                          className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-input"
                        />
                      </div>
                    </div>
                    {showChecklistError && (
                      <p className="text-[11px] text-destructive font-semibold mt-1 animate-fade-in">
                        Please confirm all checklist items before creating this follow-up.
                      </p>
                    )}
                </div>
              </div>

              {/* Wizard Control Actions */}
              <div className="flex shrink-0 justify-between border-t border-border pt-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(2)}
                  disabled={submitting}
                  className="gap-2 cursor-pointer h-10 px-4 font-bold transition-all active:scale-[0.98]"
                >
                  <ChevronLeft className="size-4" />
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className={cn(
                    "gap-2 cursor-pointer h-10 px-6 font-bold bg-primary hover:bg-primary-hover text-primary-foreground shadow-md transition-all active:scale-[0.98]",
                    (!balanceChecked || !insufficientBalanceUnderstood) && "opacity-50 cursor-not-allowed hover:bg-primary"
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

      {/* CUSTOMIZE MESSAGE DIALOG */}
      <Dialog open={customizeOpen} onOpenChange={setCustomizeOpen}>
        <DialogContent className="sm:max-w-[1200px] w-[95vw] bg-white dark:bg-[#121212] border border-border/60 p-6 rounded-3xl overflow-hidden flex flex-col h-[800px] max-h-[92vh]">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-lg font-semibold text-foreground">Customize messages</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Select the WhatsApp messages to use for your follow-up sequence.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1 min-h-0 items-stretch overflow-hidden py-4 text-left">
            {/* Left Column: Messages cards selection (md:col-span-8) */}
            <div className="md:col-span-8 flex flex-col gap-4 overflow-hidden h-full">


              {/* Header with Title and Create Template Link */}
              <div className="flex items-center justify-between shrink-0">
                <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Select message
                </span>
                <Link
                  to={channelId ? `/dashboard/${agentId}/channels/${channelId}/templates` : `/dashboard/${agentId}/templates`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 hover:underline transition-all"
                >
                  <Plus className="size-3" />
                  Create template
                </Link>
              </div>

              {/* Search input (always visible inside dialogue) */}
              <div className="relative shrink-0">
                <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search message templates..."
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

              {/* Cards List container */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 min-h-0">
                {templatesLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredTemplates.length === 0 ? (
                  <div className="text-center py-10 text-xs text-muted-foreground">
                    No message templates found.
                  </div>
                ) : (
                  filteredTemplates.map((t) => {
                    const isSelected = useSameMessage
                      ? singleTemplateKey === `${t.name}\t${t.language}`
                      : attempts[activePreviewIndex]?.templateName === t.name &&
                        attempts[activePreviewIndex]?.templateLanguage === t.language;
                    return (
                      <div
                        key={`${t.name}-${t.language}`}
                        onClick={() => {
                          const key = `${t.name}\t${t.language}`;
                          if (useSameMessage) {
                            setSingleTemplateKey(key);
                          } else {
                            handleSelectTemplateForAttempt(activePreviewIndex, key);
                          }
                        }}
                        className={cn(
                          "relative flex items-center justify-between rounded-xl border p-4 cursor-pointer text-left transition-all hover:shadow-2xs active:scale-[0.99] gap-4",
                          isSelected
                            ? 'border-foreground bg-zinc-50 dark:bg-zinc-900/30'
                            : 'border-border bg-background hover:border-border-hover hover:border-neutral-300'
                        )}
                      >
                        <div className="flex-1 min-w-0 font-normal">
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
                  })
                )}
              </div>
            </div>

            {/* Right Column: WhatsApp Speech Preview (md:col-span-4) */}
            <div className="md:col-span-4 flex flex-col h-full min-h-0 items-center justify-start">
              <div className="flex min-h-0 flex-1 w-full max-w-[360px] flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
                <div className="bg-[#075e54] text-white px-3.5 py-2.5 flex items-center gap-2 shrink-0">
                  <div className="flex size-7 items-center justify-center rounded-full bg-white/20">
                    <Megaphone className="size-3.5" />
                  </div>
                  <div>
                    <span className="text-2xs font-semibold block leading-tight">
                      {useSameMessage ? 'Message Preview' : `Attempt ${activePreviewIndex + 1} Preview`}
                    </span>
                    <span className="text-[9px] text-white/70 block leading-tight">
                      WhatsApp Message Preview
                    </span>
                  </div>
                </div>

                <div
                  className="flex-1 p-3 flex flex-col justify-start bg-[#efeae2] relative overflow-y-auto min-h-[220px]"
                  style={{
                    backgroundImage: `url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'repeat',
                  }}
                >
                  {selectedAttemptTemplate ? (
                    <div className="max-w-[90%] bg-white rounded-lg rounded-tl-none p-3 shadow-xs border border-black/5 relative self-start mt-2 animate-fade-in">
                      {/* Arrow tail */}
                      <div className="absolute left-0 top-0 -translate-x-1.5 border-r-[8px] border-r-white border-b-[8px] border-b-transparent border-t-[8px] border-t-transparent" />

                      <p className="m-0 text-[11px] font-normal text-slate-800 whitespace-pre-wrap leading-relaxed break-words">
                        {selectedTemplateBodyText}
                      </p>

                      <div className="text-[8px] text-slate-400 text-right mt-1.5 block select-none">
                        Preview · {selectedAttemptTemplate.name}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-center p-4">
                      <p className="text-xs text-muted-foreground font-medium bg-white/80 dark:bg-black/60 rounded-lg px-3 py-2 border border-black/5 backdrop-blur-xs">
                        Select a message template to view preview
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-2 shrink-0">
            <Button onClick={() => setCustomizeOpen(false)} className="w-full sm:w-auto rounded-xl">
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
