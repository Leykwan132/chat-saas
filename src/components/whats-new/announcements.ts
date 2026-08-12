import { Orbit, type LucideIcon } from 'lucide-react';

export type Announcement = {
  id: string;
  title: string;
  summary: string;
  spotlight: {
    eyebrow: string;
    title: string;
    description: string;
    value: string;
  };
  modelCards: Array<{
    title: string;
    description: string;
    value: string;
  }>;
  retirement: {
    label: string;
    description: string;
  };
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
    spotlight: {
      eyebrow: 'New 0.5-credit tier',
      title: 'More choice for half a credit',
      description:
        'Use GPT-OSS 120B for budget-friendly reasoning or Qwen3.7 Flash for fast Chinese conversations.',
      value: '0.5 credits/message',
    },
    modelCards: [
      {
        title: 'NVIDIA Nemotron 3.5 Lightning',
        description: 'Fast English responses',
        value: '1 credit/message',
      },
      {
        title: 'DeepSeek V4 Flash',
        description: 'Balanced everyday support',
        value: '1 credit/message',
      },
      {
        title: 'GPT-5.6 Luna',
        description: 'Higher overall performance',
        value: '2 credits/message',
      },
    ],
    retirement: {
      label: 'Retired models',
      description:
        'Amazon Nova Micro and Google Gemini 3.1 Flash Lite are no longer available.',
    },
    isNew: true,
    icon: Orbit,
  },
];
