import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { useMutation, useQuery } from 'convex/react';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Pencil,
  LayoutList,
  History,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { SiWhatsapp } from 'react-icons/si';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { WhatsAppTemplatePreview } from '@/components/WhatsAppTemplatePreview';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePermissions } from '@/hooks/usePermissions';
import { Permission } from '../../shared/permissions';
import { cn } from '@/lib/utils';
import { getLeadTemperatureStyle, type LeadTemperature } from '@/lib/leadTemperature';
import { getWhatsAppRateForCategory } from '@/lib/whatsappRates';
import {
  formatEstimatedCostSoFar,
  formatReplyRate,
  hoursToLabel,
} from '@/lib/whatsappAutomationMetrics';
import { MultiSelect, type MultiSelectGroup } from '@/components/ui/multi-select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DetailPageActionFooter } from '@/components/automation/DetailPageActionFooter';
import {
  DetailSectionHeading,
  DetailSectionNav,
  type DetailSectionTab,
} from '@/components/automation/DetailSectionNav';
import {
  FOLLOW_UP_MESSAGE_REQUIRED_ERROR,
  hasCompleteFollowUpMessages,
} from '../../shared/followUpMessageReadiness';

const FOLLOW_UP_DETAIL_TABS: DetailSectionTab[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: LayoutList,
  },
  {
    id: 'sent',
    label: 'Sent',
    icon: History,
  },
];

function followUpSendStatusBadgeClass(label: string): {
  badge: string;
  dot: string;
} {
  if (label === 'Delivered') {
    return {
      badge:
        'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
      dot: 'bg-emerald-500',
    };
  }
  if (label === 'Failed') {
    return {
      badge: 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400',
      dot: 'bg-rose-500',
    };
  }
  if (label === 'Sent') {
    return {
      badge: 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400',
      dot: 'bg-blue-500',
    };
  }
  return {
    badge: 'bg-muted/40 border-border text-muted-foreground',
    dot: 'bg-neutral-500',
  };
}

const DELAY_OPTIONS = [
  { label: '1 day', value: 24 },
  { label: '2 days', value: 48 },
  { label: '3 days', value: 72 },
  { label: '5 days', value: 120 },
  { label: '7 days', value: 168 },
];

const FOLLOW_UP_SELECT_TRIGGER_CLASS =
  'h-12 text-sm font-semibold bg-background border border-neutral-300 dark:border-neutral-700 px-4';

