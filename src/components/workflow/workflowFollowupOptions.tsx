import {
  CalendarClock,
  Clock3,
  FileText,
  Flame,
  MessageSquareText,
  ReceiptText,
  Repeat,
  Tags,
  UserRoundCheck,
  UsersRound,
} from 'lucide-react';
import type {
  WorkflowAutomationStep,
  WorkflowAutomationStepKey,
  WorkflowAutomationStepOption,
} from './workflowTriggerOptions';

export const workflowFollowupScheduleStepKeys = [
  'startAfter',
  'interval',
  'maxAttempts',
] as const satisfies readonly WorkflowAutomationStepKey[];

export type WorkflowFollowupScheduleStepKey =
  (typeof workflowFollowupScheduleStepKeys)[number];

export function isWorkflowFollowupScheduleStepKey(
  stepKey: WorkflowAutomationStepKey,
) {
  return workflowFollowupScheduleStepKeys.includes(
    stepKey as (typeof workflowFollowupScheduleStepKeys)[number],
  );
}

const FOLLOWUP_DAY_OPTIONS = [
  { hours: 24, label: '1 day' },
  { hours: 48, label: '2 days' },
  { hours: 72, label: '3 days' },
  { hours: 120, label: '5 days' },
  { hours: 168, label: '7 days' },
] as const;

const followupMaxAttemptOptions = Array.from({ length: 10 }, (_, index) => {
  const count = index + 1;
  return {
    id: `maxAttempts${count}`,
    label: `${count} attempt${count === 1 ? '' : 's'}`,
    description: `Stop after ${count} attempt${count === 1 ? '' : 's'} per customer.`,
    summaryLabel: String(count),
    Icon: Repeat,
  };
}) as [WorkflowAutomationStepOption, ...WorkflowAutomationStepOption[]];

export const workflowFollowupScheduleSteps = [
  {
    key: 'startAfter',
    label: 'Start after',
    emptyLabel: 'Choose start delay',
    menuLabel: 'When should the first follow-up start?',
    options: FOLLOWUP_DAY_OPTIONS.map((option) => ({
      id: `startAfter${option.hours}h`,
      label: `${option.label} after no reply`,
      description: 'Start the follow-up sequence after the conversation goes quiet.',
      summaryLabel: option.label,
      Icon: CalendarClock,
    })) as [WorkflowAutomationStepOption, ...WorkflowAutomationStepOption[]],
  },
  {
    key: 'interval',
    label: 'Follow up every',
    emptyLabel: 'Choose interval',
    menuLabel: 'How often should the sequence retry?',
    options: FOLLOWUP_DAY_OPTIONS.map((option) => ({
      id: `interval${option.hours}h`,
      label: `Every ${option.label}`,
      description: 'Wait this long between follow-up attempts.',
      summaryLabel: option.label,
      Icon: Clock3,
    })) as [WorkflowAutomationStepOption, ...WorkflowAutomationStepOption[]],
  },
  {
    key: 'maxAttempts',
    label: 'Maximum follow-ups',
    emptyLabel: 'Choose limit',
    menuLabel: 'How many follow-ups can one customer receive?',
    defaultOptionId: 'maxAttempts3',
    options: followupMaxAttemptOptions,
  },
] satisfies WorkflowAutomationStep[];

export function getWorkflowFollowupScheduleStep(
  stepKey: WorkflowFollowupScheduleStepKey,
) {
  return workflowFollowupScheduleSteps.find((step) => step.key === stepKey);
}

export const workflowFollowupSteps = [
  {
    key: 'audience',
    label: 'Who to follow up',
    emptyLabel: 'Choose customers',
    menuLabel: 'Which customers should receive follow-ups?',
    options: [
      {
        id: 'hotWarmLeads',
        label: 'Hot and warm leads',
        description: 'Follow up customers marked Hot or Warm.',
        Icon: Flame,
      },
      {
        id: 'allLeads',
        label: 'All leads',
        description: 'Follow up every customer that matches this workflow.',
        Icon: UsersRound,
      },
      {
        id: 'taggedCustomers',
        label: 'Lead tags',
        description: 'Choose customers by lead temperature and customer tags.',
        Icon: Tags,
      },
    ],
  },
  {
    key: 'schedule',
    label: 'When to follow up',
    emptyLabel: 'Choose schedule',
    menuLabel: 'When should this follow-up happen?',
    options: [
      {
        id: 'followupSchedule',
        label: '1 day after no reply',
        description: 'Starts after 1 day, repeats every 1 day, and stops after 3 follow-ups.',
        summaryLabel: '1 day',
        Icon: CalendarClock,
      },
    ],
  },
  {
    key: 'template',
    label: 'Message content',
    emptyLabel: 'Choose message',
    menuLabel: "How do you want to message customers who haven't replied?",
    options: [
      {
        id: 'noReplyFollowup',
        label: 'No-reply follow-up',
        description: 'Template for re-opening a quiet conversation.',
        Icon: MessageSquareText,
        previewComponents: [
          {
            type: 'BODY',
            text: "Hi {{customer_name}}, just checking in to see if you're still interested. I'm happy to help whenever you're ready.",
          },
          {
            type: 'FOOTER',
            text: 'Sent by your assistant',
          },
        ],
        estimatedCostMyr: 0.3467,
      },
      {
        id: 'postAppointmentFollowup',
        label: 'Post-appointment follow-up',
        description: 'Template for checking in after a scheduled time.',
        Icon: ReceiptText,
        previewComponents: [
          {
            type: 'BODY',
            text: 'Hi {{customer_name}}, thanks for your time earlier. Would you like help with the next step?',
          },
          {
            type: 'FOOTER',
            text: 'Sent by your assistant',
          },
        ],
        estimatedCostMyr: 0.3467,
      },
      {
        id: 'customFollowupTemplate',
        label: 'Custom template',
        description: 'Use a different approved follow-up template.',
        Icon: FileText,
        previewComponents: [
          {
            type: 'BODY',
            text: "Hi {{customer_name}}, following up as promised. Reply here and we'll continue from where we left off.",
          },
          {
            type: 'FOOTER',
            text: 'Sent by your assistant',
          },
        ],
        estimatedCostMyr: 0.3467,
      },
      {
        id: 'ownerWrittenFollowup',
        label: 'Custom message',
        description: 'Let the team write the follow-up copy for this workflow.',
        Icon: UserRoundCheck,
        previewComponents: [
          {
            type: 'BODY',
            text: 'Hi {{customer_name}}, this is a custom follow-up from the team. Let us know how we can help.',
          },
          {
            type: 'FOOTER',
            text: 'Sent by your assistant',
          },
        ],
        estimatedCostMyr: 0.3467,
      },
    ],
  },
] satisfies WorkflowAutomationStep[];
