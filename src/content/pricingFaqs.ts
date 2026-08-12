import {
  EXTRA_CREDITS_PACK_NOTE,
  EXTRA_CREDITS_PACKS,
  formatExtraCreditsPackPrice,
} from '../../shared/extraCreditsCatalog';

export type PricingFaq = {
  question: string;
  answer: string;
};

const topUpPackageLabels = EXTRA_CREDITS_PACKS.map(
  (pack) =>
    `${pack.credits.toLocaleString()} credits for ${formatExtraCreditsPackPrice(pack)}`,
);

const topUpPackageSummary = `${topUpPackageLabels.slice(0, -1).join(', ')}, and ${topUpPackageLabels.at(-1)}`;

export const pricingFaqs: PricingFaq[] = [
  {
    question: 'Is it free to use KiloBot?',
    answer:
      'Yes. You can start with the Free plan, which includes 300 credits per month and core AI agent features. Paid plans unlock higher limits and more advanced features.',
  },
  {
    question: 'What happens if I use up my credits?',
    answer: `We offer ${topUpPackageSummary}. ${EXTRA_CREDITS_PACK_NOTE} If your monthly credits run out, AI usage pauses until you top up, wait for the next billing cycle, or upgrade to a plan with a larger monthly allowance.`,
  },
  {
    question: 'Do I get agentic follow-up / booking in the Free plan?',
    answer:
      'Yes. Free includes Follow-ups and AI Workflows, so you can try follow-up and booking-style workflows within the Free plan limits.',
  },
  {
    question: 'How many channels can I connect to one AI agent?',
    answer:
      'On Free, each agent can connect one channel. On paid plans, each agent can connect all supported channels — WhatsApp, Instagram, and Messenger — with one account per platform.',
  },
  {
    question: 'How does the credit system work?',
    answer:
      'Credits are used when AI messages are generated. Different models can use different credit amounts, and your monthly credit quota refreshes each billing cycle.',
  },
];
