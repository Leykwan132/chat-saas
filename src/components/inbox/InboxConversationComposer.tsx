import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { cn } from '@/lib/utils';
import { ConversationWindowBanner } from './ConversationWindowBanner';
import { InboxAiHandlingBar } from './InboxAiHandlingBar';
import { InboxReplyInput, type InboxReplyInputProps } from './InboxReplyInput';

type InboxConversationComposerProps = InboxReplyInputProps & {
  agentId: Id<'agents'> | undefined;
  aiHandling: boolean;
  canTakeControl: boolean;
  takingControl: boolean;
  onTakeControl: () => void;
  canReplyFromInbox: boolean;
  service: string;
  freeMessagingExpiresAt?: number;
  lastCustomerMessageAt?: number;
};

export function InboxConversationComposer({
  agentId,
  aiHandling,
  canTakeControl,
  takingControl,
  onTakeControl,
  canReplyFromInbox,
  service,
  freeMessagingExpiresAt,
  lastCustomerMessageAt,
  ...replyProps
}: InboxConversationComposerProps) {
  const agent = useQuery(api.agents.get, aiHandling && agentId ? { agentId } : 'skip');
  if (agent === null) throw new Error('Assigned agent is unavailable.');

  return (
    <div className={cn(
      'flex w-full min-w-0 flex-col',
      aiHandling ? 'gap-3' : canReplyFromInbox && 'overflow-hidden rounded-2xl border border-border bg-input/50 focus-within:border-ring [&_[data-slot=input-group]]:border-none [&_[data-slot=input-group]]:bg-transparent [&_[data-slot=input-group]]:shadow-none [&_[data-slot=input-group]]:ring-0',
    )}>
      <ConversationWindowBanner
        freeMessagingExpiresAt={freeMessagingExpiresAt}
        lastCustomerMessageAt={lastCustomerMessageAt}
        service={service}
        agentId={agentId}
      />
      {aiHandling ? (
        <InboxAiHandlingBar
          agentName={agent?.name}
          canTakeControl={canTakeControl}
          takingControl={takingControl}
          onTakeControl={onTakeControl}
        />
      ) : (
        <InboxReplyInput {...replyProps} />
      )}
    </div>
  );
}
