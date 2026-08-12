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
}: AgentSetupPanelsProps) {
  return (
    <div
      className={cn(
        'grid min-w-0 gap-6',
        isTestOpen
          ? 'xl:grid-cols-[minmax(0,1fr)_380px_380px] 2xl:grid-cols-[minmax(0,1fr)_420px_420px]'
          : 'xl:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_420px]',
      )}
    >
      <AgentSetupSystemPromptPanel
        value={systemPrompt}
        onChange={onSystemPromptChange}
        onApplyTemplate={onApplyTemplate}
        workflowHref={`/dashboard/${agentId}/workflow`}
      />
      <aside className="flex min-w-0 flex-col gap-6">
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
        />
        <AgentSetupRoutingPanel
          canReadRouting={canReadRouting}
          canManageRouting={canManageRouting}
          isLoading={isRoutingSettingsLoading}
          isPublishing={isPublishing}
          replyMode={replyMode}
          onReplyModeChange={onReplyModeChange}
        />
      </aside>
      <AgentPlaygroundPanel
        agentId={agentId}
        mode="inline"
        open={isTestOpen}
        onOpenChange={onTestOpenChange}
      />
    </div>
  );
}
