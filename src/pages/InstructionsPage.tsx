import { useEffect, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { useNavigate, useParams, Navigate } from 'react-router';
import {
  Wrench,
  Bot,
  ArrowRight,
  Banknote,
  Mail,
  Check,
  Maximize2,
  Zap,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { AGENT_TEMPLATES, type AgentTemplateKey } from '@/lib/agentTemplates';
import { toast } from 'sonner';
import { PageDescription } from '@/components/PageDescription';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { ModelPicker } from '@/components/ModelPicker';
import { usePermissions } from '@/hooks/usePermissions';
import { Permission } from '../../shared/permissions';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const templateOptions: Array<{
  key: AgentTemplateKey;
  icon: any;
  description: string;
}> = [
  {
    key: 'blank',
    icon: Bot,
    description: 'Flexible assistant for custom instructions.',
  },
  {
    key: 'sales',
    icon: Banknote,
    description: 'Qualify leads and drive next steps.',
  },
  {
    key: 'support',
    icon: Mail,
    description: 'Resolve customer issues with care.',
  },
];

type ReplyMode = 'automatic' | 'manual';

const REPLY_MODE_OPTIONS: Array<{
  value: ReplyMode;
  label: string;
  description: string;
  whenToUse: Array<{ title: string; description: string }>;
}> = [
  {
    value: 'automatic',
    label: 'Automatic',
    description: 'AI replies instantly to every new message.',
    whenToUse: [
      {
        title: 'Fast first response',
        description: 'Reply right away without waiting for a teammate.',
      },
      {
        title: 'After-hours coverage',
        description: 'Keep chats moving when no one is on shift.',
      },
      {
        title: 'Simple FAQs',
        description: 'Handle common questions the AI can answer on its own.',
      },
    ],
  },
  {
    value: 'manual',
    label: 'Manual',
    description:
      'AI will not reply on its own. A teammate must turn it on from the inbox first.',
    whenToUse: [
      {
        title: 'Human review first',
        description: 'Check the message before AI joins the conversation.',
      },
      {
        title: 'High-value leads',
        description: 'Review sales or sensitive chats before AI replies.',
      },
      {
        title: 'Qualify, then automate',
        description: 'Ask a few questions first, then turn AI on.',
      },
    ],
  },
];

function WhenToUseHoverCard({
  useCases,
}: {
  useCases: Array<{ title: string; description: string }>;
}) {
  return (
    <HoverCard openDelay={120} closeDelay={80}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className="mt-1.5 text-xs text-muted-foreground underline decoration-foreground/30 underline-offset-2 transition-colors hover:text-foreground hover:decoration-foreground"
        >
          When to use?
        </button>
      </HoverCardTrigger>
      <HoverCardContent align="start" className="w-72 text-xs leading-relaxed">
        <ul className="space-y-3">
          {useCases.map((useCase) => (
            <li key={useCase.title}>
              <p className="font-semibold text-foreground">{useCase.title}</p>
              <p className="mt-0.5 text-muted-foreground">{useCase.description}</p>
            </li>
          ))}
        </ul>
      </HoverCardContent>
    </HoverCard>
  );
}

export default function InstructionsPage() {
  const { agentId } = useParams();
  const selectedAgentId = agentId as Id<'agents'> | undefined;
  const navigate = useNavigate();

  const { can, isLoading: permissionsLoading } = usePermissions();
  const canReadRouting = can(Permission.ROUTING_READ);
  const canManageRouting = can(Permission.ROUTING_MANAGE);

  const agent = useQuery(
    api.agents.get,
    selectedAgentId ? { agentId: selectedAgentId } : 'skip',
  );
  const routingSettings = useQuery(
    api.leadRouting.settings.getForAgent,
    selectedAgentId && canReadRouting ? { agentId: selectedAgentId } : 'skip',
  );
  const enabledModels = useQuery(api.llm.modelPricing.listEnabled);

  const [name, setName] = useState('');
  const [templateKey, setTemplateKey] = useState<AgentTemplateKey>('blank');
  const [model, setModel] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [escalationEnabled, setEscalationEnabled] = useState(false);
  const [sendEscalationMsg, setSendEscalationMsg] = useState(false);
  const [escalationMessage, setEscalationMessage] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [isSavingEscalation, setIsSavingEscalation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGoalExpanded, setIsGoalExpanded] = useState(false);
  const [replyMode, setReplyMode] = useState<ReplyMode>('automatic');
  const [isSavingReplyMode, setIsSavingReplyMode] = useState(false);

  const updateAgent = useMutation(api.agents.update);
  const updateRoutingSettings = useMutation(api.leadRouting.settings.updateForAgent);

  useEffect(() => {
    if (!agent) return;
    setName(agent.name);
    setTemplateKey(agent.templateKey);
    setModel(agent.model);
    setSystemPrompt(agent.systemPrompt);
    setEscalationEnabled(agent.escalationEnabled ?? false);
    setSendEscalationMsg(!!agent.escalationMessage);
    setEscalationMessage(agent.escalationMessage ?? '');
  }, [agent]);

  useEffect(() => {
    if (!routingSettings) return;
    setReplyMode(routingSettings.aiEnabledOnInbound ? 'automatic' : 'manual');
  }, [routingSettings]);

  const handleSave = async () => {
    if (!selectedAgentId || !agent) return;
    setIsSaving(true);
    setError(null);
    try {
      await updateAgent({
        agentId: selectedAgentId,
        name,
        model,
        systemPrompt,
        templateKey,
        escalationEnabled,
        escalationMessage: sendEscalationMsg ? escalationMessage : undefined,
      });
      toast.success('Agent saved successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save agent');
      toast.error('Failed to save agent');
    } finally {
      setIsSaving(false);
    }
  };

  const applyTemplate = (key: AgentTemplateKey) => {
    setTemplateKey(key);
    setSystemPrompt(AGENT_TEMPLATES[key].prompt);
  };

  const handleSaveReplyMode = async () => {
    if (!selectedAgentId || !canManageRouting || !routingSettings) return;

    const savedMode = routingSettings.aiEnabledOnInbound ? 'automatic' : 'manual';
    if (replyMode === savedMode) return;

    setIsSavingReplyMode(true);
    try {
      await updateRoutingSettings({
        agentId: selectedAgentId,
        aiEnabledOnInbound: replyMode === 'automatic',
      });
      toast.success('Trigger updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update trigger');
    } finally {
      setIsSavingReplyMode(false);
    }
  };

  const handleResetReplyMode = () => {
    if (!routingSettings) return;
    setReplyMode(routingSettings.aiEnabledOnInbound ? 'automatic' : 'manual');
  };

  const handleSaveEscalation = async () => {
    if (!selectedAgentId || !agent) return;
    setIsSavingEscalation(true);
    setError(null);
    try {
      await updateAgent({
        agentId: selectedAgentId,
        name,
        model,
        systemPrompt,
        templateKey,
        escalationEnabled,
        escalationMessage: sendEscalationMsg ? escalationMessage : undefined,
      });
      toast.success('Escalation settings saved successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save escalation settings');
      toast.error('Failed to save escalation settings');
    } finally {
      setIsSavingEscalation(false);
    }
  };

  const handleResetEscalation = () => {
    if (!agent) return;
    setEscalationEnabled(agent.escalationEnabled ?? false);
    setSendEscalationMsg(!!agent.escalationMessage);
    setEscalationMessage(agent.escalationMessage ?? '');
  };

  const handleReset = () => {
    if (!agent) return;
    setName(agent.name);
    setTemplateKey(agent.templateKey);
    setModel(agent.model);
    setSystemPrompt(agent.systemPrompt);
  };

  if (permissionsLoading || agent === undefined) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    );
  }

  // Redirect to playground if user lacks manage permissions
  if (!can(Permission.AGENTS_MANAGE)) {
    return <Navigate to={`/dashboard/${agentId}/playground`} replace />;
  }

  if (agent === null || !selectedAgentId) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <Bot className="mb-3 size-8 text-muted-foreground" />
        <h1 className="m-0 text-lg font-semibold">Agent not found</h1>
        <Button onClick={() => navigate('/workspace')} className="mt-5">
          Back to agents
        </Button>
      </div>
    );
  }

  const hasBasicChanges =
    name !== agent.name ||
    model !== agent.model ||
    templateKey !== agent.templateKey ||
    systemPrompt !== agent.systemPrompt;

  const hasEscalationChanges =
    escalationEnabled !== (agent.escalationEnabled ?? false) ||
    sendEscalationMsg !== (!!agent.escalationMessage) ||
    (sendEscalationMsg && escalationMessage !== (agent.escalationMessage ?? ''));

  const savedReplyMode: ReplyMode | null = routingSettings
    ? routingSettings.aiEnabledOnInbound
      ? 'automatic'
      : 'manual'
    : null;
  const hasReplyModeChanges =
    savedReplyMode !== null && replyMode !== savedReplyMode;

  const isRoutingSettingsLoading = canReadRouting && routingSettings === undefined;

  return (
    <div className="flex w-full flex-col gap-6 max-w-6xl">
      <header className="flex flex-col justify-between gap-4 border-b border-border pb-6 md:flex-row md:items-end">
        <div>
          <h1 className="m-0 text-4xl font-semibold tracking-tight text-foreground">
            Agent Setup
          </h1>
          <PageDescription>
            Tell your AI agent how to talk to and help your customers.
          </PageDescription>
        </div>
        <Button onClick={() => navigate(`/dashboard/${agentId}/playground`)}>
          Test in playground
          <ArrowRight className="size-4" />
        </Button>
      </header>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px] items-stretch">
        {/* Left Column: Configuration Form */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Wrench className="size-4" />
            <span>Basic Configuration</span>
          </div>
          <div className="rounded-xl border border-border bg-card">
            <div className="px-5 py-5">
              <div className="grid gap-5">
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Name
                  </span>
                  <Input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="e.g., Support Assistant"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Model
                  </span>
                  <ModelPicker
                    models={enabledModels}
                    value={model}
                    onChange={setModel}
                  />
                </label>

                <div className="flex flex-col gap-2.5">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Role Template
                  </span>
                  <div className="flex flex-wrap gap-3">
                    {templateOptions.map(({ key, icon: Icon, description }) => {
                      const template = AGENT_TEMPLATES[key];
                      const active = templateKey === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => applyTemplate(key)}
                          className="text-left focus:outline-none shrink-0"
                        >
                          <div
                            className={cn(
                              'relative flex aspect-[5/7] w-[8.55rem] flex-col rounded-sm border bg-card px-4 py-4.5 transition-colors duration-200 cursor-pointer',
                              active
                                ? 'border-foreground bg-accent/40'
                                : 'border-border hover:border-foreground/35 hover:bg-accent/20',
                            )}
                          >
                            {active && (
                              <Check className="absolute right-2 top-2 size-3.5 text-foreground" />
                            )}
                            <div className="flex flex-1 items-start pt-0.5">
                              <Icon
                                className={cn(
                                  'size-10 stroke-[1.5]',
                                  active
                                    ? 'text-foreground'
                                    : 'text-muted-foreground/45',
                                )}
                              />
                            </div>
                            <div className="space-y-1 text-left">
                              <p className="text-sm font-semibold leading-tight text-foreground">
                                {template.label}
                              </p>
                              <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                                {description}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <Separator className="my-2" />

                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Goal
                  </span>
                  <div className="relative flex flex-col">
                    <textarea
                      value={systemPrompt}
                      onChange={(event) => setSystemPrompt(event.target.value)}
                      placeholder="Describe the agent's core purpose, style of response, and guidelines..."
                      className="min-h-[11.7rem] pr-10 pb-10 resize-none rounded-lg border border-border bg-background px-3 py-3 text-sm leading-6 outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/30 overflow-y-auto"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setIsGoalExpanded(true)}
                      className="absolute right-2.5 bottom-2.5 size-7 text-muted-foreground hover:text-foreground hover:bg-muted"
                      title="Expand editor"
                    >
                      <Maximize2 className="size-4" />
                    </Button>
                  </div>
                </div>

                {hasBasicChanges && (
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto px-0 text-muted-foreground"
                      disabled={isSaving}
                      onClick={handleReset}
                    >
                      Reset
                    </Button>
                    <Button
                      type="button"
                      disabled={isSaving || !name.trim() || !systemPrompt.trim()}
                      onClick={() => void handleSave()}
                      className="px-5"
                    >
                      {isSaving ? <Spinner className="size-4" /> : 'Save'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Triggers & Escalation */}
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Zap className="size-4" />
              <span>Triggers</span>
            </div>

            {canReadRouting ? (
              isRoutingSettingsLoading ? (
                <div className="rounded-xl border border-border bg-card px-5 py-5">
                  <div className="flex flex-col gap-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-card">
                  <div className="px-5 py-5">
                    <RadioGroup
                      value={replyMode}
                      onValueChange={(value) => setReplyMode(value as ReplyMode)}
                      disabled={!canManageRouting || isSavingReplyMode}
                      className="gap-4"
                    >
                      {REPLY_MODE_OPTIONS.map((option) => (
                        <div key={option.value} className="flex items-start gap-3">
                          <RadioGroupItem
                            value={option.value}
                            id={`reply-mode-${option.value}`}
                            className="mt-1"
                            disabled={!canManageRouting || isSavingReplyMode}
                          />
                          <div className="min-w-0 flex-1">
                            <label
                              htmlFor={`reply-mode-${option.value}`}
                              className={cn(
                                'block cursor-pointer',
                                (!canManageRouting || isSavingReplyMode) &&
                                  'cursor-not-allowed opacity-60',
                              )}
                            >
                              <span className="block text-base font-semibold leading-tight text-foreground">
                                {option.label}
                                {option.value === 'automatic' ? (
                                  <span className="ml-1.5 font-normal text-muted-foreground">
                                    [default]
                                  </span>
                                ) : null}
                              </span>
                              <span className="mt-0.5 block text-sm leading-snug text-muted-foreground">
                                {option.description}
                              </span>
                            </label>
                            <WhenToUseHoverCard useCases={option.whenToUse} />
                          </div>
                        </div>
                      ))}
                    </RadioGroup>

                    {hasReplyModeChanges && canManageRouting ? (
                      <div className="mt-4 flex items-center justify-end gap-3 border-t border-border/60 pt-4">
                        <Button
                          type="button"
                          variant="link"
                          className="h-auto px-0 text-muted-foreground"
                          disabled={isSavingReplyMode}
                          onClick={handleResetReplyMode}
                        >
                          Reset
                        </Button>
                        <Button
                          type="button"
                          disabled={isSavingReplyMode}
                          onClick={() => void handleSaveReplyMode()}
                          className="px-5"
                        >
                          {isSavingReplyMode ? <Spinner className="size-4" /> : 'Save'}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              )
            ) : (
              <div className="rounded-xl border border-border bg-card px-5 py-5">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  You don&apos;t have permission to view trigger settings for this agent.
                </p>
              </div>
            )}
          </div>

          {/* Human Escalation Category */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <AlertTriangle className="size-4" />
              <span>Human Escalation</span>
            </div>

            <div className="rounded-xl border border-border bg-card">
              <div className="px-5 py-5">
                <div className="flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <span className="block text-base font-semibold leading-tight text-foreground">
                        Smart Escalate
                      </span>
                      <span className="mt-0.5 block text-sm leading-snug text-muted-foreground">
                        Pause AI and alert your team when a human is requested or the AI is unsure.
                      </span>
                    </div>
                    <Switch
                      checked={escalationEnabled}
                      onCheckedChange={setEscalationEnabled}
                      className="mt-1 shrink-0 data-[state=checked]:bg-emerald-600"
                    />
                  </div>

                  {escalationEnabled && (
                    <div className="space-y-4 pl-4 border-l-2 border-border/80">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-semibold text-foreground">
                            Send automated message
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            Send a response to the customer when handoff is triggered.
                          </span>
                        </div>
                        <Switch
                          checked={sendEscalationMsg}
                          onCheckedChange={setSendEscalationMsg}
                          className="data-[state=checked]:bg-emerald-600"
                        />
                      </div>

                      {sendEscalationMsg && (
                        <div className="flex flex-col gap-2">
                          <span className="text-xs font-semibold text-muted-foreground">
                            Escalation Message
                          </span>
                          <textarea
                            value={escalationMessage}
                            onChange={(e) => setEscalationMessage(e.target.value)}
                            placeholder="e.g., We've notified our support team and a human agent will be with you shortly."
                            className="min-h-[4rem] resize-none rounded-lg border border-border bg-background px-3 py-2 text-xs leading-normal outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/30"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {hasEscalationChanges && (
                    <div className="mt-4 flex items-center justify-end gap-3 border-t border-border/60 pt-4">
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto px-0 text-muted-foreground"
                        disabled={isSavingEscalation}
                        onClick={handleResetEscalation}
                      >
                        Reset
                      </Button>
                      <Button
                        type="button"
                        disabled={isSavingEscalation || (sendEscalationMsg && !escalationMessage.trim())}
                        onClick={() => void handleSaveEscalation()}
                        className="px-5"
                      >
                        {isSavingEscalation ? <Spinner className="size-4" /> : 'Save'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Goal Dialog */}
      <Dialog open={isGoalExpanded} onOpenChange={setIsGoalExpanded}>
        <DialogContent className="sm:max-w-2xl h-[80vh] flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Edit Goal & Agent Setup</DialogTitle>
            <DialogDescription>
              Write detailed rules, tone settings, and goals for the AI Agent.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 w-full">
            <textarea
              value={systemPrompt}
              onChange={(event) => setSystemPrompt(event.target.value)}
              className="w-full h-full resize-none rounded-lg border border-border bg-background p-4 text-sm leading-6 outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/30 overflow-y-auto"
              placeholder="Describe the agent's core purpose, style of response, and guidelines..."
              autoFocus
            />
          </div>
          <DialogFooter className="shrink-0 flex justify-end gap-2">
            <Button type="button" onClick={() => setIsGoalExpanded(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
