import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HumanEscalationPanel } from './HumanEscalationPanel';
import type { AgentGoal } from '../../../shared/agentCreationGoals';
import type { Id } from '../../../convex/_generated/dataModel';
import type { ModelPickerOption } from '@/components/ModelPicker';
import { AgentPlaygroundPanel } from '@/components/AgentPlaygroundPanel';
import { AgentSetupConfigurationPanel } from '@/components/agent-setup/AgentSetupConfigurationPanel';
import { AgentSetupRoutingPanel } from '@/components/agent-setup/AgentSetupRoutingPanel';
import { AgentSetupSystemPromptPanel } from '@/components/agent-setup/AgentSetupSystemPromptPanel';
import type {
  EmojiUse,
  Formality,
  HumorLevel,
  ReplyMode,
  ResponseLength,
} from '@/components/agent-setup/agentSetupOptions';
import { cn } from '@/lib/utils';
import type { AiReplyAudience } from '../../../shared/aiReplyAudience';

type AgentSetupPanelsProps = {
  name: string;
  model: string;
  models: ModelPickerOption[] | undefined;
  systemPrompt: string;
  responseLength: ResponseLength;
  emojiUse: EmojiUse;
  formality: Formality;
  humorLevel: HumorLevel;
  canReadRouting: boolean;
  canManageRouting: boolean;
  isRoutingSettingsLoading: boolean;
  isPublishing: boolean;
  replyMode: ReplyMode;
  replyAudience: AiReplyAudience;
  onReplyAudienceChange: (value: AiReplyAudience) => void;
  agentId: Id<'agents'>;
  isTestOpen: boolean;
  onNameChange: (value: string) => void;
  onModelChange: (value: string) => void;
  onSystemPromptChange: (value: string) => void;
  onApplyTemplate: (goal: AgentGoal) => void;
  onResponseLengthChange: (value: ResponseLength) => void;
  onEmojiUseChange: (value: EmojiUse) => void;
  onFormalityChange: (value: Formality) => void;
  onHumorLevelChange: (value: HumorLevel) => void;
  onReplyModeChange: (value: ReplyMode) => void;
  onTestOpenChange: (open: boolean) => void;
  showModelPicker?: boolean;
};

export function AgentSetupPanels({
  name,
  model,
  models,
  systemPrompt,
  responseLength,
  emojiUse,
  formality,
  humorLevel,
  canReadRouting,
  canManageRouting,
  isRoutingSettingsLoading,
  isPublishing,
  replyMode,
  replyAudience,
  onReplyAudienceChange,
  agentId,
  isTestOpen,
  onNameChange,
  onModelChange,
  onSystemPromptChange,
  onApplyTemplate,
  onResponseLengthChange,
  onEmojiUseChange,
  onFormalityChange,
  onHumorLevelChange,
  onReplyModeChange,
  onTestOpenChange,
  showModelPicker = true,
}: AgentSetupPanelsProps) {
  return (
    <div
      className={cn(
        'grid min-w-0 gap-6',
        isTestOpen && 'xl:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_420px]',
      )}
    >
      <Tabs defaultValue="instructions" className="min-w-0 gap-6">
        <TabsList variant="pill" aria-label="Configuration settings">
          <TabsTrigger value="instructions">Instructions</TabsTrigger>
          <TabsTrigger value="model-style">Model &amp; Style</TabsTrigger>
          <TabsTrigger value="human-escalation">Human Escalation</TabsTrigger>
        </TabsList>
        <TabsContent value="instructions" forceMount className="max-w-4xl data-[state=inactive]:hidden">
          <AgentSetupSystemPromptPanel
            value={systemPrompt}
            onChange={onSystemPromptChange}
            onApplyTemplate={onApplyTemplate}
            workflowHref={`/dashboard/${agentId}/workflow`}
          />
        </TabsContent>
        <TabsContent value="model-style" forceMount className="@container data-[state=inactive]:hidden">
          <div className="grid min-w-0 gap-6 @3xl:grid-cols-2">
            <AgentSetupConfigurationPanel
              name={name}
              model={model}
              models={models}
              responseLength={responseLength}
              emojiUse={emojiUse}
              formality={formality}
              humorLevel={humorLevel}
              onNameChange={onNameChange}
              onModelChange={onModelChange}
              onResponseLengthChange={onResponseLengthChange}
              onEmojiUseChange={onEmojiUseChange}
              onFormalityChange={onFormalityChange}
              onHumorLevelChange={onHumorLevelChange}
              showModelPicker={showModelPicker}
            />
            <aside className="flex min-w-0 flex-col gap-6">
              <AgentSetupRoutingPanel
                canReadRouting={canReadRouting}
                canManageRouting={canManageRouting}
                isLoading={isRoutingSettingsLoading}
                isPublishing={isPublishing}
                replyMode={replyMode}
                replyAudience={replyAudience}
                onReplyAudienceChange={onReplyAudienceChange}
                onReplyModeChange={onReplyModeChange}
              />
            </aside>
          </div>
        </TabsContent>
        <TabsContent value="human-escalation" forceMount className="data-[state=inactive]:hidden">
          <HumanEscalationPanel agentId={agentId} />
        </TabsContent>
      </Tabs>
      <AgentPlaygroundPanel
        agentId={agentId}
        mode="inline"
        open={isTestOpen}
        onOpenChange={onTestOpenChange}
      />
    </div>
  );
}
