import {
  Banknote,
  Bot,
  Globe,
  MessageSquare,
  Rocket,
  Target,
  Terminal,
  type LucideIcon,
} from 'lucide-react';
import { SiInstagram, SiMessenger, SiWhatsapp } from 'react-icons/si';

export type OnboardingStep = 1 | 2 | 3 | 4 | 5;

export const roles = [
  {
    id: 'Founder',
    label: 'Founder',
    description: 'Building the business from scratch',
  },
  {
    id: 'Product Manager',
    label: 'Product Manager',
    description: 'Defining features and roadmap',
  },
  {
    id: 'Support Specialist',
    label: 'Support / Ops',
    description: 'Helping customers and resolving issues',
  },
  {
    id: 'Software Developer',
    label: 'Engineer',
    description: 'Writing code and integrating APIs',
  },
  {
    id: 'Other',
    label: 'Other',
    description: 'Something else entirely',
  },
];

export const useCaseOptions: Array<{
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    id: 'Support',
    label: 'Support',
    description: 'Answer customer questions instantly',
    icon: MessageSquare,
  },
  {
    id: 'Sales',
    label: 'Sales',
    description: 'Qualify leads and book demos',
    icon: Banknote,
  },
  {
    id: 'Knowledge',
    label: 'Knowledge',
    description: 'Search docs and company files',
    icon: Bot,
  },
  {
    id: 'Automation',
    label: 'Automation',
    description: 'Run multi-step agent workflows',
    icon: Terminal,
  },
  {
    id: 'Leads',
    label: 'Leads',
    description: 'Capture and nurture prospects',
    icon: Target,
  },
  {
    id: 'Onboarding',
    label: 'Onboarding',
    description: 'Guide new users step by step',
    icon: Rocket,
  },
];

export const channelOptions = [
  { id: 'WhatsApp', label: 'WhatsApp', icon: SiWhatsapp },
  { id: 'Instagram', label: 'Instagram', icon: SiInstagram },
  { id: 'Facebook Messenger', label: 'Messenger', icon: SiMessenger },
  { id: 'Web Widget/API', label: 'Web / API', icon: Globe },
];
