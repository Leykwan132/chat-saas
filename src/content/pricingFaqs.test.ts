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

test('channel FAQ explains Free one-channel vs paid all-channel limits', () => {
  const channelFaq = pricingFaqs.find(
    ({ question }) => question === 'How many channels can I connect to one AI agent?',
  );

  expect(channelFaq?.answer).toBe(
    'On Free, each agent can connect one channel. On paid plans, each agent can connect all supported channels — WhatsApp, Instagram, and Messenger — with one account per platform.',
  );
});
