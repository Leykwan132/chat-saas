import { cn } from '@/lib/utils';

export type ContactIntent = 'enterprise' | 'support' | 'demo';

export const intentLabels: Record<ContactIntent, string> = {
  enterprise: 'Enterprise plan',
  support: 'Support',
  demo: 'Book a demo',
};

export const numberOfUsersOptions = [
  '1–10',
  '11–50',
  '51–200',
  '201–1,000',
  '1,000+',
] as const;

export function normalizeIntent(value: string | null): ContactIntent {
  if (value === 'support') return 'support';
  if (value === 'demo') return 'demo';
  return 'enterprise';
}

export const contactFieldClass =
  'h-9 w-full rounded-lg border border-transparent bg-input/50 px-3 text-sm shadow-none';

export const contactSelectTriggerClass = cn(
  contactFieldClass,
  '!h-9 !w-full !max-w-none !py-0 !text-sm',
  '[&_svg]:size-3.5',
);

export const contactSelectContentClass =
  'max-h-48 p-0.5 text-sm shadow-md data-open:zoom-in-100 data-closed:zoom-out-100';

export const contactSelectContentProps = {
  position: 'popper' as const,
  side: 'bottom' as const,
  align: 'start' as const,
  sideOffset: 4,
};

export const contactSelectItemClass = 'py-1.5 pl-2 pr-7 text-sm';
