import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const comparisonSource = readFileSync(new URL('./PlanComparisonTable.tsx', import.meta.url), 'utf8');
const faqSource = readFileSync(new URL('./PricingFaqSection.tsx', import.meta.url), 'utf8');
const stylesSource = readFileSync(new URL('./pricingStyles.ts', import.meta.url), 'utf8');

test('compare plans and FAQ use the same heading size', () => {
  expect(stylesSource).toContain(
    "export const pricingSectionHeadingClass = 'font-title text-[38px] font-normal'",
  );
  expect(stylesSource).not.toContain('sm:text-4xl');
  expect(comparisonSource).toMatch(/className=\{cn\(\s*pricingSectionHeadingClass,/);
  expect(faqSource).toMatch(/className=\{cn\(\s*pricingSectionHeadingClass,/);
});
