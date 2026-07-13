import { describe, expect, test } from 'vitest';
import { createInitialWorkflowAutomationConfigs } from '../shared/workflowAutomations';
import { getWorkflowAutomationSaveEffects } from './workflowAutomationConfig';

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
