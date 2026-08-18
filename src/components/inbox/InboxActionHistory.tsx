import { ChevronDown, Clock, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  formatConversationActionHistoryText,
  getConversationActionHistoryStyle,
  type ConversationActionHistoryMetadata,
} from './conversationActionHistoryPresentation';
import { getEscalationMetadata } from './inboxEscalationMarkers';

export type InboxActionHistoryLog = {
  id: string;
  action: string;
  metadata?: ConversationActionHistoryMetadata;
  performedAt: number;
  actorType: 'user' | 'ai' | 'system';
  actorName?: string;
};

function formatTimelineRelative(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  if (diffMs < 60_000) return 'now';
  const min = Math.floor(diffMs / 60_000);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function InboxActionHistory({
  logs,
  open,
  onOpenChange,
  onFocusEscalation,
}: {
  logs: InboxActionHistoryLog[] | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFocusEscalation: (escalationId: string) => void;
}) {
  return (
    <div className="flex flex-col">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-muted/40"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
      >
        <Clock className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="text-sm font-semibold text-foreground">Action History</span>
        <div className="flex-1" />
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform duration-200',
            !open && '-rotate-90',
          )}
        />
      </button>
      {open ? (
        <div className="px-4 pb-3">
          {logs === undefined ? (
            <div className="border-l border-zinc-200 py-2 pl-4 text-xs text-muted-foreground dark:border-zinc-800">
              Loading action history…
            </div>
          ) : logs.length === 0 ? (
            <div className="border-l border-zinc-200 py-2 pl-4 text-xs text-muted-foreground dark:border-zinc-800">
              No action history logged yet.
            </div>
          ) : (
            <div className="space-y-0 pl-2 pr-1">
              {logs.map((log, index) => {
                const styleInfo = getConversationActionHistoryStyle(log.action);
                const isEscalation = log.action === 'escalation_raised' && getEscalationMetadata(log.metadata);

                return (
                  <div key={log.id} className="flex gap-3 text-xs">
                    <div className="w-8 shrink-0 select-none pt-0.5 text-right text-[11px] font-medium tabular-nums text-muted-foreground/80">
                      {formatTimelineRelative(log.performedAt)}
                    </div>
                    <div className="flex shrink-0 flex-col items-center">
                      <div className={cn(
                        'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border shadow-none',
                        styleInfo.classes,
                      )}>
                        <styleInfo.icon className="size-3 shrink-0" />
                      </div>
                      {index < logs.length - 1 ? <div className="my-1 w-px flex-1 bg-zinc-200 dark:bg-zinc-800" /> : null}
                    </div>
                    <div className="flex-1 pb-4 pt-0.5">
                      <div className="text-[13px] font-normal leading-snug text-muted-foreground">
                        {formatConversationActionHistoryText(log.action, log.metadata)}
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                        <span>by</span>
                        {log.actorType === 'user' ? (
                          <span className="inline-flex items-center gap-1 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                            <User className="size-2.5 shrink-0 text-zinc-400 dark:text-zinc-500" />
                            <span>{log.actorName ?? 'User'}</span>
                          </span>
                        ) : log.actorType === 'ai' ? (
                          <span className="font-semibold text-violet-600 dark:text-violet-400">{log.actorName ?? 'AI'}</span>
                        ) : (
                          <span className="font-semibold text-muted-foreground">System</span>
                        )}
                      </div>
                      {isEscalation ? (
                        <button
                          type="button"
                          className="mt-2 text-xs font-medium text-primary hover:underline"
                          onClick={() => onFocusEscalation(log.id)}
                        >
                          View in chat
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
