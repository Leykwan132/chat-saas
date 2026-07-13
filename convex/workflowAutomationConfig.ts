import type { Doc } from './_generated/dataModel';
import {
  createInitialWorkflowAutomationConfigs,
  type WorkflowAutomationConfigs,
} from '../shared/workflowAutomations';

type WorkflowWithAutomations = Doc<'workflows'> & {
  reminderAutomation?: WorkflowAutomationConfigs['reminder'];
  followUpAutomation?: WorkflowAutomationConfigs['followUp'];
};

export function resolveWorkflowAutomationConfigs(
  workflow: Doc<'workflows'>,
): WorkflowAutomationConfigs {
  const stored = workflow as WorkflowWithAutomations;
  const initial = createInitialWorkflowAutomationConfigs();
  return {
    reminder: stored.reminderAutomation ?? initial.reminder,
    followUp: stored.followUpAutomation ?? initial.followUp,
  };
}

function requirePositiveInteger(value: number, label: string) {
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${label} must be a positive integer`);
}

export function validateWorkflowAutomationConfigs(configs: WorkflowAutomationConfigs) {
  requirePositiveInteger(configs.reminder.revision + 1, 'Reminder revision');
  requirePositiveInteger(configs.followUp.revision + 1, 'Follow-up revision');
  if (configs.reminder.timingOptionIds.length === 0) {
    throw new Error('Choose at least one reminder time');
  }
  const reminderCount = Number(configs.reminder.selections.maxAttempts?.replace('reminderCount', ''));
  if (Number.isInteger(reminderCount) && configs.reminder.timingOptionIds.length !== reminderCount) {
    throw new Error(`Choose exactly ${reminderCount} reminder times`);
  }
  requirePositiveInteger(configs.followUp.startAfterHours, 'Follow-up start delay');
  requirePositiveInteger(configs.followUp.intervalHours, 'Follow-up interval');
  requirePositiveInteger(configs.followUp.maxAttempts, 'Follow-up attempt limit');
  if (configs.followUp.maxAttempts > 10) throw new Error('Follow-up attempt limit cannot exceed 10');
  if (configs.followUp.audienceFilters.length === 0) throw new Error('Choose a follow-up audience');
  if (configs.reminder.enabled && !configs.reminder.activationScope) {
    throw new Error('Choose what reminders should apply to');
  }
  if (configs.reminder.enabled && !configs.reminder.template) {
    throw new Error('Choose a reminder message');
  }
  if (configs.followUp.enabled && !configs.followUp.activationScope) {
    throw new Error('Choose what follow-up should apply to');
  }
  if (configs.followUp.enabled && configs.followUp.messageStrategy === 'same' && !configs.followUp.sameTemplate) {
    throw new Error('Choose a follow-up message');
  }
  if (
    configs.followUp.enabled &&
    configs.followUp.messageStrategy === 'different' &&
    configs.followUp.attemptTemplates.length < configs.followUp.maxAttempts
  ) {
    throw new Error('Choose a message for every follow-up attempt');
  }
}

function withNextRevision<T extends { revision: number }>(current: T, proposed: T): T {
  const currentComparable = { ...current, revision: 0 };
  const proposedComparable = { ...proposed, revision: 0 };
  return {
    ...proposed,
    revision: JSON.stringify(currentComparable) === JSON.stringify(proposedComparable)
      ? current.revision
      : current.revision + 1,
  };
}

export function prepareWorkflowAutomationSave(
  current: WorkflowAutomationConfigs,
  proposed: WorkflowAutomationConfigs,
): WorkflowAutomationConfigs {
  validateWorkflowAutomationConfigs(proposed);
  return {
    reminder: withNextRevision(current.reminder, proposed.reminder),
    followUp: withNextRevision(current.followUp, proposed.followUp),
  };
}

export function getWorkflowAutomationSaveEffects(
  current: WorkflowAutomationConfigs,
  next: WorkflowAutomationConfigs,
) {
  const reconcile: Array<'reminder' | 'followUp'> = [];
  const cancel: Array<'reminder' | 'followUp'> = [];
  if (
    !current.reminder.enabled &&
    next.reminder.enabled &&
    next.reminder.activationScope === 'currentAndFuture'
  ) reconcile.push('reminder');
  if (
    !current.followUp.enabled &&
    next.followUp.enabled &&
    next.followUp.activationScope === 'currentAndFuture'
  ) reconcile.push('followUp');
  if (current.reminder.enabled && !next.reminder.enabled) cancel.push('reminder');
  if (current.followUp.enabled && !next.followUp.enabled) cancel.push('followUp');
  return { reconcile, cancel };
}
