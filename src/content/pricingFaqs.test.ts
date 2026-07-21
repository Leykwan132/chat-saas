import { expect, test } from 'vitest';
import { pricingFaqs } from './pricingFaqs';

test('credit-limit FAQ leads with top-ups before explaining paused usage', () => {
  const creditLimitFaq = pricingFaqs.find(
    ({ question }) => question === 'What happens if I use up my credits?',
  );

  expect(creditLimitFaq?.answer).toBe(
    'We offer credit top-ups whenever you need extra usage. If your monthly credits run out, AI usage pauses until you top up, wait for the next billing cycle, or upgrade to a plan with a larger monthly allowance.',
  );
});
