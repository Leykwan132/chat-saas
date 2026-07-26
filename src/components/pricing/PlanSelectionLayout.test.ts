import { existsSync, readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const layoutUrl = new URL('./PlanSelectionLayout.tsx', import.meta.url);
const layoutSource = existsSync(layoutUrl) ? readFileSync(layoutUrl, 'utf8') : '';
const pricingSource = readFileSync(new URL('../../pages/PricingPage.tsx', import.meta.url), 'utf8');
const onboardingPlanSource = readFileSync(
  new URL('../onboarding/OnboardingPlanStep.tsx', import.meta.url),
  'utf8',
);

test('pricing and onboarding share the full-size plan-selection layout', () => {
  expect(layoutSource).toContain('className="flex flex-col gap-10"');
  expect(layoutSource).toContain(
    'className="font-title text-center text-4xl font-normal tracking-tight sm:text-5xl"',
  );
  expect(pricingSource).toContain('<PlanSelectionLayout>');
  expect(onboardingPlanSource).toContain('<PlanSelectionLayout>');
  expect(pricingSource).not.toContain('Choose your plan');
  expect(onboardingPlanSource).not.toContain('Choose your plan');
  expect(onboardingPlanSource).not.toContain('density="compact"');
});
