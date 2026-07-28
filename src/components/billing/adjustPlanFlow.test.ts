import { describe, expect, test } from 'vitest';
import {
  buildAdjustPlanReturnPath,
  resolveAdjustPlanView,
  resolvePlanEntryLabel,
  resolvePlanCardAction,
  resolvePlanSelection,
} from './adjustPlanFlow';

describe('adjust plan flow', () => {
  test.each(['active', 'trialing', 'past_due', 'unpaid', 'incomplete'])(
    '%s subscriptions change through Portal',
    (status) => {
      expect(
        resolvePlanSelection({
          currentPlan: 'free',
          selectedPlan: 'growth',
          isTeam: false,
          subscriptionStatus: status,
        }),
      ).toBe('portal');
    },
  );

  test.each(['canceled', 'cancelled', null, undefined])(
    '%s subscriptions start a new paid Checkout',
    (subscriptionStatus) => {
      expect(
        resolvePlanSelection({
          currentPlan: 'free',
          selectedPlan: 'growth',
          isTeam: false,
          subscriptionStatus,
        }),
      ).toBe('checkout');
    },
  );

  test('a team selecting Free receives the destructive warning', () => {
    expect(
      resolvePlanSelection({
        currentPlan: 'growth',
        selectedPlan: 'free',
        isTeam: true,
        subscriptionStatus: 'active',
      }),
    ).toBe('warn_team_free');
  });

  test('a personal workspace selecting Free changes through Portal', () => {
    expect(
      resolvePlanSelection({
        currentPlan: 'growth',
        selectedPlan: 'free',
        isTeam: false,
        subscriptionStatus: 'active',
      }),
    ).toBe('portal');
  });

  test('selecting the current plan does nothing', () => {
    expect(
      resolvePlanSelection({
        currentPlan: 'growth',
        selectedPlan: 'growth',
        isTeam: false,
        subscriptionStatus: 'active',
      }),
    ).toBe('ignore');
  });

  test('Stripe returns to the complete signed-in location', () => {
    expect(
      buildAdjustPlanReturnPath(
        '/dashboard/agent_123/settings',
        '?section=plan',
      ),
    ).toBe('/dashboard/agent_123/settings?section=plan');
  });

  test('team Free confirmation replaces the picker instead of nesting', () => {
    expect(resolveAdjustPlanView('closed', 'open')).toBe('picker');
    expect(resolveAdjustPlanView('picker', 'warn_team_free')).toBe(
      'team_free_warning',
    );
    expect(resolveAdjustPlanView('team_free_warning', 'go_back')).toBe(
      'picker',
    );
    expect(resolveAdjustPlanView('team_free_warning', 'close')).toBe('closed');
  });

  test('plan cards distinguish current, available, and loading actions', () => {
    expect(resolvePlanCardAction('growth', 'growth', null)).toEqual({
      label: 'Current plan',
      disabled: true,
      loading: false,
    });
    expect(resolvePlanCardAction('growth', 'business', null)).toEqual({
      label: 'Change plan',
      disabled: false,
      loading: false,
    });
    expect(resolvePlanCardAction('growth', 'business', 'business')).toEqual({
      label: 'Change plan',
      disabled: true,
      loading: true,
    });
  });

  test('entrypoints use labels that match their context', () => {
    expect(resolvePlanEntryLabel('credit_meter')).toBe('Upgrade');
    expect(resolvePlanEntryLabel('plan_settings')).toBe('Adjust plan');
    expect(resolvePlanEntryLabel('usage_card')).toBe('Adjust plan');
    expect(resolvePlanEntryLabel('locked_feature')).toBe('Change plan');
    expect(resolvePlanEntryLabel('plan_limit')).toBe('Change plan');
  });
});
