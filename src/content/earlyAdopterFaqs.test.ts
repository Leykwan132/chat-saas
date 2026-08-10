import { expect, test } from 'vitest';
import { earlyAdopterFaqs } from './earlyAdopterFaqs';

test('Early Adopter Growth benefit matches the current Growth entitlement', () => {
  const benefitFaq = earlyAdopterFaqs.find(
    ({ question }) => question === 'How does the 3-month free Growth plan work?',
  );

  expect(benefitFaq?.answer).toContain('5 AI agents');
  expect(benefitFaq?.answer).toContain('8,000 monthly credits');
});
