import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import {
  EnterprisePlanAction,
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
      expect(markup).toContain('rounded-full');
      expect(markup).toContain('h-11');
      expect(markup).toContain('px-6');
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

  test('keeps the current-plan action in the same pill geometry', () => {
    const markup = renderToStaticMarkup(
      <SubscriptionPlanActionButton
        planId="growth"
        label="Current plan"
        isCurrentPlan
        onClick={() => undefined}
      />,
    );

    expect(markup).toContain('rounded-full');
    expect(markup).toContain('h-11');
    expect(markup).toContain('px-6');
  });
});

test('keeps the Enterprise action in the same pill geometry', () => {
  const markup = renderToStaticMarkup(
    <MemoryRouter>
      <EnterprisePlanAction label="Contact our sales" />
    </MemoryRouter>,
  );

  expect(markup).toContain('rounded-full');
  expect(markup).toContain('h-11');
  expect(markup).toContain('px-6');
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
  expect(markup).toContain('from-[#eb0000] via-[#95008a] to-[#3300fc]');
  expect(markup).toContain('motion-safe:animate-shine');
  expect(markup).not.toContain('border-2 border-[#95008a]');
  expect(markup).not.toContain('Popular');
  expect(markup).not.toContain('Code: STARTER1');
  expect(markup).toContain('>1</span>');
  expect(markup).toContain('Valid for 3 months.');
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
