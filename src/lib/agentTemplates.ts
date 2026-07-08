export type AgentTemplateKey = 'blank' | 'sales' | 'productSales' | 'support';

import { TEMPLATE_PROMPTS } from './utils';

export const AGENT_TEMPLATES: Record<
  AgentTemplateKey,
  { label: string; description: string; prompt: string }
> = {
  blank: {
    label: 'General',
    description: 'A general-purpose assistant ready for custom instructions.',
    prompt: TEMPLATE_PROMPTS.general,
  },
  sales: {
    label: 'Real estate sales agent',
    description: 'Books real estate showroom visits and qualifies serious buyers.',
    prompt: TEMPLATE_PROMPTS.sales,
  },
  productSales: {
    label: 'Sales agent',
    description: 'Helps customers compare options and sell products.',
    prompt: TEMPLATE_PROMPTS.productSales,
  },
  support: {
    label: 'Support Agent',
    description: 'Resolves customer issues with patient, practical guidance.',
    prompt: TEMPLATE_PROMPTS.support,
  },
};
