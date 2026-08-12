import { Bot, type LucideIcon } from 'lucide-react';

export type Announcement = {
  id: string;
  title: string;
  summary: string;
  details: string[];
  isNew: boolean;
  icon: LucideIcon;
};

export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'model-support-update',
    title: 'Model support update',
    summary: 'Choose the model that best fits each customer conversation.',
    details: [
      'Use Qwen3.7 Flash for fast Chinese conversations.',
      'Use NVIDIA Nemotron 3.5 Lightning for fast English responses.',
      'Use GPT-5.6 Luna for stronger performance.',
      'Use GPT-OSS 120B for budget-friendly reasoning.',
    ],
    isNew: true,
    icon: Bot,
  },
];
