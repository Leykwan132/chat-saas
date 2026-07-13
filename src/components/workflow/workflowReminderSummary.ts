import {
  useWorkflowAutomationSelection,
  useWorkflowAutomationState,
} from './workflowAutomationContext';
import {
  getWorkflowReminderScheduleStep,
  type WorkflowReminderScheduleStepKey,
} from './workflowReminderOptions';
import type {
  WorkflowAutomationStepKey,
  WorkflowAutomationStepOption,
} from './workflowTriggerOptions';
import { getWorkflowWhatsappTemplateDetail } from './workflowWhatsappTemplates';
import { getWhatsAppRateForCategory } from '@/lib/whatsappRates';

type WorkflowReminderTimingSelection = Pick<
  WorkflowAutomationStepOption,
  'id' | 'label' | 'summaryLabel'
>;

function useReminderSelectedOption(
  stepKey: WorkflowAutomationStepKey,
  defaultOptionId: string,
) {
  const { selectedOptionId, setSelectedOptionId } =
    useWorkflowAutomationSelection('reminders', stepKey, defaultOptionId);
  const step = getWorkflowReminderScheduleStep(
    stepKey as WorkflowReminderScheduleStepKey,
  );
  if (!step) {
    throw new Error(`Unknown reminder schedule step: ${stepKey}`);
  }

  const selectedOption = step.options.find((option) => option.id === selectedOptionId);
  if (!selectedOption) {
    throw new Error(`Unknown reminder option: ${stepKey}.${selectedOptionId}`);
  }

  return { selectedOption, selectedOptionId, setSelectedOptionId, step };
}

function getReminderCount(option: WorkflowAutomationStepOption) {
  const count = Number(option.summaryLabel ?? option.label);
  if (!Number.isFinite(count)) {
    throw new Error(`Unknown reminder count option: ${option.id}`);
  }

  return count;
}

function joinReminderTimingLabels(labels: string[]) {
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;

  return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`;
}

export function useWorkflowReminderScheduleField(
  stepKey: WorkflowReminderScheduleStepKey,
) {
  const step = getWorkflowReminderScheduleStep(stepKey);
  if (!step) {
    throw new Error(`Unknown reminder schedule step: ${stepKey}`);
  }

  return useReminderSelectedOption(
    stepKey,
    step.defaultOptionId ?? step.options[0].id,
  );
}

export function useWorkflowReminderTimingField() {
  const {
    reminderCustomTimingOptions,
    reminderTimingOptionIds,
    setReminderTimingOptionIds,
  } =
    useWorkflowAutomationState();
  const step = getWorkflowReminderScheduleStep('timing');
  if (!step) {
    throw new Error('Unknown reminder schedule step: timing');
  }

  const options: WorkflowReminderTimingSelection[] = [
    ...step.options,
    ...reminderCustomTimingOptions,
  ];
  const selectedOptions = reminderTimingOptionIds.map((optionId) => {
    const option = options.find((stepOption) => stepOption.id === optionId);
    if (!option) {
      throw new Error(`Unknown reminder timing option: ${optionId}`);
    }
    return option;
  });

  return {
    options,
    selectedOptionIds: reminderTimingOptionIds,
    selectedOptions,
    setSelectedOptionIds: setReminderTimingOptionIds,
    step,
  };
}

export function useWorkflowReminderSummary() {
  const { reminderTemplate } = useWorkflowAutomationState();
  const maxAttempts =
    useWorkflowReminderScheduleField('maxAttempts').selectedOption;
  const timingField = useWorkflowReminderTimingField();
  const maxAttemptsLabel = maxAttempts.summaryLabel ?? maxAttempts.label;
  const maxReminderCount = getReminderCount(maxAttempts);
  const timingOptions = timingField.selectedOptions.slice(0, maxReminderCount);
  if (timingOptions.length === 0) {
    throw new Error('Reminder timing selection is missing');
  }

  const timingLabels = timingOptions.map((option) => (
    option.summaryLabel ?? option.label
  ));
  const timingLabel = joinReminderTimingLabels(timingLabels);
  const reminderMessageLabel =
    Number.isFinite(maxReminderCount) && maxReminderCount === 1
      ? 'reminder message'
      : 'reminder messages';
  const estimateCost = reminderTemplate && Number.isFinite(maxReminderCount)
    ? getWhatsAppRateForCategory(reminderTemplate.category) * maxReminderCount
    : undefined;
  const templateEstimate = estimateCost === undefined
    ? undefined
    : {
      label: `~RM ${estimateCost.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} / booked appointment`,
    };
  const messageCardLabel = reminderTemplate?.name ?? 'Choose message';
  const messageCardDetail = reminderTemplate
    ? getWorkflowWhatsappTemplateDetail(reminderTemplate)
    : 'Select the approved template for booked appointments';

  return {
    maxAttempts,
    maxAttemptsLabel,
    maxReminderCount,
    reminderMessageLabel,
    timingOptions,
    timingLabel,
    timingCardLabel: timingOptions.length === maxReminderCount
      ? timingLabel
      : `${timingOptions.length}/${maxReminderCount} times selected`,
    timingCardDetail: joinReminderTimingLabels(
      timingOptions.map((option) => option.label),
    ),
    templateEstimate,
    messageCardLabel,
    messageCardDetail,
  };
}
