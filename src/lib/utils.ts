import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { AGENT_PROMPT_TEMPLATES } from "../../shared/agentPromptTemplates";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const CHAT_SUGGESTIONS = [
  "What is your return policy?",
  "What do you sell?",
  "How can I contact support?",
] as const;

export const TEMPLATE_PROMPTS = {
  general: AGENT_PROMPT_TEMPLATES.blank,
  sales: AGENT_PROMPT_TEMPLATES.sales,
  productSales: AGENT_PROMPT_TEMPLATES.productSales,
  support: AGENT_PROMPT_TEMPLATES.support,
} as const;
