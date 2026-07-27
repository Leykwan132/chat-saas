import { useEffect, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import {
  Navigate,
  useBlocker,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router';
import { Bot } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { AGENT_TEMPLATES, type AgentTemplateKey } from '@/lib/agentTemplates';
import { AgentSetupHeader } from '@/components/agent-setup/AgentSetupHeader';
import { AgentSetupPanels } from '@/components/agent-setup/AgentSetupPanels';
import { UnsavedChangesDialog } from '@/components/agent-setup/UnsavedChangesDialog';
import type { EmojiUse, Formality, HumorLevel, ReplyMode, ResponseLength } from '@/components/agent-setup/agentSetupOptions';
import {
  AGENT_SETUP_OPEN_TEST_PARAM,
  AGENT_SETUP_OPEN_TEST_VALUE,
} from '@/components/setup-checklist/workspaceSetupChecklistNavigation';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { usePermissions } from '@/hooks/usePermissions';
import { Permission } from '../../shared/permissions';

export default function InstructionsPage() {
  const { agentId } = useParams();
  const selectedAgentId = agentId as Id<'agents'> | undefined;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [responseLength, setResponseLength] = useState<ResponseLength>('brief');
  const [emojiUse, setEmojiUse] = useState<EmojiUse>('occasional');
  const [formality, setFormality] = useState<Formality>('conversational');
  const [humorLevel, setHumorLevel] = useState<HumorLevel>('light');
  const [replyMode, setReplyMode] = useState<ReplyMode>('automatic');
  const [isPublishing, setIsPublishing] = useState(false);
  const [isTestOpen, setIsTestOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateAgent = useMutation(api.agents.update);
  const updateRoutingSettings = useMutation(api.leadRouting.settings.updateForAgent);

  useEffect(() => {
    if (searchParams.get(AGENT_SETUP_OPEN_TEST_PARAM) !== AGENT_SETUP_OPEN_TEST_VALUE) {
      return;
    }
    setIsTestOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete(AGENT_SETUP_OPEN_TEST_PARAM);
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!agent) return;
    setName(agent.name);
    setTemplateKey(agent.templateKey);
    setModel(agent.model);
    setSystemPrompt(agent.systemPrompt);
    setResponseLength((agent.responseLength ?? 'brief') as ResponseLength);
    setEmojiUse((agent.emojiUse ?? 'occasional') as EmojiUse);
    setFormality((agent.formality ?? 'conversational') as Formality);
    setHumorLevel((agent.humorLevel ?? 'light') as HumorLevel);
  }, [agent]);
  useEffect(() => {
    if (!routingSettings) return;
    setReplyMode(routingSettings.aiEnabledOnInbound ? 'automatic' : 'manual');
  }, [routingSettings]);

  const hasBasicChanges = agent ? (
    name !== agent.name ||
    model !== agent.model ||
    templateKey !== agent.templateKey ||
    systemPrompt !== agent.systemPrompt ||
    responseLength !== ((agent.responseLength ?? 'brief') as ResponseLength) ||
    emojiUse !== ((agent.emojiUse ?? 'occasional') as EmojiUse) ||
    formality !== ((agent.formality ?? 'conversational') as Formality) ||
    humorLevel !== ((agent.humorLevel ?? 'light') as HumorLevel)
  ) : false;
  const savedReplyMode: ReplyMode | null = routingSettings
    ? routingSettings.aiEnabledOnInbound
      ? 'automatic'
      : 'manual'
    : null;
  const hasReplyModeChanges = savedReplyMode !== null && replyMode !== savedReplyMode;
  const isDirty = hasBasicChanges || hasReplyModeChanges;
  const canPublish = Boolean(
    isDirty &&
    name.trim() &&
    systemPrompt.trim() &&
    (!hasReplyModeChanges || canManageRouting),
  );
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname,
  );
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);
  const applyTemplate = (key: AgentTemplateKey) => {
    setTemplateKey(key);
    setSystemPrompt(AGENT_TEMPLATES[key].prompt);
  };
  const handlePublish = async () => {
    if (!selectedAgentId || !agent || !canPublish) return;
    setIsPublishing(true);
    setError(null);
    try {
      if (hasBasicChanges) {
        await updateAgent({
          agentId: selectedAgentId,
          name,
          model,
          systemPrompt,
          templateKey,
          responseLength,
          emojiUse,
          formality,
          humorLevel,
        });
      }
      if (hasReplyModeChanges && canManageRouting && routingSettings) {
        await updateRoutingSettings({
          agentId: selectedAgentId,
          aiEnabledOnInbound: replyMode === 'automatic',
        });
      }
      toast.success('Configuration published');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to publish configuration');
      toast.error('Failed to publish configuration');
    } finally {
      setIsPublishing(false);
    }
  };
  if (permissionsLoading || agent === undefined) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    );
  }
  if (!can(Permission.AGENTS_MANAGE)) {
    return <Navigate to={`/dashboard/${agentId}/knowledge-base/web`} replace />;
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
  const isRoutingSettingsLoading = canReadRouting && routingSettings === undefined;
  return (
    <div className="flex w-full max-w-none flex-col gap-6">
      <AgentSetupHeader
        hasChanges={isDirty}
        isPublishing={isPublishing}
        canPublish={canPublish}
        onPublish={() => void handlePublish()}
        onTest={() => setIsTestOpen((current) => !current)}
      />

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <AgentSetupPanels
        agentId={selectedAgentId}
        name={name}
        model={model}
        models={enabledModels}
        systemPrompt={systemPrompt}
        responseLength={responseLength}
        emojiUse={emojiUse}
        formality={formality}
        humorLevel={humorLevel}
        canReadRouting={canReadRouting}
        canManageRouting={canManageRouting}
        isRoutingSettingsLoading={isRoutingSettingsLoading}
        isPublishing={isPublishing}
        replyMode={replyMode}
        isTestOpen={isTestOpen}
        onNameChange={setName}
        onModelChange={setModel}
        onSystemPromptChange={setSystemPrompt}
        onApplyTemplate={applyTemplate}
        onResponseLengthChange={setResponseLength}
        onEmojiUseChange={setEmojiUse}
        onFormalityChange={setFormality}
        onHumorLevelChange={setHumorLevel}
        onReplyModeChange={setReplyMode}
        onTestOpenChange={setIsTestOpen}
      />

      <UnsavedChangesDialog
        open={blocker.state === 'blocked'}
        onOpenChange={(open) => {
          if (!open) {
            blocker.reset?.();
          }
        }}
        onKeepEditing={() => blocker.reset?.()}
        onDiscard={() => blocker.proceed?.()}
      />
    </div>
  );
}
