import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import {
  SubscriptionPlanActionButton,
  SubscriptionPlanPicker,
} from './SubscriptionPlanPicker';

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

test('uses four grid columns when Enterprise is shown beside three paid plans', () => {
  const markup = renderToStaticMarkup(
    <SubscriptionPlanPicker
      billingInterval="monthly"
      onBillingIntervalChange={() => undefined}
      includeEnterprise
      enterpriseLayout="column"
      renderPlanAction={() => null}
    />,
  );

  expect(markup).toContain('xl:grid-cols-4');
  expect(markup).not.toContain('xl:grid-cols-5');
});

test('shows the Starter promotion on the public monthly pricing cards', () => {
  const markup = renderToStaticMarkup(
    <SubscriptionPlanPicker
      billingInterval="monthly"
      onBillingIntervalChange={() => undefined}
      variant="pricing"
      showStarterPromotion
      renderPlanAction={() => null}
    />,
  );

  expect(markup).toContain('Limited-time offer');
  expect(markup).toContain('Code: STARTER1');
  expect(markup).toContain('>1</span>');
});

test('keeps the Starter promotion out unless explicitly enabled', () => {
  const markup = renderToStaticMarkup(
    <SubscriptionPlanPicker
      billingInterval="monthly"
      onBillingIntervalChange={() => undefined}
      variant="pricing"
      renderPlanAction={() => null}
    />,
  );

  expect(markup).not.toContain('Limited-time offer');
  expect(markup).not.toContain('Code: STARTER1');
});
