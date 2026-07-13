import {
  useWorkflowAutomationSelection,
  useWorkflowAutomationState,
} from './workflowAutomationContext';
import {
  getWorkflowFollowupAudienceDetail,
  getWorkflowFollowupAudienceLabel,
} from './workflowFollowupAudienceLabels';
import {
  getWorkflowFollowupScheduleStep,
  type WorkflowFollowupScheduleStepKey,
} from './workflowFollowupOptions';
import {
  getWorkflowAutomationOption,
  getWorkflowAutomationStep,
  type WorkflowAutomationStep,
  type WorkflowAutomationStepKey,
} from './workflowTriggerOptions';
import { getWorkflowWhatsappTemplateDetail } from './workflowWhatsappTemplates';
import { getWhatsAppRateForCategory } from '@/lib/whatsappRates';

type FollowupVisibleStepKey = Extract<
  WorkflowAutomationStepKey,
  'audience' | 'schedule' | 'template'
>;

function useFollowupSelectedOption(
  step: WorkflowAutomationStep,
  stepKey: WorkflowAutomationStepKey,
) {
  const { selectedOptionId, setSelectedOptionId } =
    useWorkflowAutomationSelection(
      'followups',
      stepKey,
      step.defaultOptionId ?? step.options[0].id,
    );
  const selectedOption = getWorkflowAutomationOption(step, selectedOptionId);
  if (!selectedOption) {
    throw new Error(`Unknown follow-up option: ${stepKey}.${selectedOptionId}`);
  }

  return { selectedOption, selectedOptionId, setSelectedOptionId, step };
}

export function useWorkflowFollowupVisibleField(
  stepKey: FollowupVisibleStepKey,
) {
  const step = getWorkflowAutomationStep('followups', stepKey);
  if (!step) {
    throw new Error(`Unknown follow-up step: ${stepKey}`);
  }

  return useFollowupSelectedOption(step, stepKey);
}

export function useWorkflowFollowupScheduleField(
  stepKey: WorkflowFollowupScheduleStepKey,
) {
  const step = getWorkflowFollowupScheduleStep(stepKey);
  if (!step) {
    throw new Error(`Unknown follow-up schedule step: ${stepKey}`);
  }

  return useFollowupSelectedOption(step, stepKey);
}

export function useWorkflowFollowupSummary() {
  const {
    followupAttemptTemplates,
    followupAudienceFilters,
    followupMessageStrategy,
    followupSameTemplate,
  } = useWorkflowAutomationState();
  const startAfter = useWorkflowFollowupScheduleField('startAfter').selectedOption;
  const interval = useWorkflowFollowupScheduleField('interval').selectedOption;
  const maxAttempts = useWorkflowFollowupScheduleField('maxAttempts').selectedOption;
  const maxAttemptsLabel = maxAttempts.summaryLabel ?? maxAttempts.label;
  const maxAttemptsCount = Number(maxAttemptsLabel);
  const followupMessageLabel = Number.isFinite(maxAttemptsCount) && maxAttemptsCount === 1
    ? 'follow-up message'
    : 'follow-up messages';
  const configuredAttemptCount = followupAttemptTemplates
    .slice(0, Number.isFinite(maxAttemptsCount) ? maxAttemptsCount : 1)
    .filter(Boolean).length;
  const sameMessageCost = followupSameTemplate && Number.isFinite(maxAttemptsCount)
    ? getWhatsAppRateForCategory(followupSameTemplate.category) * maxAttemptsCount
    : undefined;
  const differentMessageCost = Number.isFinite(maxAttemptsCount)
    ? followupAttemptTemplates
      .slice(0, maxAttemptsCount)
      .reduce((total, template) => (
        template ? total + getWhatsAppRateForCategory(template.category) : total
      ), 0)
    : undefined;
  const estimateCost = followupMessageStrategy === 'same'
    ? sameMessageCost
    : configuredAttemptCount === maxAttemptsCount
      ? differentMessageCost
      : undefined;
  const templateEstimate = estimateCost === undefined
    ? undefined
    : {
      label: `~RM ${estimateCost.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} / recipient`,
    };
  const messageCardLabel = followupMessageStrategy === 'same'
    ? followupSameTemplate?.name ?? 'Choose message'
    : 'Different messages';
  const messageCardDetail = followupMessageStrategy === 'same'
    ? followupSameTemplate
      ? getWorkflowWhatsappTemplateDetail(followupSameTemplate)
      : `Select one template for all ${maxAttemptsLabel}`
    : `${configuredAttemptCount}/${maxAttemptsLabel} messages selected`;

  return {
    audience: {
      label: getWorkflowFollowupAudienceLabel(followupAudienceFilters),
      detail: getWorkflowFollowupAudienceDetail(followupAudienceFilters),
    },
    configuredAttemptCount,
    followupMessageStrategy,
    followupSameTemplate,
    startAfter,
    interval,
    maxAttempts,
    maxAttemptsLabel,
    followupMessageLabel,
    templateEstimate,
    messageCardLabel,
    messageCardDetail,
    audienceCardLabel: getWorkflowFollowupAudienceLabel(followupAudienceFilters),
    audienceCardDetail: getWorkflowFollowupAudienceDetail(followupAudienceFilters),
    scheduleCardLabel: startAfter.label,
    scheduleCardDetail: `Every ${interval.summaryLabel ?? interval.label}, max ${maxAttemptsLabel}`,
  };
}
