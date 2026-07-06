import type { Id } from '../../../convex/_generated/dataModel';

export type ContactStatus = 'unread' | 'seen' | 'replied' | 'closed';
export type ContactIntent = 'enterprise' | 'support' | 'demo' | 'early_user';
export type StatusFilter = 'all' | ContactStatus;
export type IntentFilter = 'all' | ContactIntent;

export type AdminContactRequest = {
  _id: Id<'contactRequests'>;
  intent: ContactIntent;
  email: string;
  status: ContactStatus;
  contactName?: string;
  contactNumber?: string;
  companyName?: string;
  company?: string;
  numberOfUsers?: string;
  createdAt: number;
};

export const intentLabels: Record<ContactIntent, string> = {
  enterprise: 'Enterprise plan',
  support: 'Support',
  demo: 'Book a demo',
  early_user: 'Early user program',
};

export const statusLabels: Record<ContactStatus, string> = {
  unread: 'Unread',
  seen: 'Seen',
  replied: 'Replied',
  closed: 'Closed',
};

export const statusFilterLabels: Record<StatusFilter, string> = {
  all: 'All statuses',
  unread: 'Unread',
  seen: 'Seen',
  replied: 'Replied',
  closed: 'Closed',
};

export const intentFilterLabels: Record<IntentFilter, string> = {
  all: 'All intents',
  enterprise: 'Enterprise plan',
  support: 'Support',
  demo: 'Book a demo',
  early_user: 'Early user program',
};

export const fieldClass =
  'h-9 w-full rounded-lg border border-transparent bg-input/50 px-3 text-sm shadow-none';

export const contactTableGridClass =
  'grid grid-cols-[minmax(140px,1fr)_minmax(120px,1fr)_minmax(160px,1.2fr)_minmax(120px,1fr)_minmax(100px,0.8fr)_minmax(120px,0.9fr)_minmax(160px,1fr)] items-center gap-x-6 px-8';

export function statusBadgeVariant(status: ContactStatus) {
  if (status === 'closed') {
    return 'outline' as const;
  }
  if (status === 'unread') {
    return 'default' as const;
  }
  return 'secondary' as const;
}
