import type { UIMessage } from '@convex-dev/agent/react';
import type { InboxMessageReaction } from '../../shared/messageReactions';
import {
  getInboxAudioAttachments,
  getInboxImageAttachments,
  isInboxAudioPlaceholder,
  isInboxImagePlaceholder,
  type InboxAttachment,
} from '../../shared/inboxAttachments';

export type InboxUIMessage = UIMessage & {
  sentByAi?: boolean;
  inboxAttachments?: InboxAttachment[];
  ledgerMessageId?: string;
  externalId?: string;
  reactions?: InboxMessageReaction[];
};

export function hasVisibleInboxContent(message: InboxUIMessage): boolean {
  if (getInboxAudioAttachments(message).length > 0) return true;
  if (getInboxImageAttachments(message).length > 0) return true;
  const text = message.text?.trim() ?? '';
  return (
    text.length > 0 &&
    !isInboxAudioPlaceholder(text) &&
    !isInboxImagePlaceholder(text)
  );
}
import type { OptimisticLocalStore } from 'convex/browser';
import { insertAtTop } from 'convex/react';
import type { FunctionReference, PaginationOptions, PaginationResult } from 'convex/server';
import type { StreamArgs, MessageDoc } from '@convex-dev/agent';
import type { SyncStreamsReturnValue } from '@convex-dev/agent';
import type { Id } from '../../convex/_generated/dataModel';

/** Inbox layout: customer left, business right (inverse of playground Message alignment). */
export function inboxMessageFrom(
  role: UIMessage['role'],
): 'user' | 'assistant' {
  return role === 'user' ? 'assistant' : 'user';
}

function randomUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

type InboxThreadMessagesQuery = FunctionReference<
  'query',
  'public',
  {
    threadId: string;
    conversationId: Id<'conversations'>;
    paginationOpts: PaginationOptions;
    streamArgs?: StreamArgs;
  },
  PaginationResult<MessageDoc | UIMessage> & {
    streams?: SyncStreamsReturnValue;
  }
>;

export function optimisticallySendInboxReply(query: InboxThreadMessagesQuery) {
  return (
    store: OptimisticLocalStore,
    args: {
      threadId: string;
      conversationId: Id<'conversations'>;
      content: string;
      agentName: string;
      sentByAi?: boolean;
    },
  ) => {
    const trimmed = args.content.trim();
    if (!trimmed) return;

    const queries = store.getAllQueries(query);
    let maxOrder = -1;
    for (const q of queries) {
      if (q.args?.threadId !== args.threadId) continue;
      if (q.args?.conversationId !== args.conversationId) continue;
      if (q.args.streamArgs) continue;
      for (const m of q.value?.page ?? []) {
        maxOrder = Math.max(maxOrder, m.order);
      }
    }

    const order = maxOrder + 1;
    const stepOrder = 0;
    const id = randomUUID();

    insertAtTop({
      paginatedQuery: query,
      argsToMatch: {
        threadId: args.threadId,
        conversationId: args.conversationId,
        streamArgs: undefined,
      },
      item: {
        _creationTime: Date.now(),
        _id: id,
        id,
        key: `${args.threadId}-${order}-${stepOrder}`,
        order,
        stepOrder,
        status: 'pending',
        tool: false,
        message: { role: 'assistant', content: trimmed },
        parts: [{ type: 'text', text: trimmed }],
        role: 'assistant',
        text: trimmed,
        agentName: args.agentName,
        sentByAi: args.sentByAi ?? false,
      } as InboxUIMessage & { _id: string },
      localQueryStore: store,
    });
  };
}
