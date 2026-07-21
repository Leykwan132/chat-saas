import { useMemo, type ReactNode } from 'react';
import {
  applyWorkflowFollowupStartAfter,
  applyWorkflowReminderCustomTiming,
  type WorkflowAutomationConfigs,
} from '../../../shared/workflowAutomations';
import type { Id } from '../../../convex/_generated/dataModel';
import {
  WorkflowAutomationStateContext,
  type WorkflowAutomationStateContextValue,
  type WorkflowCanvasDataMode,
} from './workflowAutomationContext';

export function WorkflowAutomationStateProvider({
  children,
  configs,
  dataMode,
  agentId,
  onChange,
}: {
  children: ReactNode;
  configs: WorkflowAutomationConfigs;
  dataMode: WorkflowCanvasDataMode;
  agentId?: Id<'agents'>;
  onChange: (configs: WorkflowAutomationConfigs) => void;
}) {
  const value = useMemo<WorkflowAutomationStateContextValue>(() => {
    const updateReminder = (patch: Partial<WorkflowAutomationConfigs['reminder']>) => onChange({
      ...configs,
      reminder: { ...configs.reminder, ...patch },
    });
    const updateFollowUp = (patch: Partial<WorkflowAutomationConfigs['followUp']>) => onChange({
      ...configs,
      followUp: { ...configs.followUp, ...patch },
    });
    return ({
    configs,
    dataMode,
    agentId,
    selections: {
      reminders: configs.reminder.selections,
      followups: configs.followUp.selections,
    },
    reminderCustomTimingOptions: configs.reminder.customTimingOptions,
    reminderTemplate: configs.reminder.template,
    reminderTimingOptionIds: configs.reminder.timingOptionIds,
    followupAudienceFilters: configs.followUp.audienceFilters,
    followupCustomStartAfter: configs.followUp.customStartAfter,
    followupMessageStrategy: configs.followUp.messageStrategy,
    followupSameTemplate: configs.followUp.sameTemplate,
    followupAttemptTemplates: configs.followUp.attemptTemplates,
    setEnabled: (kind, enabled) => (
      kind === 'reminders' ? updateReminder({ enabled }) : updateFollowUp({ enabled })
    ),
    setActivationScope: (kind, activationScope) => (
      kind === 'reminders'
        ? updateReminder({ activationScope })
        : updateFollowUp({ activationScope })
    ),
    setSelection: (kind, stepKey, optionId) => {
      const current = kind === 'reminders' ? configs.reminder : configs.followUp;
      const selections = { ...current.selections, [stepKey]: optionId };
      if (kind === 'reminders') updateReminder({ selections });
      else updateFollowUp({ selections });
    },
    setReminderCustomTimingOption: (option) => {
      updateReminder(applyWorkflowReminderCustomTiming(configs.reminder, option));
    },
    setReminderTemplate: (template) => updateReminder({ template }),
    setReminderTimingOptionIds: (timingOptionIds) => updateReminder({ timingOptionIds }),
    setFollowupAudienceFilters: (audienceFilters) => updateFollowUp({ audienceFilters }),
    setFollowupStartAfterOption: (option) => {
      updateFollowUp(applyWorkflowFollowupStartAfter(configs.followUp, option));
    },
    setFollowupMessageStrategy: (messageStrategy) => updateFollowUp({ messageStrategy }),
    setFollowupSameTemplate: (sameTemplate) => updateFollowUp({ sameTemplate }),
    setFollowupAttemptTemplate: (attemptIndex, template) => {
      const attemptTemplates = [...configs.followUp.attemptTemplates];
      attemptTemplates[attemptIndex] = template;
      updateFollowUp({ attemptTemplates });
    },
    });
  }, [agentId, configs, dataMode, onChange]);

  return (
    <WorkflowAutomationStateContext.Provider value={value}>
      {children}
    </WorkflowAutomationStateContext.Provider>
  );
}
