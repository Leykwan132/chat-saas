export type AgentTemplateKey = 'blank' | 'sales' | 'support';

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
    label: 'Sales Agent',
    description: 'Qualifies leads, handles objections, and drives next steps.',
    prompt: TEMPLATE_PROMPTS.sales,
  },
  support: {
    label: 'Support Agent',
    description: 'Resolves customer issues with patient, practical guidance.',
    prompt: TEMPLATE_PROMPTS.support,
  },
};
