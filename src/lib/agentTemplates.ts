export type AgentTemplateKey = 'blank' | 'sales' | 'support';

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
    label: 'Blank',
    description: 'A general-purpose assistant ready for custom instructions.',
    prompt:
      'You are a helpful AI agent. Answer clearly, ask concise follow-up questions when needed, and stay aligned with the business context provided by the user.',
  },
  sales: {
    label: 'Sales Agent',
    description: 'Qualifies leads, handles objections, and drives next steps.',
    prompt:
      'You are a sales AI agent. Qualify leads, understand customer needs, explain value clearly, handle objections with empathy, and guide prospects toward the next best action.',
  },
  support: {
    label: 'Support Agent',
    description: 'Resolves customer issues with patient, practical guidance.',
    prompt:
      'You are a support AI agent. Resolve customer issues patiently, ask for missing details, explain steps clearly, and escalate when a request requires a human teammate.',
  },
};
