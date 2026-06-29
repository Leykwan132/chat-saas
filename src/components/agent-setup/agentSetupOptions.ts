import { Banknote, Bot, Mail, type LucideIcon } from 'lucide-react';
import type { AgentTemplateKey } from '@/lib/agentTemplates';

export type AgentTemplateOption = {
  key: AgentTemplateKey;
  icon: LucideIcon;
  description: string;
};

export const templateOptions: AgentTemplateOption[] = [
  {
    key: 'blank',
    icon: Bot,
    description: 'Flexible assistant for custom instructions.',
  },
  {
    key: 'sales',
    icon: Banknote,
    description: 'Qualify leads and drive next steps.',
  },
  {
    key: 'support',
    icon: Mail,
    description: 'Resolve customer issues with care.',
  },
];

export const RESPONSE_LENGTH_OPTIONS = [
  { value: 'brief', label: 'Brief', description: 'Short replies for quick answers.' },
  { value: 'standard', label: 'Standard', description: 'Balanced replies with enough detail.' },
  { value: 'detailed', label: 'Detailed', description: 'Fuller replies when context matters.' },
] as const;

export const EMOJI_USE_OPTIONS = [
  { value: 'never', label: 'Never', description: '"Thanks, I can help with that."' },
  { value: 'occasional', label: 'Occasional', description: '"Sounds good 😊"' },
  { value: 'frequent', label: 'Frequent', description: '"Great, happy to help 😊✨"' },
] as const;

export const FORMALITY_OPTIONS = [
  { value: 'casual', label: 'Casual', description: 'Friendly and relaxed in everyday language.' },
  { value: 'conversational', label: 'Conversational', description: 'Natural, helpful, and still clear.' },
  { value: 'professional', label: 'Professional', description: 'Polished and respectful for business chats.' },
] as const;

export const HUMOR_LEVEL_OPTIONS = [
  { value: 'none', label: 'None', description: 'Straightforward replies with no jokes.' },
  { value: 'light', label: 'Light', description: 'A little warmth when it fits the chat.' },
  { value: 'playful', label: 'Playful', description: 'More personality in friendly, low-risk chats.' },
] as const;

export type ResponseLength = (typeof RESPONSE_LENGTH_OPTIONS)[number]['value'];
export type EmojiUse = (typeof EMOJI_USE_OPTIONS)[number]['value'];
export type Formality = (typeof FORMALITY_OPTIONS)[number]['value'];
export type HumorLevel = (typeof HUMOR_LEVEL_OPTIONS)[number]['value'];
export type ReplyMode = 'automatic' | 'manual';

export const REPLY_MODE_OPTIONS: Array<{
  value: ReplyMode;
  label: string;
  description: string;
  whenToUse: Array<{ title: string; description: string }>;
}> = [
  {
    value: 'automatic',
    label: 'Automatic',
    description: 'Instant replies',
    whenToUse: [
      {
        title: 'Fast first response',
        description: 'Reply right away without waiting for a teammate.',
      },
      {
        title: 'After-hours coverage',
        description: 'Keep chats moving when no one is on shift.',
      },
      {
        title: 'Simple FAQs',
        description: 'Handle common questions the AI can answer on its own.',
      },
    ],
  },
  {
    value: 'manual',
    label: 'Manual',
    description: 'Teammate starts it',
    whenToUse: [
      {
        title: 'Human review first',
        description: 'Check the message before AI joins the conversation.',
      },
      {
        title: 'High-value leads',
        description: 'Review sales or sensitive chats before AI replies.',
      },
      {
        title: 'Qualify, then automate',
        description: 'Ask a few questions first, then turn AI on.',
      },
    ],
  },
];
