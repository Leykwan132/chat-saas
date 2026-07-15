import { CalendarClock, Clock3 } from 'lucide-react';
import type { WorkflowFollowupStartAfterSelection } from '../../../shared/workflowAutomations';
import type { WorkflowAutomationStepOption } from './workflowTriggerOptions';

export type WorkflowFollowupStartAfterUnit =
  WorkflowFollowupStartAfterSelection['unit'];

export type WorkflowFollowupStartAfterParts = {
  amount: number;
  unit: WorkflowFollowupStartAfterUnit;
};

export type WorkflowFollowupStartAfterOption =
  WorkflowFollowupStartAfterSelection &
  WorkflowAutomationStepOption;

export const workflowFollowupStartAfterUnitOptions = [
  { value: 'minutes', label: 'minutes' },
  { value: 'hours', label: 'hours' },
  { value: 'days', label: 'days' },
  { value: 'weeks', label: 'weeks' },
] as const satisfies readonly {
  value: WorkflowFollowupStartAfterUnit;
  label: string;
}[];

const unitMinutes: Record<WorkflowFollowupStartAfterUnit, number> = {
  minutes: 1,
  hours: 60,
  days: 1440,
  weeks: 10080,
};

function requirePositiveInteger(amount: number) {
  if (!Number.isInteger(amount) || amount < 1) {
    throw new Error('Start after amount must be a positive integer');
  }
}

export function formatWorkflowFollowupStartAfterLabel(
  amount: number,
  unit: WorkflowFollowupStartAfterUnit,
) {
  requirePositiveInteger(amount);
  const unitLabel = amount === 1 ? unit.slice(0, -1) : unit;
  return `${amount} ${unitLabel}`;
}

export function toWorkflowFollowupStartAfterMinutes(
  amount: number,
  unit: WorkflowFollowupStartAfterUnit,
) {
  requirePositiveInteger(amount);
  return amount * unitMinutes[unit];
}

export function getWorkflowFollowupStartAfterParts(optionId: string) {
  const presetMatch = /^startAfter(\d+)h$/.exec(optionId);
  if (presetMatch) {
    return {
      amount: Number(presetMatch[1]),
      unit: 'hours' as const,
    };
  }

  const customMatch =
    /^customFollowupStartAfter:(\d+):(minutes|hours|days|weeks)$/.exec(optionId);
  if (!customMatch) return undefined;

  return {
    amount: Number(customMatch[1]),
    unit: customMatch[2] as WorkflowFollowupStartAfterUnit,
  };
}

export function createWorkflowFollowupStartAfterOption({
  amount,
  unit,
}: WorkflowFollowupStartAfterParts): WorkflowFollowupStartAfterOption {
  const label = formatWorkflowFollowupStartAfterLabel(amount, unit);
  return {
    amount,
    unit,
    id: `customFollowupStartAfter:${amount}:${unit}`,
    label,
    description: 'Start the follow-up sequence after the conversation goes quiet.',
    summaryLabel: label,
    startAfterMinutes: toWorkflowFollowupStartAfterMinutes(amount, unit),
    Icon: unit === 'minutes' || unit === 'hours' ? Clock3 : CalendarClock,
  };
}