type AttemptRow = {
  attemptNumber: number;
  templateName: string;
  templateLanguage: string;
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

function ruleToAudienceValues(rule: {
  audienceLeadTemperatures: LeadTemperature[];
  audienceTags?: string[];
}): string[] {
  const leads = rule.audienceLeadTemperatures.map((t) => `lead:${t}`);
  const tags = (rule.audienceTags ?? []).map((t) => `tag:${t}`);
  return [...leads, ...tags];
}

function channelLabel(ch: {
  displayPhoneNumber?: string;
  phoneNumberId?: string;
  wabaId?: string;
}): string {
  return ch.displayPhoneNumber ?? ch.phoneNumberId ?? ch.wabaId ?? 'WhatsApp';
}

function ruleUsesSameMessage(attempts: AttemptRow[]): boolean {
  const first = attempts[0];
  if (!first?.templateName) return false;
  return attempts.every(
    (a) =>
      a.templateName === first.templateName &&
      a.templateLanguage === first.templateLanguage,
  );
}

export default function FollowUpDetailPage() {
  const { agentId, ruleId } = useParams();
  const typedAgentId = agentId as Id<'agents'> | undefined;
  const typedRuleId = ruleId as Id<'followUpRules'> | undefined;

  const { can } = usePermissions();
  const canManage = can(Permission.FOLLOWUPS_MANAGE);
  const rule = useQuery(
    api.whatsappFollowUp.getFollowUpRule,
    typedRuleId ? { id: typedRuleId } : 'skip',
  );
  const sentRows = useQuery(
    api.whatsappFollowUp.listFollowUpSendsForRule,
    typedRuleId ? { ruleId: typedRuleId } : 'skip',
  );
  const channels = useQuery(api.channels.listForCurrentOrg, {});
  const candidates = useQuery(
    api.customers.listForAgentBroadcast,
    typedAgentId ? { agentId: typedAgentId } : 'skip',
  );
  const updateRule = useMutation(api.whatsappFollowUp.updateFollowUpRule);
  const setRuleActive = useMutation(api.whatsappFollowUp.setFollowUpRuleActive);
  const [activeTab, setActiveTab] = useState('overview');
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);
  const [useSameMessage, setUseSameMessage] = useState(true);
  const [initialUseSameMessage, setInitialUseSameMessage] = useState(true);
  const [singleTemplateKey, setSingleTemplateKey] = useState('');
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [templateSearchQuery, setTemplateSearchQuery] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [activeConfirmOpen, setActiveConfirmOpen] = useState(false);
  const [pendingActive, setPendingActive] = useState<boolean | null>(null);
  const [activeChangeBusy, setActiveChangeBusy] = useState(false);
  const [showMessageRequiredError, setShowMessageRequiredError] = useState(false);

  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [triggerDelayHours, setTriggerDelayHours] = useState(24);
  const [intervalHours, setIntervalHours] = useState(24);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [selectedAudience, setSelectedAudience] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const messagesReady = hasCompleteFollowUpMessages(attempts);
  // Suppresses the attempts-rebuild effects while applyRuleToForm is setting
  // state, preventing a false-dirty on initial load and reset.
  const isApplyingRef = useRef(false);

  const applyRuleToForm = useCallback((source: NonNullable<typeof rule>) => {
    isApplyingRef.current = true;
    // Clear the flag after React has flushed the state updates and run effects.
    setTimeout(() => { isApplyingRef.current = false; }, 0);
    setName(source.name);
    setIsActive(source.isActive);
    setTriggerDelayHours(source.triggerDelayHours);
    setIntervalHours(source.intervalHours);
    setMaxAttempts(source.maxAttempts);
    setAttempts(source.attempts);
    setSelectedAudience(ruleToAudienceValues(source));
    const sameMessage = ruleUsesSameMessage(source.attempts);
    setUseSameMessage(sameMessage);
    setInitialUseSameMessage(sameMessage);
    const firstAttempt = source.attempts[0];
    if (firstAttempt?.templateName) {
      setSingleTemplateKey(
        `${firstAttempt.templateName}\t${firstAttempt.templateLanguage}`,
      );
    } else {
      setSingleTemplateKey('');
    }
    setActivePreviewIndex(0);
    setIsEditingTitle(false);
    setTemplateSearchQuery('');
    setCustomizeOpen(false);
  }, []);

  // Reset form whenever the rule being viewed changes (e.g. navigating between rules).
  useEffect(() => {
    setInitialized(false);
  }, [ruleId]);

  useEffect(() => {
    if (!rule || initialized) return;
    applyRuleToForm(rule);
    setInitialized(true);
  }, [rule, initialized, applyRuleToForm]);

  const handleReset = () => {
    if (!rule) return;
    applyRuleToForm(rule);
  };

  const cancelEditingTitle = () => {
    if (rule) setName(rule.name);
    setIsEditingTitle(false);
  };

  const channel = useMemo(() => {
    if (!channels || !rule) return null;
    return channels.find((c) => c._id === rule.channelId) ?? null;
  }, [channels, rule]);

  const templatesQuery = useQuery(
    api.whatsappTemplateQueries.listApprovedForChannel,
    rule?.channelId ? { channelId: rule.channelId } : 'skip',
  );
  const approvedTemplates = templatesQuery ?? [];
  const templatesLoading = Boolean(rule?.channelId) && templatesQuery === undefined;

  const filteredTemplates = useMemo(() => {
    const query = templateSearchQuery.trim().toLowerCase();
    if (!query) return approvedTemplates;
    return approvedTemplates.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        t.category.toLowerCase().includes(query) ||
        t.language.toLowerCase().includes(query),
    );
  }, [approvedTemplates, templateSearchQuery]);

  useEffect(() => {
    if (!useSameMessage || isApplyingRef.current) return;
    const [templateName, templateLanguage] = singleTemplateKey.split('\t');
    setAttempts(
      Array.from({ length: maxAttempts }, (_, i) => ({
        attemptNumber: i + 1,
        templateName: templateName || '',
        templateLanguage: templateLanguage || '',
      })),
    );
  }, [useSameMessage, singleTemplateKey, maxAttempts]);

  useEffect(() => {
    if (useSameMessage || isApplyingRef.current) return;
    setAttempts((prev) => {
      const next = [...prev];
      if (next.length > maxAttempts) {
        return next.slice(0, maxAttempts).map((att, i) => ({
          ...att,
          attemptNumber: i + 1,
        }));
      }
      while (next.length < maxAttempts) {
        const attemptNumber = next.length + 1;
        next.push({
          attemptNumber,
          templateName: '',
          templateLanguage: '',
        });
      }
      return next.map((att, i) => ({ ...att, attemptNumber: i + 1 }));
    });
  }, [maxAttempts, useSameMessage]);

  const allTags = useMemo(() => {
    if (!candidates) return [];
    const tags = new Set<string>();
    candidates.forEach((c) => c.tags?.forEach((t) => tags.add(t)));
    return Array.from(tags).sort();
  }, [candidates]);

  const selectedLeadTemperatures = useMemo(() => {
    return selectedAudience
      .filter((f) => f.startsWith('lead:'))
      .map((f) => f.slice(5) as LeadTemperature);
  }, [selectedAudience]);

  const selectedAudienceTags = useMemo(() => {
    return selectedAudience.filter((f) => f.startsWith('tag:')).map((f) => f.slice(4));
  }, [selectedAudience]);

  const filteredCandidatesCount = useMemo(() => {
    if (!candidates) return 0;
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
    }).length;
  }, [candidates, selectedLeadTemperatures, selectedAudienceTags]);

  const audienceSelectGroups = useMemo((): MultiSelectGroup[] => {
    const leadOptions = (['Hot', 'Warm', 'Cold'] as const).map((temp) => {
      const style = getLeadTemperatureStyle(temp);
      const Icon = style.icon;
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
          </span>
        ),
        searchValue: temp,
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

  const estimatedCostPerCustomer = useMemo(() => {
    return attempts.reduce((total, att) => {
      if (!att.templateName) return total;
      const template = approvedTemplates.find(
        (t) => t.name === att.templateName && t.language === att.templateLanguage,
      );
      return total + getWhatsAppRateForCategory(template?.category);
    }, 0);
  }, [attempts, approvedTemplates]);

  const isDirty = useMemo(() => {
    if (!rule || !initialized) return false;
    const audienceSame =
      JSON.stringify([...selectedAudience].sort()) ===
      JSON.stringify(ruleToAudienceValues(rule).sort());
    return (
      name.trim() !== rule.name ||
      triggerDelayHours !== rule.triggerDelayHours ||
      intervalHours !== rule.intervalHours ||
      maxAttempts !== rule.maxAttempts ||
      !audienceSame ||
      useSameMessage !== initialUseSameMessage ||
      JSON.stringify(attempts) !== JSON.stringify(rule.attempts)
    );
  }, [
    rule,
    initialized,
    name,
    triggerDelayHours,
    intervalHours,
    maxAttempts,
    selectedAudience,
    attempts,
    useSameMessage,
    initialUseSameMessage,
  ]);

  const changeCount = useMemo(() => {
    if (!rule || !initialized) return 0;
    const audienceSame =
      JSON.stringify([...selectedAudience].sort()) ===
      JSON.stringify(ruleToAudienceValues(rule).sort());
    const attemptsChanged = JSON.stringify(attempts) !== JSON.stringify(rule.attempts);
    return [
      // 1. Name
      name.trim() !== rule.name,
      // 2. Trigger schedule (start after + follow up every — same section)
      triggerDelayHours !== rule.triggerDelayHours || intervalHours !== rule.intervalHours,
      // 3. Follow-up limit — maxAttempts and attempts array are tightly coupled
      maxAttempts !== rule.maxAttempts || attemptsChanged,
      // 4. Audience
      !audienceSame,
      // 5. Messages — strategy switch and template selections are one concern
      useSameMessage !== initialUseSameMessage,
    ].filter(Boolean).length;
  }, [
    rule,
    initialized,
    name,
    triggerDelayHours,
    intervalHours,
    maxAttempts,
    selectedAudience,
    attempts,
    useSameMessage,
    initialUseSameMessage,
  ]);

  const handleSelectTemplateForAttempt = (index: number, templateKey: string) => {
    const [templateName, templateLanguage] = templateKey.split('\t');
    setAttempts((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        templateName,
        templateLanguage,
      };
      return next;
    });
    setActivePreviewIndex(index);
  };

  const handleMaxAttemptsChange = (value: string) => {
    const n = Number.parseInt(value, 10);
    setMaxAttempts(n);
    setAttempts((prev) => {
      if (prev.length === n) return prev;
      if (prev.length > n) return prev.slice(0, n);
      const last = prev[prev.length - 1] ?? {
        attemptNumber: 1,
        templateName: '',
        templateLanguage: '',
      };
      return [
        ...prev,
        ...Array.from({ length: n - prev.length }, (_, i) => ({
          attemptNumber: prev.length + i + 1,
          templateName: last.templateName,
          templateLanguage: last.templateLanguage,
        })),
      ].map((att, i) => ({ ...att, attemptNumber: i + 1 }));
    });
  };

  const activeTabMeta =
    FOLLOW_UP_DETAIL_TABS.find((t) => t.id === activeTab) ?? FOLLOW_UP_DETAIL_TABS[0];
  const sentTotalCost = sentRows?.reduce((sum, row) => sum + row.estCostMyr, 0) ?? 0;

  useEffect(() => {
    setActivePreviewIndex((index) =>
      Math.min(index, Math.max(0, attempts.length - 1)),
    );
  }, [attempts.length]);

  const selectedAttemptTemplate = useMemo(() => {
    if (useSameMessage) {
      if (!singleTemplateKey) return null;
      const [templateName, templateLanguage] = singleTemplateKey.split('\t');
      return approvedTemplates.find(
        (t) => t.name === templateName && t.language === templateLanguage,
      );
    }
    const activeAttempt = attempts[activePreviewIndex];
    if (!activeAttempt?.templateName) return null;
    return approvedTemplates.find(
      (t) =>
        t.name === activeAttempt.templateName &&
        t.language === activeAttempt.templateLanguage,
    );
  }, [activePreviewIndex, approvedTemplates, useSameMessage, singleTemplateKey, attempts]);

  const requestActiveChange = (next: boolean) => {
    if (!canManage || next === isActive) return;
    if (next && !messagesReady) {
      setShowMessageRequiredError(true);
      return;
    }
    setShowMessageRequiredError(false);
    setPendingActive(next);
    setActiveConfirmOpen(true);
  };

  const cancelActiveChange = () => {
    setActiveConfirmOpen(false);
    setPendingActive(null);
  };

  const confirmActiveChange = async () => {
    if (pendingActive === null || !typedRuleId || !canManage) return;
    setActiveChangeBusy(true);
    try {
      await setRuleActive({ id: typedRuleId, isActive: pendingActive });
      setIsActive(pendingActive);
      toast.success(
        pendingActive ? 'Follow-up is now active' : 'Follow-up is now inactive',
      );
      setActiveConfirmOpen(false);
      setPendingActive(null);
    } catch {
      toast.error('Failed to update follow-up.');
    } finally {
      setActiveChangeBusy(false);
    }
  };

  const handleSave = useCallback(async () => {
    if (!typedRuleId || !canManage || !isDirty) return;
    if (selectedAudience.length === 0) {
      toast.error('Select at least one audience filter.');
      return;
    }
    setSaving(true);
    try {
      await updateRule({
        id: typedRuleId,
        name: name.trim(),
        attempts,
        maxAttempts,
        triggerDelayHours,
        intervalHours,
        audienceLeadTemperatures: selectedLeadTemperatures,
        audienceTags:
          selectedAudienceTags.length > 0 ? selectedAudienceTags : undefined,
        isActive,
        estimatedCostPerCustomer,
      });
      toast.success('Follow-up saved.');
      setIsEditingTitle(false);
      setInitialized(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save follow-up');
    } finally {
      setSaving(false);
    }
  }, [
    typedRuleId,
    canManage,
    isDirty,
    selectedAudience.length,
    name,
    attempts,
    maxAttempts,
    triggerDelayHours,
    intervalHours,
    selectedLeadTemperatures,
    selectedAudienceTags,
    isActive,
    estimatedCostPerCustomer,
    updateRule,
  ]);

  if (!typedAgentId || !typedRuleId) {
    return <Navigate to="/workspace" replace />;
  }

  if (rule === undefined || channels === undefined || sentRows === undefined) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (rule === null) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
        <Button variant="ghost" size="sm" className="-ml-2 w-fit gap-1 text-muted-foreground" asChild>
          <Link to={`/dashboard/${agentId}/follow-ups`}>
            <ArrowLeft className="size-4" />
            Back to Follow-ups
          </Link>
        </Button>
        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
          <AlertCircle className="mx-auto size-10 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold text-foreground">Follow-up not found</h2>
          <Button className="mt-6" asChild>
            <Link to={`/dashboard/${agentId}/follow-ups`}>Open Follow-ups list</Link>
          </Button>
        </div>
      </div>
    );
  }

  const showSaveFooter = canManage && isDirty;

  return (
    <div
      className={cn(
        'flex w-full flex-col gap-6 animate-fade-in',
        showSaveFooter ? 'pb-24' : 'pb-12',
      )}
    >
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 w-fit gap-1.5 text-muted-foreground hover:text-foreground"
        asChild
      >
        <Link to={`/dashboard/${agentId}/follow-ups`}>
          <ArrowLeft className="size-4" />
          Back to Follow-ups
        </Link>
      </Button>

      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {canManage && isEditingTitle ? (
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setIsEditingTitle(false);
                  if (e.key === 'Escape') cancelEditingTitle();
                }}
                onBlur={() => {
                  setIsEditingTitle(false);
                }}
                autoFocus
                className="max-w-2xl text-3xl font-semibold tracking-tight h-auto py-1 px-2"
                aria-label="Follow-up name"
              />
            ) : (
              <>
                <h1 className="m-0 text-3xl font-semibold tracking-tight text-foreground">
                  {name}
                </h1>
                {canManage && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-9 shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label="Edit follow-up name"
                    onClick={() => setIsEditingTitle(true)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                )}
              </>
            )}
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {channel ? `${channelLabel(channel)} · ` : ''}
            {isActive
              ? 'Active — matching customers receive automated messages.'
              : 'Inactive — no follow-up messages will be sent.'}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <div className="flex items-center gap-4">
            <span
              className={cn(
                'font-semibold tracking-tight',
                isActive
                  ? 'text-2xl text-emerald-600 dark:text-emerald-400'
                  : 'text-lg text-muted-foreground',
              )}
            >
              {isActive ? 'Active' : 'Inactive'}
            </span>
            {canManage && (
              <Switch
                checked={isActive}
                onCheckedChange={(checked) => requestActiveChange(checked)}
                className="scale-[1.35] data-[state=checked]:bg-emerald-500"
                aria-label={isActive ? 'Set inactive' : 'Set active'}
              />
            )}
          </div>
          {showMessageRequiredError && !messagesReady && (
            <p className="text-xs font-semibold text-destructive">
              {FOLLOW_UP_MESSAGE_REQUIRED_ERROR}
            </p>
          )}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[252px_1fr]">
        <DetailSectionNav
          tabs={FOLLOW_UP_DETAIL_TABS}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        <div className="flex min-w-0 flex-col gap-6">
          <DetailSectionHeading title={activeTabMeta.label} />

          {activeTab === 'overview' && (
            <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,400px)]">
              <div className="flex min-w-0 flex-col">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-5 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Sent
                    </span>
                    <div className="mt-1 text-3xl font-semibold tabular-nums text-foreground">
                      {(rule.messagesSentCount ?? 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-5 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Reply rate
                    </span>
                    <div className="mt-1 text-3xl font-semibold tabular-nums text-foreground">
                      {formatReplyRate(rule.messagesSentCount, rule.repliesReceivedCount)}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-5 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Est. cost
                    </span>
                    <div className="mt-1 text-3xl font-semibold tabular-nums text-foreground">
                      {formatEstimatedCostSoFar(
                        rule.messagesSentCount,
                        rule.estimatedCostPerCustomer,
                        rule.maxAttempts,
                      )}
                    </div>
                  </div>
                </div>

                <Separator className="my-8" />

                <div className="flex w-full flex-col gap-8">
                  <div className="flex max-w-xl flex-col gap-2.5">
                    <Label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <SiWhatsapp className="size-3.5 shrink-0 text-[#25D366]" aria-hidden />
                      WhatsApp account
                    </Label>
                    <p className="m-0 text-sm font-semibold text-foreground">
                      {channel ? channelLabel(channel) : '—'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-8">
                    <div className="w-full space-y-4 lg:col-span-5">
                      <h3 className="text-base font-bold text-foreground">Follow-up limit</h3>
                      <div className="flex max-w-xs flex-col gap-2.5">
                        <Label
                          htmlFor="followup-max-attempts"
                          className="text-xs font-semibold text-foreground"
                        >
                          Maximum follow-ups per customer
                        </Label>
                        {canManage ? (
                          <Select
                            value={String(maxAttempts)}
                            onValueChange={handleMaxAttemptsChange}
                          >
                            <SelectTrigger
                              id="followup-max-attempts"
                              className={FOLLOW_UP_SELECT_TRIGGER_CLASS}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                                <SelectItem key={n} value={String(n)}>
                                  {n} attempt{n === 1 ? '' : 's'}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="m-0 text-sm font-semibold text-foreground">
                            {rule.maxAttempts} attempt{rule.maxAttempts === 1 ? '' : 's'}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="w-full space-y-4 border-t border-border pt-6 lg:col-span-7 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
                      <h3 className="text-base font-bold text-foreground">Trigger schedule</h3>
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div className="flex flex-col gap-2.5">
                          <Label
                            htmlFor="followup-trigger-delay"
                            className="text-xs font-semibold text-foreground"
                          >
                            Start after
                          </Label>
                          {canManage ? (
                            <Select
                              value={String(triggerDelayHours)}
                              onValueChange={(v) => setTriggerDelayHours(Number(v))}
                            >
                              <SelectTrigger
                                id="followup-trigger-delay"
                                className={FOLLOW_UP_SELECT_TRIGGER_CLASS}
                              >
                                <SelectValue placeholder="Select delay" />
                              </SelectTrigger>
                              <SelectContent>
                                {DELAY_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={String(opt.value)}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <p className="m-0 text-sm font-semibold text-foreground">
                              {hoursToLabel(rule.triggerDelayHours)}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col gap-2.5">
                          <Label
                            htmlFor="followup-interval"
                            className="text-xs font-semibold text-foreground"
                          >
                            Follow up every
                          </Label>
                          {canManage ? (
                            <Select
                              value={String(intervalHours)}
                              onValueChange={(v) => setIntervalHours(Number(v))}
                            >
                              <SelectTrigger
                                id="followup-interval"
                                className={FOLLOW_UP_SELECT_TRIGGER_CLASS}
                              >
                                <SelectValue placeholder="Select frequency" />
                              </SelectTrigger>
                              <SelectContent>
                                {DELAY_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={String(opt.value)}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <p className="m-0 text-sm font-semibold text-foreground">
                              {hoursToLabel(rule.intervalHours)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="w-full space-y-4">
                    <h3 className="text-base font-bold text-foreground">Who to follow up with</h3>
                    <div className="flex max-w-xl flex-col gap-2.5">
                      {canManage ? (
                        <>
                          <MultiSelect
                            groups={audienceSelectGroups}
                            value={selectedAudience}
                            onValueChange={setSelectedAudience}
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
                        </>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {rule.audienceLeadTemperatures.map((temp) => {
                            const style = getLeadTemperatureStyle(temp);
                            const Icon = style.icon;
                            return (
                              <span
                                key={temp}
                                className={cn(
                                  'inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[10px] font-semibold',
                                  style.bg,
                                  style.text,
                                )}
                              >
                                <Icon className={cn('size-3', style.iconClass)} />
                                {temp}
                              </span>
                            );
                          })}
                          {rule.audienceTags?.map((tag) => {
                            const tagStyle = getTagColorClass(tag);
                            return (
                              <span
                                key={tag}
                                className={cn(
                                  'inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[10px] font-semibold',
                                  tagStyle.bg,
                                  tagStyle.text,
                                )}
                              >
                                <span className={cn('size-1.5 rounded-full', tagStyle.dot)} />
                                {tag}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div className="w-full space-y-4">
                    <h3 className="text-base font-bold text-foreground">Messages</h3>
                    {canManage ? (
                      <div className="flex max-w-xl flex-col gap-3.5">
                        <RadioGroup
                          value={useSameMessage ? 'same' : 'different'}
                          onValueChange={(val) => {
                            const nextSame = val === 'same';
                            setUseSameMessage(nextSame);
                            if (nextSame && attempts[0]?.templateName) {
                              setSingleTemplateKey(
                                `${attempts[0].templateName}\t${attempts[0].templateLanguage}`,
                              );
                            }
                          }}
                          className="flex w-full flex-col gap-4"
                        >
                          <div className="flex items-start gap-3.5">
                            <RadioGroupItem
                              value="same"
                              id="detail-strategy-same"
                              className="mt-4 shrink-0 cursor-pointer"
                            />
                            <Label
                              htmlFor="detail-strategy-same"
                              className="flex-1 cursor-pointer font-normal"
                            >
                              <div
                                className={cn(
                                  'flex flex-col justify-between rounded-2xl border p-4.5 transition-all duration-200 select-none shadow-2xs hover:shadow-xs',
                                  useSameMessage
                                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20 dark:bg-primary/950/10'
                                    : 'border-border bg-card hover:border-neutral-300 hover:bg-neutral-50/50 dark:hover:border-neutral-700 dark:hover:bg-neutral-900/50',
                                )}
                              >
                                <div>
                                  <h4 className="text-base font-semibold leading-snug text-foreground">
                                    Same message
                                  </h4>
                                  <p className="mt-1 text-xs font-normal leading-normal text-muted-foreground">
                                    Use one message for all of the follow-ups.
                                  </p>
                                  {useSameMessage && (
                                    <div
                                      className="mt-4 flex flex-col gap-2.5 border-t border-dashed border-border/80 pt-4 animate-in fade-in duration-200"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <div className="flex items-center gap-4">
                                        <span className="w-24 shrink-0 text-xs font-semibold text-foreground">
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
                                              className="h-9 cursor-pointer bg-background px-3 text-xs font-semibold hover:bg-muted"
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
                                              className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-muted/60 px-3 py-1.5 font-mono text-xs font-semibold text-foreground transition-all hover:bg-muted hover:text-primary"
                                            >
                                              <span
                                                className="max-w-[240px] truncate"
                                                title={attempts[0].templateName}
                                              >
                                                {attempts[0].templateName}
                                              </span>
                                              <Pencil className="size-3 shrink-0 text-muted-foreground" />
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

                          <div className="flex items-start gap-3.5">
                            <RadioGroupItem
                              value="different"
                              id="detail-strategy-different"
                              className="mt-4 shrink-0 cursor-pointer"
                            />
                            <Label
                              htmlFor="detail-strategy-different"
                              className="flex-1 cursor-pointer font-normal"
                            >
                              <div
                                className={cn(
                                  'flex flex-col justify-between rounded-2xl border p-4.5 transition-all duration-200 select-none shadow-2xs hover:shadow-xs',
                                  !useSameMessage
                                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20 dark:bg-primary/950/10'
                                    : 'border-border bg-card hover:border-neutral-300 hover:bg-neutral-50/50 dark:hover:border-neutral-700 dark:hover:bg-neutral-900/50',
                                )}
                              >
                                <div>
                                  <h4 className="text-base font-semibold leading-snug text-foreground">
                                    Different message
                                  </h4>
                                  <p className="mt-1 text-xs font-normal leading-normal text-muted-foreground">
                                    Use multiple messages for different steps.
                                  </p>
                                  {!useSameMessage && (
                                    <div
                                      className="mt-4 flex flex-col gap-3 border-t border-dashed border-border/80 pt-4 animate-in fade-in duration-200"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {attempts.map((att, index) => (
                                        <div
                                          key={att.attemptNumber}
                                          className="flex items-center gap-4"
                                        >
                                          <span className="w-24 shrink-0 text-xs font-semibold text-foreground">
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
                                                className="h-9 cursor-pointer bg-background px-3 text-xs font-semibold hover:bg-muted"
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
                                                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-muted/60 px-3 py-1.5 font-mono text-xs font-semibold text-foreground transition-all hover:bg-muted hover:text-primary"
                                              >
                                                <span
                                                  className="max-w-[240px] truncate"
                                                  title={att.templateName}
                                                >
                                                  {att.templateName}
                                                </span>
                                                <Pencil className="size-3 shrink-0 text-muted-foreground" />
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
                    ) : (
                      <div className="max-w-xl space-y-3 text-sm">
                        <p className="m-0 font-semibold text-foreground">
                          {ruleUsesSameMessage(rule.attempts)
                            ? 'Same message for all follow-ups'
                            : 'Different message per follow-up'}
                        </p>
                        {attempts.map((att) => (
                          <p key={att.attemptNumber} className="m-0 text-muted-foreground">
                            Follow up {att.attemptNumber}:{' '}
                            <span className="font-mono font-medium text-foreground">
                              {att.templateName
                                ? `${att.templateName} (${att.templateLanguage})`
                                : '—'}
                            </span>
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="w-full lg:justify-self-end lg:border-l lg:border-border lg:pl-8">
                <WhatsAppTemplatePreview
                  templateName={selectedAttemptTemplate?.name}
                  components={selectedAttemptTemplate?.components}
                  isLoading={templatesLoading}
                  emptyMessage="Select a message template to view preview"
                  className="max-w-sm"
                />
              </div>
            </div>
          )}

          {activeTab === 'sent' && (
            <div className="flex flex-col gap-6">
              <Separator />
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-5 py-3.5 text-left font-semibold text-muted-foreground">
                        Recipient
                      </th>
                      <th className="px-5 py-3.5 text-left font-semibold text-muted-foreground">
                        Attempt
                      </th>
                      <th className="px-5 py-3.5 text-left font-semibold text-muted-foreground">
                        Date & time
                      </th>
                      <th className="px-5 py-3.5 text-left font-semibold text-muted-foreground">
                        Status
                      </th>
                      <th className="px-5 py-3.5 text-right font-semibold text-muted-foreground">
                        Est. cost
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {sentRows === null || sentRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-5 py-8 text-center text-muted-foreground"
                        >
                          No follow-up messages have been sent for this rule yet.
                        </td>
                      </tr>
                    ) : (
                      sentRows.map((row) => {
                        const dateLabel = new Date(row.sentAt).toLocaleString([], {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        });
                        const statusStyle = followUpSendStatusBadgeClass(row.deliveryLabel);

                        return (
                          <tr key={row._id} className="hover:bg-muted/20">
                            <td className="px-5 py-3.5 align-middle">
                              <div className="font-medium text-foreground">
                                {row.name ?? row.phone}
                              </div>
                              {row.name ? (
                                <div className="mt-0.5 font-mono text-xs text-muted-foreground">
                                  {row.phone}
                                </div>
                              ) : null}
                              <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                                {row.templateName} ({row.templateLanguage})
                              </div>
                            </td>
                            <td className="px-5 py-3.5 align-middle font-medium tabular-nums text-foreground">
                              {row.attemptNumber}
                            </td>
                            <td className="px-5 py-3.5 align-middle tabular-nums text-foreground">
                              {dateLabel}
                            </td>
                            <td className="px-5 py-3.5 align-middle">
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
                                  statusStyle.badge,
                                )}
                              >
                                <span
                                  className={cn('size-1.5 rounded-full', statusStyle.dot)}
                                />
                                {row.deliveryLabel}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 align-middle text-right font-medium tabular-nums text-foreground">
                              RM {row.estCostMyr.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {sentRows && sentRows.length > 0 ? (
                    <tfoot>
                      <tr className="border-t border-border bg-muted/20">
                        <td
                          colSpan={4}
                          className="px-5 py-3 text-right text-sm font-semibold text-muted-foreground"
                        >
                          Total ({sentRows.length} sends)
                        </td>
                        <td className="px-5 py-3 text-right text-sm font-semibold tabular-nums text-foreground">
                          RM {sentTotalCost.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  ) : null}
                </table>
              </div>
            </div>
            </div>
          )}

        </div>
      </div>

      {showSaveFooter && (
        <DetailPageActionFooter>
          <Button
            type="button"
            variant="ghost"
            className="h-10 px-3 font-semibold text-muted-foreground hover:text-foreground"
            onClick={handleReset}
            disabled={saving}
          >
            Reset
          </Button>
          <Button
            className="h-10 shrink-0 gap-2 font-semibold"
            onClick={() => void handleSave()}
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving…
              </>
            ) : (
              `Save ${changeCount} ${changeCount === 1 ? 'change' : 'changes'}`
            )}
          </Button>
        </DetailPageActionFooter>
      )}

      <Dialog open={customizeOpen} onOpenChange={setCustomizeOpen}>
        <DialogContent className="flex h-[800px] max-h-[92vh] w-[95vw] flex-col overflow-hidden rounded-3xl border border-border/60 bg-white p-6 dark:bg-[#121212] sm:max-w-[1200px]">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-lg font-semibold text-foreground">
              Customize messages
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Select the WhatsApp messages to use for your follow-up sequence.
            </DialogDescription>
          </DialogHeader>

          <div className="grid min-h-0 flex-1 grid-cols-1 items-stretch gap-6 overflow-hidden py-4 text-left md:grid-cols-12">
            <div className="flex h-full flex-col gap-4 overflow-hidden md:col-span-8">
              <div className="flex shrink-0 items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  Select message
                </span>
                <Link
                  to={
                    rule?.channelId
                      ? `/dashboard/${agentId}/channels/${rule.channelId}/templates`
                      : `/dashboard/${agentId}/templates`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs font-bold text-blue-600 transition-all hover:underline dark:text-blue-400"
                >
                  <Plus className="size-3" />
                  Create template
                </Link>
              </div>

              <div className="relative shrink-0">
                <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search message templates..."
                  value={templateSearchQuery}
                  onChange={(e) => setTemplateSearchQuery(e.target.value)}
                  className="h-9.5 border border-neutral-300 bg-background pl-9 text-xs dark:border-neutral-700"
                />
                {templateSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setTemplateSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-1">
                {templatesLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredTemplates.length === 0 ? (
                  <div className="py-10 text-center text-xs text-muted-foreground">
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
                            setActivePreviewIndex(0);
                          } else {
                            handleSelectTemplateForAttempt(activePreviewIndex, key);
                          }
                        }}
                        className={cn(
                          'relative flex cursor-pointer items-center justify-between gap-4 rounded-xl border p-4 text-left transition-all hover:shadow-2xs active:scale-[0.99]',
                          isSelected
                            ? 'border-foreground bg-zinc-50 dark:bg-zinc-900/30'
                            : 'border-border bg-background hover:border-neutral-300',
                        )}
                      >
                        <div className="min-w-0 flex-1 font-normal">
                          <div className="flex w-full items-center justify-between gap-3">
                            <h3 className="m-0 truncate text-xs font-bold text-foreground">
                              {t.name}
                            </h3>
                            <Badge className="shrink-0 bg-emerald-600 py-0.5 text-[9px] font-bold capitalize text-white hover:bg-emerald-600">
                              {t.status.toLowerCase()}
                            </Badge>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            <Badge
                              variant="outline"
                              className="px-1 py-0 text-[9px] font-semibold text-muted-foreground select-none"
                            >
                              {t.language}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="px-1 py-0 text-[9px] font-semibold text-muted-foreground select-none"
                            >
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

            <div className="flex h-full min-h-0 flex-col items-center justify-start md:col-span-4 w-full">
              <WhatsAppTemplatePreview
                templateName={selectedAttemptTemplate?.name}
                components={selectedAttemptTemplate?.components}
                isLoading={templatesLoading}
                emptyMessage="Select a message template to view preview"
                className="max-w-[360px]"
              />
            </div>
          </div>

          <DialogFooter className="mt-2 shrink-0">
            <Button
              onClick={() => setCustomizeOpen(false)}
              className="w-full rounded-xl sm:w-auto"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={activeConfirmOpen}
        onOpenChange={(open) => {
          if (!open) cancelActiveChange();
        }}
      >
        <DialogContent className="rounded-3xl sm:max-w-md">
          <DialogHeader className="gap-3 text-left">
            <DialogTitle className="text-2xl font-semibold tracking-tight text-foreground">
              {pendingActive ? 'Activate this follow-up?' : 'Deactivate this follow-up?'}
            </DialogTitle>
            <DialogDescription className="text-base leading-relaxed text-muted-foreground">
              {pendingActive
                ? 'Matching customers will start receiving automated follow-up messages based on this rule.'
                : 'No new follow-up messages will be sent until you turn this follow-up back on.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              variant="outline"
              className="h-10"
              onClick={cancelActiveChange}
              disabled={activeChangeBusy}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void confirmActiveChange()}
              disabled={activeChangeBusy}
              className="h-10 gap-2 bg-foreground font-semibold text-background hover:bg-foreground/90"
            >
              {activeChangeBusy ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Confirming…
                </>
              ) : (
                'Confirm'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
