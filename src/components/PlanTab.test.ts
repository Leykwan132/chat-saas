import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const source = readFileSync(
  new URL('./PlanTab.tsx', import.meta.url),
  'utf8',
);

test('keeps renewal details without duplicating the credit reset date', () => {
  expect(source).toContain('stripeSubscriptionCurrentPeriodEnd');
  expect(source).toContain('Renews');
  expect(source).not.toContain('periodEndMs');
  expect(source).not.toContain('Credits reset');
});
