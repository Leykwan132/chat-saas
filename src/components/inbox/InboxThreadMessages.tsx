import { Loader2 } from 'lucide-react';
import {
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Message, MessageContent } from '@/components/ai-elements/message';
import { formatMessageTime } from '@/lib/formatMessageTime';
import type { InboxUIMessage } from '@/lib/inboxOptimistic';
import { inboxMessageFrom } from '@/lib/inboxOptimistic';
import { cn } from '@/lib/utils';

export type InboxThreadMessagesProps = {
  messages: InboxUIMessage[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
};

function OutgoingLabel({ message }: { message: InboxUIMessage }) {
  return (
    <span className="flex items-center justify-end gap-1 pr-0.5 text-[10px] text-muted-foreground">
      <span>{message.agentName ?? 'Unknown agent'}</span>
      {message.sentByAi ? (
        <span className="rounded bg-muted px-1 py-px text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
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
          messages.map((m) => {
            const isCustomer = m.role === 'user';
            const isPending = m.status === 'pending';

            return (
              <Message from={inboxMessageFrom(m.role)} key={m.key} className="w-full">
                <MessageContent
                  className={cn('w-fit max-w-[78%]', !isCustomer && 'ml-auto')}
                >
                  {isCustomer ? (
                    <div className="flex flex-col gap-0.5">
                      <div
                        className={cn(
                          'rounded-[2px_16px_16px_16px] border border-border bg-card px-3 py-1.5',
                          'text-xs leading-snug text-foreground whitespace-pre-wrap break-words',
                        )}
                      >
                        {m.text}
                      </div>
                      <span className="pl-0.5 text-[10px] text-muted-foreground">
                        {formatMessageTime(m._creationTime)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-0.5">
                      <OutgoingLabel message={m} />
                      <div
                        className={cn(
                          'rounded-[16px_16px_2px_16px] bg-primary px-3 py-1.5',
                          'text-xs leading-snug text-primary-foreground whitespace-pre-wrap break-words',
                          isPending && 'opacity-80',
                        )}
                      >
                        {m.text}
                      </div>
                      <span className="flex items-center justify-end gap-1 pr-0.5 text-[10px] text-muted-foreground">
                        {isPending ? (
                          <Loader2 className="size-2.5 animate-spin" aria-label="Sending" />
                        ) : null}
                        {formatMessageTime(m._creationTime)}
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
