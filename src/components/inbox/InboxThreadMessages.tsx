import { Check, Loader2 } from 'lucide-react';
import { useMemo } from 'react';
import {
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Message, MessageContent } from '@/components/ai-elements/message';
import {
  buildInboxThreadItems,
  formatMessageTime,
} from '@/lib/formatMessageTime';
import type { InboxUIMessage } from '@/lib/inboxOptimistic';
import { inboxMessageFrom } from '@/lib/inboxOptimistic';
import { cn } from '@/lib/utils';

export type InboxThreadMessagesProps = {
  messages: InboxUIMessage[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
};

function DayDivider({ label }: { label: string }) {
  return (
    <div className="flex w-full justify-center py-3" role="separator" aria-label={label}>
      <span className="rounded-full bg-muted px-3 py-1 text-[13px] font-medium text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

function OutgoingLabel({ message }: { message: InboxUIMessage }) {
  return (
    <span className="flex items-center justify-end gap-1 pr-0.5 text-xs text-muted-foreground">
      <span>{message.agentName ?? 'Unknown agent'}</span>
      {message.sentByAi ? (
        <span className="rounded bg-muted px-1 py-px text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          AI
        </span>
      ) : null}
    </span>
  );
}

export function InboxThreadMessages({
  messages,
  loading = false,
  emptyTitle = 'No messages yet',
  emptyDescription = 'Messages in this conversation will appear here.',
}: InboxThreadMessagesProps) {
  const threadItems = useMemo(() => buildInboxThreadItems(messages), [messages]);

  return (
    <>
      <ConversationContent
        scrollClassName="no-scrollbar overscroll-y-contain"
        className="gap-2 px-6 py-6"
      >
        {loading ? null : messages.length === 0 ? (
          <ConversationEmptyState
            title={emptyTitle}
            description={emptyDescription}
          />
        ) : (
          threadItems.map((item) => {
            if (item.type === 'day') {
              return <DayDivider key={item.key} label={item.label} />;
            }

            const m = item.message;
            const isCustomer = m.role === 'user';
            const isPending = m.status === 'pending';

            return (
              <Message from={inboxMessageFrom(m.role)} key={m.key} className="w-full">
                <MessageContent
                  className={cn('max-w-[78%]', !isCustomer && 'ml-auto')}
                >
                  {isCustomer ? (
                    <div className="flex w-fit max-w-full flex-col items-start gap-0.5">
                      <div
                        className={cn(
                          'w-fit max-w-full rounded-[2px_16px_16px_16px] border border-border bg-card px-3 py-1.5',
                          'text-sm leading-snug text-foreground whitespace-pre-wrap break-words',
                        )}
                      >
                        {m.text}
                      </div>
                      <span className="pl-0.5 text-xs text-muted-foreground">
                        {formatMessageTime(m._creationTime)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex w-fit max-w-full flex-col items-end gap-0.5">
                      <OutgoingLabel message={m} />
                      <div
                        className={cn(
                          'w-fit max-w-full rounded-[16px_16px_2px_16px] bg-primary px-3 py-1.5',
                          'text-sm leading-snug text-primary-foreground whitespace-pre-wrap break-words',
                          isPending && 'opacity-80',
                        )}
                      >
                        {m.text}
                      </div>
                      <span className="flex items-center justify-end gap-0.5 pr-0.5 text-xs text-muted-foreground">
                        {isPending ? (
                          <Loader2
                            className="size-2.5 shrink-0 animate-spin opacity-80"
                            aria-label="Sending"
                          />
                        ) : (
                          <Check
                            className="size-2.5 shrink-0 opacity-80"
                            aria-hidden
                          />
                        )}
                        <span>{formatMessageTime(m._creationTime)}</span>
                      </span>
                    </div>
                  )}
                </MessageContent>
              </Message>
            );
          })
        )}
      </ConversationContent>
      <ConversationScrollButton />
    </>
  );
}
