import { describe, expect, test } from 'vitest';
import { resolveWorkflowAutomationEnabledChange } from './workflowAutomationActivation';

describe('workflow automation activation', () => {
  test('keeps an automation off and requests a message when enabling without one', () => {
    expect(resolveWorkflowAutomationEnabledChange(true, false)).toEqual({
      enabled: false,
      messageRequired: true,
    });
  });

  test('enables an automation when its message is selected', () => {
    expect(resolveWorkflowAutomationEnabledChange(true, true)).toEqual({
      enabled: true,
      messageRequired: false,
    });
  });

  test('always allows an automation to be turned off', () => {
    expect(resolveWorkflowAutomationEnabledChange(false, false)).toEqual({
      enabled: false,
      messageRequired: false,
    });
  });
});
