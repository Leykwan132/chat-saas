export type PricingFaq = {
  question: string;
  answer: string;
};

export const pricingFaqs: PricingFaq[] = [
  {
    question: 'Is it free to use KiloBot?',
    answer:
      'Yes. You can start with the Free plan, which includes 100 credits per month and core AI agent features. Paid plans unlock higher limits and more advanced features.',
  },
  {
    question: 'What happens if I use up my credits?',
    answer:
      'AI usage pauses once your monthly credits are used up. You can wait for the next billing cycle, buy extra credits, or upgrade to a plan with a larger monthly allowance.',
  },
  {
    question: 'Do I get agentic follow-up / booking in the Free plan?',
    answer:
      'Yes. Free includes Follow-ups and AI Workflows, so you can try follow-up and booking-style workflows within the Free plan limits.',
  },
  {
    question: 'How many channels can I connect to one AI agent?',
    answer:
      'You can connect one AI agent to multiple platforms, with the number of connected channels based on your plan.',
  },
  {
    question: 'How does the credit system work?',
    answer:
      'Credits are used when AI messages are generated. Different models can use different credit amounts, and your monthly credit quota refreshes each billing cycle.',
  },
];
