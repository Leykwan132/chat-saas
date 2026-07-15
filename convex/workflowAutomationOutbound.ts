import type { Doc } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import { saveHumanReply } from './chat/threads';
import type { WorkflowWhatsappSendResult } from './workflowWhatsappTemplateSender';

export function projectWorkflowAutomationOutbound(args: {
  automationKind: 'reminder' | 'followUp';
  runId: string;
  attempt: number;
  templateName: string;
  result: WorkflowWhatsappSendResult;
}) {
  const content = args.result.renderedContent;
  const asset = args.result.headerAsset;
  if (!content.trim() && !asset) {
    throw new Error('Workflow automation send has no resolved content');
  }
  const isReminder = args.automationKind === 'reminder';
  const attachment = asset ? { url: asset.url, mimeType: asset.mimeType } : undefined;
  return {
    action: isReminder ? 'reminder_sent' as const : 'followup_sent' as const,
    content,
    files: attachment && asset?.headerFormat !== 'IMAGE' ? [attachment] : [],
    images: attachment && asset?.headerFormat === 'IMAGE' ? [attachment] : [],
    logMetadata: {
      ...(!isReminder ? { attemptNumber: args.attempt } : {}),
      message: content,
      runId: args.runId,
      templateName: args.templateName,
    },
    providerMessageId: args.result.providerMessageId,
    source: isReminder ? 'workflowReminder' as const : 'workflowFollowUp' as const,
  };
}

export async function recordWorkflowAutomationOutbound(
  ctx: MutationCtx,
  args: {
    run: Doc<'workflowAutomationRuns'>;
    result: WorkflowWhatsappSendResult;
  },
) {
  const { run } = args;
  if (!run.conversationId || !run.customerId || !run.channelId) {
    throw new Error('Workflow automation run has no conversation delivery context');
  }
  const [conversation, customer] = await Promise.all([
    ctx.db.get(run.conversationId),
    ctx.db.get(run.customerId),
  ]);
  if (!conversation || conversation.channelId !== run.channelId) {
    throw new Error('Workflow automation conversation is unavailable');
  }
  if (!customer || customer.orgId !== run.orgId) {
    throw new Error('Workflow automation customer is unavailable');
  }
  const projected = projectWorkflowAutomationOutbound({
    automationKind: run.automationKind,
    runId: run._id,
    attempt: run.attempt,
    templateName: run.templateSnapshot.name,
    result: args.result,
  });
  const agentMessageId = await saveHumanReply(
    ctx,
    conversation.threadId,
    projected.content,
    {
      assignedAgentId: run.agentId,
      sentAt: Date.now(),
      images: projected.images,
      files: projected.files,
      messageMetadata: { workflowAutomationSource: projected.source },
    },
  );
  const now = Date.now();
  await ctx.db.insert('messages', {
    orgId: conversation.orgId,
    conversationId: conversation._id,
    channelId: run.channelId,
    service: conversation.service,
    externalId: projected.providerMessageId,
    orgAddress: conversation.orgAddress,
    contactAddress: conversation.contactAddress,
    direction: 'outgoing',
    agentId: run.agentId,
    contentType: 'text',
    content: projected.content,
    agentMessageId,
    workflowAutomationSource: projected.source,
    status: 'sent',
    statusUpdatedAt: now,
    createdAt: now,
  });
  await ctx.db.patch(conversation._id, {
    lastMessageAt: now,
    lastMessagePreview: projected.content.slice(0, 140),
    updatedAt: now,
  });
  await ctx.db.insert('conversationLogs', {
    conversationId: conversation._id,
    orgId: conversation.orgId,
    action: projected.action,
    actorType: 'system',
    metadata: projected.logMetadata,
    performedAt: now,
  });
}
