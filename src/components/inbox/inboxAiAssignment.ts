import type { OptimisticLocalStore } from 'convex/browser';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

export function optimisticallySetInboxAiEnabled(
  store: OptimisticLocalStore,
  { conversationId, enabled }: { conversationId: Id<'conversations'>; enabled: boolean },
) {
  const queryArgs = { conversationId };
  const conversation = store.getQuery(api.conversations.get, queryArgs);
  if (conversation) {
    store.setQuery(api.conversations.get, queryArgs, {
      ...conversation,
      assignToAiAgent: enabled,
    });
  }
}
