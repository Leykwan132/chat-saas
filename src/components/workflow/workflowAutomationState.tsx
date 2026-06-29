import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { WorkflowAutomationNodeKind } from './workflowTypes';
import { DEFAULT_WORKFLOW_FOLLOWUP_AUDIENCE_FILTERS } from './workflowFollowupAudienceLabels';
import { workflowFollowupScheduleSteps } from './workflowFollowupOptions';
import {
  DEFAULT_WORKFLOW_REMINDER_TIMING_OPTION_IDS,
  type WorkflowReminderTimingUnit,
} from './workflowReminderOptions';
import {
  workflowAutomationSteps,
  type WorkflowAutomationStepKey,
} from './workflowTriggerOptions';
import type { WorkflowFollowupTemplateSelection } from './workflowWhatsappTemplates';

type WorkflowAutomationSelections = Record<
  WorkflowAutomationNodeKind,
  Partial<Record<WorkflowAutomationStepKey, string>>
>;

export type WorkflowFollowupMessageStrategy = 'same' | 'different';

export type WorkflowReminderCustomTimingOption = {
  amount: number;
  id: string;
  label: string;
  summaryLabel: string;
  unit: WorkflowReminderTimingUnit;
};

type WorkflowAutomationStateContextValue = {
  selections: WorkflowAutomationSelections;
  reminderCustomTimingOptions: WorkflowReminderCustomTimingOption[];
  reminderTemplate?: WorkflowFollowupTemplateSelection;
  reminderTimingOptionIds: string[];
  followupAudienceFilters: string[];
  followupMessageStrategy: WorkflowFollowupMessageStrategy;
  followupSameTemplate?: WorkflowFollowupTemplateSelection;
  followupAttemptTemplates: WorkflowFollowupTemplateSelection[];
  setSelection: (
    kind: WorkflowAutomationNodeKind,
    stepKey: WorkflowAutomationStepKey,
    optionId: string,
  ) => void;
  addReminderCustomTimingOption: (option: WorkflowReminderCustomTimingOption) => void;
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

const WorkflowAutomationStateContext =
  createContext<WorkflowAutomationStateContextValue | null>(null);

function createInitialSelections(): WorkflowAutomationSelections {
  return {
    reminders: Object.fromEntries(
      workflowAutomationSteps.reminders.map((step) => [
        step.key,
        step.defaultOptionId ?? step.options[0].id,
      ]),
    ),
    followups: Object.fromEntries(
      [
        ...workflowAutomationSteps.followups,
        ...workflowFollowupScheduleSteps,
      ].map((step) => [
        step.key,
        step.defaultOptionId ?? step.options[0].id,
      ]),
    ),
  };
}

export function WorkflowAutomationStateProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [selections, setSelections] = useState(createInitialSelections);
  const [reminderCustomTimingOptions, setReminderCustomTimingOptions] = useState<
    WorkflowReminderCustomTimingOption[]
  >([]);
  const [reminderTemplate, setReminderTemplate] =
    useState<WorkflowFollowupTemplateSelection>();
  const [reminderTimingOptionIds, setReminderTimingOptionIds] = useState<string[]>(
    [...DEFAULT_WORKFLOW_REMINDER_TIMING_OPTION_IDS],
  );
  const [followupAudienceFilters, setFollowupAudienceFilters] = useState<string[]>(
    [...DEFAULT_WORKFLOW_FOLLOWUP_AUDIENCE_FILTERS],
  );
  const [followupMessageStrategy, setFollowupMessageStrategy] =
    useState<WorkflowFollowupMessageStrategy>('same');
  const [followupSameTemplate, setFollowupSameTemplate] =
    useState<WorkflowFollowupTemplateSelection>();
  const [followupAttemptTemplates, setFollowupAttemptTemplates] =
    useState<WorkflowFollowupTemplateSelection[]>([]);
  const value = useMemo<WorkflowAutomationStateContextValue>(() => ({
    selections,
    reminderCustomTimingOptions,
    reminderTemplate,
    reminderTimingOptionIds,
    followupAudienceFilters,
    followupMessageStrategy,
    followupSameTemplate,
    followupAttemptTemplates,
    setSelection: (kind, stepKey, optionId) => {
      setSelections((current) => ({
        ...current,
        [kind]: {
          ...current[kind],
          [stepKey]: optionId,
        },
      }));
    },
    addReminderCustomTimingOption: (option) => {
      setReminderCustomTimingOptions((current) => (
        current.some((currentOption) => currentOption.id === option.id)
          ? current
          : [...current, option]
      ));
    },
    setReminderTemplate,
    setReminderTimingOptionIds,
    setFollowupAudienceFilters,
    setFollowupMessageStrategy,
    setFollowupSameTemplate,
    setFollowupAttemptTemplate: (attemptIndex, template) => {
      setFollowupAttemptTemplates((current) => {
        const next = [...current];
        next[attemptIndex] = template;
        return next;
      });
    },
  }), [
    followupAttemptTemplates,
    followupAudienceFilters,
    followupMessageStrategy,
    followupSameTemplate,
    reminderCustomTimingOptions,
    reminderTemplate,
    reminderTimingOptionIds,
    selections,
  ]);

  return (
    <WorkflowAutomationStateContext.Provider value={value}>
      {children}
    </WorkflowAutomationStateContext.Provider>
  );
}

export function useWorkflowAutomationState() {
  const context = useContext(WorkflowAutomationStateContext);
  if (!context) {
    throw new Error('Workflow automation state is missing');
  }

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
    setSelectedOptionId: (optionId: string) => (
      context.setSelection(kind, stepKey, optionId)
    ),
  };
}
