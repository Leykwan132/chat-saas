import { AlertTriangle } from 'lucide-react';
import type { InboxEscalationMarker } from '@/lib/formatMessageTime';

export function InboxEscalationDivider({ escalation }: { escalation: InboxEscalationMarker }) {
  return (
    <div
      id={`inbox-escalation-${escalation.id}`}
      tabIndex={-1}
      className="my-3 flex w-full items-center gap-3 text-amber-700 outline-none dark:text-amber-400"
      role="separator"
      aria-label="AI escalated to human"
    >
      <div className="h-px flex-1 bg-amber-200 dark:bg-amber-900/70" />
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold dark:border-amber-900/70 dark:bg-amber-950/40">
        <AlertTriangle className="size-3.5" aria-hidden />
        AI escalated to human
      </span>
      <div className="h-px flex-1 bg-amber-200 dark:bg-amber-900/70" />
    </div>
  );
}
