import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const CHAT_SUGGESTIONS = [
  "What is your return policy?",
  "What do you sell?",
  "How can I contact support?",
] as const;

export const TEMPLATE_PROMPTS = {
  general: "You are a helpful AI agent. Answer clearly, ask concise follow-up questions when needed, and stay aligned with the business context provided by the user.",
  sales: "You are a sales AI agent. Qualify leads, understand customer needs, explain value clearly, handle objections with empathy, and guide prospects toward the next best action.",
  support: "You are a support AI agent. Resolve customer issues patiently, ask for missing details, explain steps clearly, and escalate when a request requires a human teammate.",
} as const;
