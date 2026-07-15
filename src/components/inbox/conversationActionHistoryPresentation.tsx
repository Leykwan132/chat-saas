import type { ReactNode } from 'react';
import {
  AlertCircle,
  BellRing,
  Bot,
  CalendarCheck,
  CalendarClock,
  CalendarX,
  CheckCircle2,
  Clock,
  Clock3,
  Contact,
  Eraser,
  Flame,
  Megaphone,
  MessageSquarePlus,
  Tag,
  Trash2,
  UserCheck,
  type LucideIcon,
} from 'lucide-react';

type ConversationActionHistoryMetadata = {
  service?: string;
  templateName?: string;
  message?: string;
  attemptNumber?: number;
  changes?: {
    name?: { from?: string; to?: string };
    phone?: { from?: string; to?: string };
    email?: { from?: string; to?: string };
  };
  assigneeName?: string;
  tag?: string;
  eventTitle?: string;
  from?: string;
  to?: string;
};

export function formatConversationActionHistoryText(
  action: string,
  metadata: ConversationActionHistoryMetadata | undefined,
): ReactNode {
  switch (action) {
    case 'thread_created': {
      const serviceName = metadata?.service
        ? metadata.service.charAt(0).toUpperCase() + metadata.service.slice(1)
        : 'chat';
      return <span>Conversation started via <strong>{serviceName}</strong></span>;
    }
    case 'broadcast_sent':
      return <span>Broadcast sent: <strong>"{metadata?.templateName || 'Template'}"</strong></span>;
    case 'reminder_sent':
      return (
        <span>
          Reminder sent: <strong className="font-semibold text-foreground dark:text-white">"{metadata?.message}"</strong>
        </span>
      );
    case 'followup_sent':
      return (
        <span>
          Follow-up sent: <strong className="font-semibold text-foreground dark:text-white">"{metadata?.message}"</strong>{' '}
          <span className="text-muted-foreground/80 dark:text-muted-foreground/60 font-normal">
            (attempt #{metadata?.attemptNumber || 1})
          </span>
        </span>
      );
    case 'user_details_changed': {
      const changes = metadata?.changes;
      if (!changes) return <span>Updated user details</span>;
      const parts: ReactNode[] = [];
      if (changes.name) {
        parts.push(<span key="name">name from <strong>"{changes.name.from ?? ''}"</strong> to <strong>"{changes.name.to ?? ''}"</strong></span>);
      }
      if (changes.phone) {
        if (parts.length > 0) parts.push(<span key="phone-separator">, </span>);
        parts.push(<span key="phone">phone from <strong>"{changes.phone.from ?? ''}"</strong> to <strong>"{changes.phone.to ?? ''}"</strong></span>);
      }
      if (changes.email) {
        if (parts.length > 0) parts.push(<span key="email-separator">, </span>);
        parts.push(<span key="email">email from <strong>"{changes.email.from ?? ''}"</strong> to <strong>"{changes.email.to ?? ''}"</strong></span>);
      }
      return <span>Updated user details: {parts}</span>;
    }
    case 'ai_enabled':
      return <span>AI replies <strong>turned on</strong></span>;
    case 'ai_disabled':
      return <span>AI replies <strong>turned off</strong></span>;
    case 'assignee_changed':
      return <span>Assigned to <strong>{metadata?.assigneeName || 'someone'}</strong></span>;
    case 'escalation_raised':
      return <span>Human escalation <strong>raised</strong></span>;
    case 'escalation_resolved':
      return <span>Human escalation <strong>resolved</strong></span>;
    case 'tag_added':
      return <span>Tag added: <strong>"{metadata?.tag}"</strong></span>;
    case 'tag_removed':
      return <span>Tag removed: <strong>"{metadata?.tag}"</strong></span>;
    case 'event_booked':
      return <span>Event booked: <strong>"{metadata?.eventTitle || 'Appointment'}"</strong></span>;
    case 'event_updated':
      return <span>Event updated: <strong>"{metadata?.eventTitle || 'Appointment'}"</strong></span>;
    case 'event_cancelled':
      return <span>Event cancelled: <strong>"{metadata?.eventTitle || 'Appointment'}"</strong></span>;
    case 'event_deleted':
      return <span>Event deleted: <strong>"{metadata?.eventTitle || 'Appointment'}"</strong></span>;
    case 'lead_status_changed':
      return (
        <span>
          Lead status: <span className="font-medium text-muted-foreground">{metadata?.from || 'None'}</span> to{' '}
          <strong>{metadata?.to || 'None'}</strong>
        </span>
      );
    default:
      return <span>{action}</span>;
  }
}

const neutralClasses = 'text-white bg-zinc-700 border-zinc-700 dark:bg-zinc-800 dark:border-zinc-800';
const indigoClasses = 'text-white bg-indigo-900 border-indigo-900 dark:bg-indigo-950 dark:border-indigo-950';
const emeraldClasses = 'text-white bg-emerald-800 border-emerald-800 dark:bg-emerald-950 dark:border-emerald-950';
const roseClasses = 'text-white bg-rose-800 border-rose-800 dark:bg-rose-950 dark:border-rose-950';
const amberClasses = 'text-white bg-amber-800 border-amber-800 dark:bg-amber-950 dark:border-amber-950';

export function getConversationActionHistoryStyle(
  action: string,
): { icon: LucideIcon; classes: string } {
  switch (action) {
    case 'thread_created':
      return { icon: MessageSquarePlus, classes: 'text-white bg-slate-800 border-slate-800 dark:bg-slate-900 dark:border-slate-900' };
    case 'broadcast_sent':
      return { icon: Megaphone, classes: indigoClasses };
    case 'reminder_sent':
      return { icon: BellRing, classes: indigoClasses };
    case 'followup_sent':
      return { icon: Clock3, classes: indigoClasses };
    case 'ai_enabled':
    case 'ai_disabled':
      return { icon: Bot, classes: 'text-white bg-violet-900 border-violet-900 dark:bg-violet-950 dark:border-violet-950' };
    case 'assignee_changed':
      return { icon: UserCheck, classes: 'text-white bg-slate-800 border-slate-800 dark:bg-slate-900 dark:border-slate-900' };
    case 'escalation_raised':
      return { icon: AlertCircle, classes: amberClasses };
    case 'escalation_resolved':
      return { icon: CheckCircle2, classes: emeraldClasses };
    case 'tag_added':
      return { icon: Tag, classes: emeraldClasses };
    case 'tag_removed':
      return { icon: Eraser, classes: roseClasses };
    case 'event_booked':
      return { icon: CalendarCheck, classes: emeraldClasses };
    case 'event_updated':
      return { icon: CalendarClock, classes: indigoClasses };
    case 'event_cancelled':
      return { icon: CalendarX, classes: roseClasses };
    case 'event_deleted':
      return { icon: Trash2, classes: roseClasses };
    case 'lead_status_changed':
      return { icon: Flame, classes: amberClasses };
    case 'user_details_changed':
      return { icon: Contact, classes: neutralClasses };
    default:
      return { icon: Clock, classes: neutralClasses };
  }
}
