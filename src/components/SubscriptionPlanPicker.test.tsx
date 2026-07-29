import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { SubscriptionPlanActionButton } from './SubscriptionPlanPicker';

describe('SubscriptionPlanActionButton', () => {
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
