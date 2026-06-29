import {
  BellRing,
  CalendarClock,
  Clock3,
  MessageSquareText,
  ReceiptText,
} from 'lucide-react';
import type {
  WorkflowAutomationStep,
  WorkflowAutomationStepKey,
  WorkflowAutomationStepOption,
} from './workflowTriggerOptions';

export const workflowReminderScheduleStepKeys = [
  'maxAttempts',
  'timing',
] as const satisfies readonly WorkflowAutomationStepKey[];

export type WorkflowReminderScheduleStepKey =
  (typeof workflowReminderScheduleStepKeys)[number];

export type WorkflowReminderTimingUnit = 'minutes' | 'hours' | 'days' | 'weeks';

export type WorkflowReminderTimingParts = {
  amount: number;
  unit: WorkflowReminderTimingUnit;
};

export type WorkflowReminderTimingOption =
  Omit<WorkflowAutomationStepOption, 'summaryLabel'> &
  WorkflowReminderTimingParts & {
    summaryLabel: string;
  };

export const workflowReminderTimingUnitOptions = [
  { value: 'minutes', label: 'minutes' },
  { value: 'hours', label: 'hours' },
  { value: 'days', label: 'days' },
  { value: 'weeks', label: 'weeks' },
] as const satisfies readonly {
  value: WorkflowReminderTimingUnit;
  label: string;
}[];

export const workflowReminderTimingAmountOptions = {
  minutes: [5, 10, 15, 30, 45],
  hours: [1, 2, 3, 6, 12],
  days: [1, 2, 3],
  weeks: [1, 2],
} as const satisfies Record<WorkflowReminderTimingUnit, readonly number[]>;

export const DEFAULT_WORKFLOW_REMINDER_TIMING_OPTION_IDS = [
  'threeHoursBeforeAppointment',
] as const;

export function formatWorkflowReminderCustomTimingLabel(
  amount: number,
  unit: WorkflowReminderTimingUnit,
) {
  const unitLabel = amount === 1 ? unit.slice(0, -1) : unit;
  return `${amount} ${unitLabel}`;
}

export function getWorkflowReminderCustomTimingId(
  amount: number,
  unit: WorkflowReminderTimingUnit,
) {
  return `customReminderTiming:${amount}:${unit}`;
}

const legacyReminderTimingParts: Record<string, WorkflowReminderTimingParts> = {
  oneWeekBeforeAppointment: { amount: 1, unit: 'weeks' },
  threeDaysBeforeAppointment: { amount: 3, unit: 'days' },
  twoDaysBeforeAppointment: { amount: 2, unit: 'days' },
  oneDayBeforeAppointment: { amount: 1, unit: 'days' },
  twelveHoursBeforeAppointment: { amount: 12, unit: 'hours' },
  sixHoursBeforeAppointment: { amount: 6, unit: 'hours' },
  threeHoursBeforeAppointment: { amount: 3, unit: 'hours' },
  twoHoursBeforeAppointment: { amount: 2, unit: 'hours' },
  oneHourBeforeAppointment: { amount: 1, unit: 'hours' },
  thirtyMinutesBeforeAppointment: { amount: 30, unit: 'minutes' },
  fifteenMinutesBeforeAppointment: { amount: 15, unit: 'minutes' },
};

export function getWorkflowReminderTimingParts(optionId: string) {
  const legacyParts = legacyReminderTimingParts[optionId];
  if (legacyParts) return legacyParts;

  const [, amountValue, unitValue] =
    /^customReminderTiming:(\d+):(minutes|hours|days|weeks)$/.exec(optionId) ?? [];
  if (!amountValue || !unitValue) return undefined;

  return {
    amount: Number(amountValue),
    unit: unitValue as WorkflowReminderTimingUnit,
  };
}

export function createWorkflowReminderTimingOption({
  amount,
  unit,
}: WorkflowReminderTimingParts): WorkflowReminderTimingOption {
  const timingLabel = formatWorkflowReminderCustomTimingLabel(amount, unit);
  const Icon = unit === 'minutes' ? BellRing : unit === 'hours' ? Clock3 : CalendarClock;

  return {
    id: getWorkflowReminderCustomTimingId(amount, unit),
    label: `${timingLabel} before`,
    description: `Remind the customer ${timingLabel} before the booked appointment.`,
    summaryLabel: `${timingLabel} before`,
    Icon,
    amount,
    unit,
  };
}

const reminderCountOptions: [WorkflowAutomationStepOption, ...WorkflowAutomationStepOption[]] = [
  {
    id: 'reminderCount1',
    label: '1 reminder',
    description: 'Send one reminder for each booked appointment.',
    summaryLabel: '1',
    Icon: BellRing,
  },
];

export const workflowReminderScheduleSteps = [
  {
    key: 'maxAttempts',
    label: 'Number of reminders',
    emptyLabel: 'Choose reminder count',
    menuLabel: 'How many reminders should be sent?',
    defaultOptionId: 'reminderCount1',
    options: reminderCountOptions,
  },
  {
    key: 'timing',
    label: 'When to remind',
    emptyLabel: 'Choose reminder timing',
    menuLabel: 'When should the reminder go out?',
    options: [
      {
        id: 'threeHoursBeforeAppointment',
        label: '3 hours before',
        description: 'Remind the customer a few hours before the booked appointment.',
        summaryLabel: '3 hours before',
        Icon: Clock3,
      },
      {
        id: 'oneDayBeforeAppointment',
        label: '1 day before',
        description: 'Remind the customer the day before the booked appointment.',
        summaryLabel: '1 day before',
        Icon: CalendarClock,
      },
      {
        id: 'oneHourBeforeAppointment',
        label: '1 hour before',
        description: 'Remind the customer shortly before the booked appointment.',
        summaryLabel: '1 hour before',
        Icon: Clock3,
      },
      {
        id: 'thirtyMinutesBeforeAppointment',
        label: '30 minutes before',
        description: 'Remind the customer right before the booked appointment.',
        summaryLabel: '30 minutes before',
        Icon: BellRing,
      },
    ],
  },
] satisfies WorkflowAutomationStep[];

export function getWorkflowReminderScheduleStep(
  stepKey: WorkflowReminderScheduleStepKey,
) {
  return workflowReminderScheduleSteps.find((step) => step.key === stepKey);
}

export const workflowReminderSteps = [
  ...workflowReminderScheduleSteps,
  {
    key: 'template',
    label: 'Message',
    emptyLabel: 'Choose message',
    menuLabel: 'Which appointment reminder message should be sent?',
    options: [
      {
        id: 'appointmentReminder',
        label: 'Appointment reminder',
        description: 'Utility template for an upcoming appointment.',
        Icon: ReceiptText,
        estimatedCostMyr: 0.3467,
      },
      {
        id: 'customReminderTemplate',
        label: 'Custom template',
        description: 'Use a different approved reminder template.',
        Icon: MessageSquareText,
        estimatedCostMyr: 0.3467,
      },
    ],
  },
] satisfies WorkflowAutomationStep[];
