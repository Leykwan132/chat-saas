export type AgentTemplateKey = 'blank' | 'sales' | 'support';

import { TEMPLATE_PROMPTS } from './utils';

export const GOOGLE_MODELS = [
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
];

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
