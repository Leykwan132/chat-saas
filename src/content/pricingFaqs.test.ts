import { expect, test } from 'vitest';
import { pricingFaqs } from './pricingFaqs';

test('Free FAQ advertises the approved 300-credit allowance', () => {
  const freeFaq = pricingFaqs.find(
    ({ question }) => question === 'Is it free to use KiloBot?',
  );

  expect(freeFaq?.answer).toContain('300 credits per month');
});

test('credit-limit FAQ shows canonical top-up packages and usage choices', () => {
  const creditLimitFaq = pricingFaqs.find(
    ({ question }) => question === 'What happens if I use up my credits?',
  );

  expect(creditLimitFaq?.answer).toBe(
    "We offer 2,000 credits for RM 49, 5,000 credits for RM 99, and 15,000 credits for RM 249. Extra credit will be carried forward and won't expire. If your monthly credits run out, AI usage pauses until you top up, wait for the next billing cycle, or upgrade to a plan with a larger monthly allowance.",
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
