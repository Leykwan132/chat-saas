import type { Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import {
  cancelWorkflowFollowUpForConversation,
  handleWorkflowFollowUpOutbound,
} from './workflowFollowUpRuntime';

export async function handleWorkflowAutomationMessageActivity(
  ctx: MutationCtx,
  args: {
    conversationId: Id<'conversations'>;
    direction: 'incoming' | 'outgoing';
    isHistorical: boolean;
    messageIds: Id<'messages'>[];
  },
) {
  if (args.isHistorical) return;
  if (args.direction === 'incoming') {
    await cancelWorkflowFollowUpForConversation(ctx, args.conversationId, 'Customer replied');
    return;
  }
  for (const messageId of args.messageIds) {
    await handleWorkflowFollowUpOutbound(ctx, messageId);
  }
}
