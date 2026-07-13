import { describe, expect, test } from 'vitest';
import { resolveWorkflowAutomationEnabledChange } from './workflowAutomationActivation';

describe('workflow automation activation', () => {
  test('keeps an automation off and requests a message when enabling without one', () => {
    expect(resolveWorkflowAutomationEnabledChange(true, false, undefined)).toEqual({
      enabled: false,
      messageRequired: true,
      scopeRequired: false,
    });
  });

  test('enables an automation when its message is selected', () => {
    expect(resolveWorkflowAutomationEnabledChange(true, true, 'futureOnly')).toEqual({
      enabled: true,
      messageRequired: false,
      scopeRequired: false,
    });
  });

  test('keeps an automation off and requests a scope when enabling without one', () => {
    expect(resolveWorkflowAutomationEnabledChange(true, true, undefined)).toEqual({
      enabled: false,
      messageRequired: false,
      scopeRequired: true,
    });
  });

  test('always allows an automation to be turned off', () => {
    expect(resolveWorkflowAutomationEnabledChange(false, false, undefined)).toEqual({
      enabled: false,
      messageRequired: false,
      scopeRequired: false,
    });
  });
});
