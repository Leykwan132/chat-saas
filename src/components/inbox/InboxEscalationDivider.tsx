import { AlertTriangle, ChevronDown } from 'lucide-react';
import type { InboxEscalationMarker } from '@/lib/formatMessageTime';

export function InboxEscalationDivider({ escalation }: { escalation: InboxEscalationMarker }) {
  return (
    <details
      id={`inbox-escalation-${escalation.id}`}
      tabIndex={-1}
      className="group my-3 w-full outline-none"
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 text-muted-foreground [&::-webkit-details-marker]:hidden">
        <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-foreground dark:border-zinc-800 dark:bg-zinc-900">
          <AlertTriangle className="size-3.5" aria-hidden />
          AI escalated to human
          <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" aria-hidden />
        </span>
        <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
      </summary>
      <div className="mx-auto mt-2 max-w-md rounded-md border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-muted-foreground dark:border-zinc-800 dark:bg-zinc-900">
        <dl className="grid gap-2">
          <div>
            <dt className="font-semibold text-foreground">Customer request</dt>
            <dd className="mt-1 leading-relaxed text-foreground">{escalation.question}</dd>
          </div>
          {escalation.context ? (
            <div>
              <dt className="font-semibold text-foreground">Why it needs a human</dt>
              <dd className="mt-1 leading-relaxed text-foreground">{escalation.context}</dd>
            </div>
          ) : null}
        </dl>
      </div>
    </details>
  );
}
