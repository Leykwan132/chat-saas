import { Orbit, type LucideIcon } from 'lucide-react';

export type Announcement = {
  id: string;
  title: string;
  summary: string;
  details: string[];
  publishedAt: string;
  isNew: boolean;
  icon: LucideIcon;
};

export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'model-support-update',
    title: 'Model support update',
    summary: 'Choose the model that best fits each customer conversation.',
    publishedAt: '2026-08-12',
    details: [
      'New 0.5-credit tier: GPT-OSS 120B and Qwen3.7 Flash — 0.5 credits/message.',
      'New: NVIDIA Nemotron 3.5 Lightning — 1 credit/message.',
      'New: GPT-5.6 Luna — 2 credits/message.',
      'Also available: DeepSeek V4 Flash — 1 credit/message.',
      'Removed: Amazon Nova Micro and Google Gemini 3.1 Flash Lite.',
    ],
    isNew: true,
    icon: Orbit,
  },
];
