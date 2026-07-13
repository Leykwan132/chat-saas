import type { Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';

export async function recordWorkflowAutomationOutbound(
  ctx: MutationCtx,
  args: {
    conversationId: Id<'conversations'>;
    providerMessageId?: string;
    source: 'workflowReminder' | 'workflowFollowUp';
    templateName: string;
  },
) {
  const conversation = await ctx.db.get(args.conversationId);
  if (!conversation || !conversation.channelId) return undefined;
  const now = Date.now();
  const content = `${args.source === 'workflowReminder' ? 'Reminder' : 'Follow-up'} Template: ${args.templateName}`;
  const messageId = await ctx.db.insert('messages', {
    orgId: conversation.orgId,
    conversationId: conversation._id,
    channelId: conversation.channelId,
    service: conversation.service,
    externalId: args.providerMessageId,
    orgAddress: conversation.orgAddress,
    contactAddress: conversation.contactAddress,
    direction: 'outgoing',
    agentId: conversation.assignedAgentId,
    contentType: 'text',
    content,
    status: 'sent',
    workflowAutomationSource: args.source,
    createdAt: now,
  });
  await ctx.db.patch(conversation._id, {
    lastMessageAt: now,
    lastMessagePreview: content.slice(0, 140),
    updatedAt: now,
  });
  return messageId;
}
