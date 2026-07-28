import { describe, expect, test } from 'vitest';
import {
  buildAdjustPlanReturnPath,
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
});
