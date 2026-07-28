import { describe, expect, test } from 'vitest';
import {
  buildManagePlanReturnPath,
  resolveManagePlanStep,
  resolveTeamWarningAction,
} from './managePlanFlow';

describe('manage plan flow', () => {
  test('personal workspaces open the billing portal directly', () => {
    expect(resolveManagePlanStep(false)).toBe('open_portal');
  });

  test('team workspaces warn before opening the billing portal', () => {
    expect(resolveManagePlanStep(true)).toBe('warn_team');
  });

  test('going back closes the warning without opening Stripe', () => {
    expect(resolveTeamWarningAction('go_back')).toBe('close_warning');
  });

  test('continuing from the warning opens Stripe', () => {
    expect(resolveTeamWarningAction('continue')).toBe('open_portal');
  });

  test('returns from Stripe to the complete signed-in location', () => {
    expect(
      buildManagePlanReturnPath('/dashboard/agent_123/settings', '?section=plan'),
    ).toBe('/dashboard/agent_123/settings?section=plan');
  });
});
