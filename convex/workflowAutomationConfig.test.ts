import { describe, expect, test } from 'vitest';
import { createInitialWorkflowAutomationConfigs } from '../shared/workflowAutomations';
import type { Doc, Id } from './_generated/dataModel';
import {
  getWorkflowAutomationSaveEffects,
  prepareWorkflowAutomationSave,
  resolveWorkflowAutomationConfigs,
} from './workflowAutomationConfig';

function workflowWithAutomations(
  automations: Partial<Pick<Doc<'workflows'>, 'reminderAutomation' | 'followUpAutomation'>>,
): Doc<'workflows'> {
  return {
    _id: 'workflow' as Id<'workflows'>,
    _creationTime: 1,
    agentId: 'agent' as Id<'agents'>,
    orgId: '',
    userId: '',
    name: 'Workflow',
    createdAt: 1,
    updatedAt: 1,
    ...automations,
  };
}

test('defaults both activation scopes to future only', () => {
  const initial = createInitialWorkflowAutomationConfigs();

  expect(initial.reminder.activationScope).toBe('futureOnly');
  expect(initial.followUp.activationScope).toBe('futureOnly');
});

test('normalizes missing stored scopes to future only', () => {
  const stored = createInitialWorkflowAutomationConfigs();
  delete stored.reminder.activationScope;
  delete stored.followUp.activationScope;

  const resolved = resolveWorkflowAutomationConfigs(workflowWithAutomations({
    reminderAutomation: stored.reminder,
    followUpAutomation: stored.followUp,
  }));

  expect(resolved.reminder.activationScope).toBe('futureOnly');
  expect(resolved.followUp.activationScope).toBe('futureOnly');
});

test('preserves explicit stored activation scopes', () => {
  const stored = createInitialWorkflowAutomationConfigs();
  stored.reminder.activationScope = 'currentAndFuture';
  stored.followUp.activationScope = 'currentAndFuture';

  const resolved = resolveWorkflowAutomationConfigs(workflowWithAutomations({
    reminderAutomation: stored.reminder,
    followUpAutomation: stored.followUp,
  }));

  expect(resolved.reminder.activationScope).toBe('currentAndFuture');
  expect(resolved.followUp.activationScope).toBe('currentAndFuture');
});

test('derives canonical follow-up schedule values from saved selections', () => {
  const current = createInitialWorkflowAutomationConfigs();
  const proposed = createInitialWorkflowAutomationConfigs();
  proposed.followUp.selections.interval = 'interval48h';
  proposed.followUp.selections.maxAttempts = 'maxAttempts1';

  const saved = prepareWorkflowAutomationSave(current, proposed);

  expect(saved.followUp.intervalHours).toBe(48);
  expect(saved.followUp.maxAttempts).toBe(1);
});

describe('workflow automation save effects', () => {
  test('reconciles only an off-to-on current and future activation', () => {
    const current = createInitialWorkflowAutomationConfigs();
    const next = createInitialWorkflowAutomationConfigs();
    next.reminder.enabled = true;
    next.reminder.activationScope = 'currentAndFuture';
    expect(getWorkflowAutomationSaveEffects(current, next)).toEqual({
      reconcile: ['reminder'],
      cancel: [],
    });
  });

  test('does not reconcile an off-to-on future-only activation', () => {
    const current = createInitialWorkflowAutomationConfigs();
    const next = createInitialWorkflowAutomationConfigs();
    next.followUp.enabled = true;
    next.followUp.activationScope = 'futureOnly';
    expect(getWorkflowAutomationSaveEffects(current, next)).toEqual({
      reconcile: [],
      cancel: [],
    });
  });

  test('reconciles an enabled follow-up configuration revision change', () => {
    const current = createInitialWorkflowAutomationConfigs();
    current.followUp.enabled = true;
    current.followUp.revision = 6;
    const next = createInitialWorkflowAutomationConfigs();
    next.followUp.enabled = true;
    next.followUp.revision = 7;

    expect(getWorkflowAutomationSaveEffects(current, next)).toEqual({
      reconcile: ['followUp'],
      cancel: [],
    });
  });

  test('does not reconcile an unchanged enabled follow-up revision', () => {
    const current = createInitialWorkflowAutomationConfigs();
    current.followUp.enabled = true;
    current.followUp.revision = 6;
    const next = createInitialWorkflowAutomationConfigs();
    next.followUp.enabled = true;
    next.followUp.revision = 6;

    expect(getWorkflowAutomationSaveEffects(current, next)).toEqual({
      reconcile: [],
      cancel: [],
    });
  });

  test('cancels pending work when an enabled automation is disabled', () => {
    const current = createInitialWorkflowAutomationConfigs();
    current.followUp.enabled = true;
    current.followUp.activationScope = 'futureOnly';
    const next = createInitialWorkflowAutomationConfigs();
    expect(getWorkflowAutomationSaveEffects(current, next)).toEqual({
      reconcile: [],
      cancel: ['followUp'],
    });
  });
});
