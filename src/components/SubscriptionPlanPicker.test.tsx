import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { SubscriptionPlanActionButton } from './SubscriptionPlanPicker';

describe('SubscriptionPlanActionButton', () => {
  test.each(['free', 'starter', 'growth', 'business'] as const)(
    'uses the black primary treatment for the selectable %s plan',
    (planId) => {
      const markup = renderToStaticMarkup(
        <SubscriptionPlanActionButton
          planId={planId}
          label="Change plan"
          onClick={() => undefined}
        />,
      );

      expect(markup).toContain('bg-zinc-950');
      expect(markup).toContain('text-white');
    },
  );

  test('shows only a spinner while the selected plan is loading', () => {
    const markup = renderToStaticMarkup(
      <SubscriptionPlanActionButton
        planId="growth"
        label="Change plan"
        loading
        onClick={() => undefined}
      />,
    );

    expect(markup).toContain('animate-spin');
    expect(markup).not.toContain('Change plan');
    expect(markup).toContain('disabled');
  });
});
