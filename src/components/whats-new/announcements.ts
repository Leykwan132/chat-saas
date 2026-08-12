import { Orbit, type LucideIcon } from 'lucide-react';

export type Announcement = {
  id: string;
  title: string;
  summary: string;
  releaseTitle: string;
  releaseSummary: string;
  newModels: Array<{
    name: string;
    description: string;
  }>;
  retiredModels: string[];
  modelCosts: Array<{ cost: string; models: string[] }>;
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
    releaseTitle: 'New Credit system for Models.',
    releaseSummary:
      'Model pricing now uses clear credit tiers for every message.',
    newModels: [
      {
        name: 'OpenAI GPT-OSS 120B',
        description: 'Budget-friendly reasoning',
      },
      {
        name: 'Qwen3.7 Flash',
        description: 'Fast Chinese conversations',
      },
      {
        name: 'NVIDIA Nemotron 3.5 Lightning',
        description: 'Fast English responses',
      },
      {
        name: 'GPT-5.6 Luna',
        description: 'Higher overall performance',
      },
    ],
    retiredModels: ['Amazon Nova Micro', 'Google Gemini 3.1 Flash Lite'],
    modelCosts: [
      {
        cost: '0.5 credits/message',
        models: ['OpenAI GPT-OSS 120B', 'Qwen3.7 Flash'],
      },
      {
        cost: '1 credit/message',
        models: ['DeepSeek V4 Flash', 'NVIDIA Nemotron 3.5 Lightning'],
      },
      {
        cost: '2 credits/message',
        models: ['GPT-5.6 Luna'],
      },
    ],
    isNew: true,
    icon: Orbit,
  },
];
