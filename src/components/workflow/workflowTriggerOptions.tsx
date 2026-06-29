import type { LucideIcon } from 'lucide-react';
import type { WorkflowAutomationNodeKind } from './workflowTypes';
import { workflowFollowupSteps } from './workflowFollowupOptions';
import { workflowReminderSteps } from './workflowReminderOptions';

export const workflowAutomationStepKeys = [
  'recipient',
  'timing',
  'audience',
  'schedule',
  'startAfter',
  'interval',
  'maxAttempts',
  'template',
] as const;

export type WorkflowAutomationStepKey = (typeof workflowAutomationStepKeys)[number];

export type WorkflowAutomationStepOption = {
  id: string;
  label: string;
  description: string;
  Icon: LucideIcon;
  summaryLabel?: string;
  previewComponents?: Array<{
    type: 'BODY' | 'FOOTER';
    text: string;
  }>;
  estimatedCostMyr?: number;
};

export type WorkflowAutomationStep = {
  key: WorkflowAutomationStepKey;
  label: string;
  emptyLabel: string;
  menuLabel: string;
  defaultOptionId?: string;
  options: [WorkflowAutomationStepOption, ...WorkflowAutomationStepOption[]];
};

export const workflowAutomationSteps: Record<
  WorkflowAutomationNodeKind,
  WorkflowAutomationStep[]
> = {
  reminders: workflowReminderSteps,
  followups: workflowFollowupSteps,
};

export function getWorkflowAutomationStep(
  kind: WorkflowAutomationNodeKind,
  stepKey: WorkflowAutomationStepKey,
) {
  return workflowAutomationSteps[kind].find((step) => step.key === stepKey);
}

export function getWorkflowAutomationOption(
  step: WorkflowAutomationStep,
  optionId: string,
) {
  return step.options.find((option) => option.id === optionId);
}

export function getWorkflowAutomationEstimateLabel(option: WorkflowAutomationStepOption) {
  if (option.estimatedCostMyr === undefined) return undefined;

  return {
    label: `~RM ${option.estimatedCostMyr.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} / recipient`,
  };
}
