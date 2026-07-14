import { createContext, useContext } from 'react';
import type { Id } from '../../../convex/_generated/dataModel';
import type {
  WorkflowAutomationActivationScope,
  WorkflowAutomationConfigs,
  WorkflowReminderCustomTiming as WorkflowReminderCustomTimingOption,
} from '../../../shared/workflowAutomations';
import type { WorkflowAutomationNodeKind } from './workflowTypes';
import type { WorkflowAutomationStepKey } from './workflowTriggerOptions';
import type { WorkflowFollowupTemplateSelection } from './workflowWhatsappTemplates';

export type WorkflowFollowupMessageStrategy = 'same' | 'different';

export type WorkflowAutomationStateContextValue = {
  configs: WorkflowAutomationConfigs;
  agentId?: Id<'agents'>;
  selections: Record<WorkflowAutomationNodeKind, Record<string, string>>;
  reminderCustomTimingOptions: WorkflowReminderCustomTimingOption[];
  reminderTemplate?: WorkflowFollowupTemplateSelection;
  reminderTimingOptionIds: string[];
  followupAudienceFilters: string[];
  followupMessageStrategy: WorkflowFollowupMessageStrategy;
  followupSameTemplate?: WorkflowFollowupTemplateSelection;
  followupAttemptTemplates: WorkflowFollowupTemplateSelection[];
  setEnabled: (kind: WorkflowAutomationNodeKind, enabled: boolean) => void;
  setActivationScope: (
    kind: WorkflowAutomationNodeKind,
    scope: WorkflowAutomationActivationScope | undefined,
  ) => void;
  setSelection: (
    kind: WorkflowAutomationNodeKind,
    stepKey: WorkflowAutomationStepKey,
    optionId: string,
  ) => void;
  setReminderCustomTimingOption: (option: WorkflowReminderCustomTimingOption) => void;
  setReminderTemplate: (template: WorkflowFollowupTemplateSelection) => void;
  setReminderTimingOptionIds: (optionIds: string[]) => void;
  setFollowupAudienceFilters: (filters: string[]) => void;
  setFollowupMessageStrategy: (strategy: WorkflowFollowupMessageStrategy) => void;
  setFollowupSameTemplate: (template: WorkflowFollowupTemplateSelection) => void;
  setFollowupAttemptTemplate: (
    attemptIndex: number,
    template: WorkflowFollowupTemplateSelection,
  ) => void;
};

export const WorkflowAutomationStateContext =
  createContext<WorkflowAutomationStateContextValue | null>(null);

export function useWorkflowAutomationState() {
  const context = useContext(WorkflowAutomationStateContext);
  if (!context) throw new Error('Workflow automation state is missing');
  return context;
}

export function useWorkflowAutomationSelection(
  kind: WorkflowAutomationNodeKind,
  stepKey: WorkflowAutomationStepKey,
  defaultOptionId: string,
) {
  const context = useWorkflowAutomationState();
  return {
    selectedOptionId: context.selections[kind][stepKey] ?? defaultOptionId,
    setSelectedOptionId: (optionId: string) => context.setSelection(kind, stepKey, optionId),
  };
}
