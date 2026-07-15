import type { Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import { internal } from './_generated/api';
import { resolveWorkflowAutomationConfigs } from './workflowAutomationConfig';
import { getWorkflowForAgent } from './workflowCore';
import {
  isEligibleWorkflowFollowUpOutbound,
  matchesWorkflowFollowUpAudience,
  planWorkflowFollowUpOutbound,
} from './workflowFollowUpTimer';
import { workflowFollowUpWorkpool } from './workflowFollowUpPool';

function messageSource(message: {
  workflowAutomationSource?: 'workflowReminder' | 'workflowFollowUp';
  messageKind?: string;
  agentId?: Id<'agents'>;
}) {
  if (message.workflowAutomationSource) return message.workflowAutomationSource;
  if (message.messageKind === 'broadcast') return 'broadcast' as const;
  return message.agentId ? 'ai' as const : 'human' as const;
}

export async function enqueueWorkflowFollowUpWake(
  ctx: MutationCtx,
  args: {
    timerId: Id<'workflowFollowUpTimers'>;
    runId: Id<'workflowAutomationRuns'>;
    dueAt: number;
    priorWorkIds: string[];
  },
) {
  const run = await ctx.db.get(args.runId);
  if (!run) throw new Error('Follow-up run not found');
  console.log('workflow_followup_workpool_enqueue', {
    conversationId: run.conversationId,
    timerId: args.timerId,
    runId: args.runId,
    dueAt: args.dueAt,
    priorWorkIds: args.priorWorkIds,
  });
  const workId = await workflowFollowUpWorkpool.enqueueAction(
    ctx,
    internal.workflowFollowUpWorker.wakeFollowUp,
    { timerId: args.timerId, runId: args.runId },
    {
      runAt: args.dueAt,
      onComplete: internal.workflowFollowUpWorker.completeFollowUpWake,
      context: { timerId: args.timerId, runId: args.runId },
      retry: false,
    },
  );
  console.log('workflow_followup_workpool_scheduled', {
    conversationId: run.conversationId,
    timerId: args.timerId,
    runId: args.runId,
    workId,
    scheduledAt: args.dueAt,
    attempt: run.attempt,
    templateName: run.templateSnapshot.name,
  });
  const workIds = [...args.priorWorkIds, workId];
  await ctx.db.patch(args.timerId, { currentWorkId: workId, workIds, updatedAt: Date.now() });
  await ctx.db.patch(args.runId, { currentWorkId: workId, workIds, updatedAt: Date.now() });
  return workId;
}

export async function handleWorkflowFollowUpOutbound(
  ctx: MutationCtx,
  messageId: Id<'messages'>,
) {
  const message = await ctx.db.get(messageId);
  if (!message || !isEligibleWorkflowFollowUpOutbound({
    service: message.service,
    direction: message.direction,
    status: message.status,
    source: messageSource(message),
    broadcast: message.messageKind === 'broadcast',
  })) return false;
  const conversation = await ctx.db.get(message.conversationId);
  if (!conversation?.assignedAgentId || !conversation.customerId || !conversation.channelId) return false;
  const workflow = await getWorkflowForAgent(ctx, conversation.assignedAgentId);
  if (!workflow) return false;
  const config = resolveWorkflowAutomationConfigs(workflow).followUp;
  if (!config.enabled) return false;
  const customer = await ctx.db.get(conversation.customerId);
  if (!customer) return false;
  if (!config.activationScope) throw new Error('Follow-up configuration has no activation scope');
  if (!matchesWorkflowFollowUpAudience({
    filters: config.audienceFilters,
    leadTemperature: customer.leadTemperature,
    tags: customer.tags,
  })) return false;
  const template = config.messageStrategy === 'same'
    ? config.sameTemplate
    : config.attemptTemplates[0];
  if (!template) throw new Error('Follow-up configuration has no first message');
  const existingTimer = await ctx.db
    .query('workflowFollowUpTimers')
    .withIndex('by_workflowId_and_conversationId', (q) => (
      q.eq('workflowId', workflow._id).eq('conversationId', conversation._id)
    ))
    .unique();
  const plan = planWorkflowFollowUpOutbound({
    existingWorkId: existingTimer?.status === 'active' && existingTimer.configurationRevision === config.revision
      ? existingTimer.currentWorkId
      : undefined,
    latestOutboundAt: message.createdAt,
    startAfterMs: config.startAfterMinutes * 60 * 1000,
  });
  const now = Date.now();
  if (existingTimer?.status === 'active' && existingTimer.configurationRevision === config.revision) {
    if (!existingTimer.currentRunId) throw new Error('Active follow-up timer has no run');
    await ctx.db.patch(existingTimer._id, {
      latestOutboundMessageId: message._id,
      latestOutboundAt: message.createdAt,
      dueAt: plan.dueAt,
      updatedAt: now,
    });
    await ctx.db.patch(existingTimer.currentRunId, {
      sourceMessageId: message._id,
      scheduledAt: plan.dueAt,
      updatedAt: now,
    });
    return true;
  }
  if (existingTimer?.currentWorkId) {
    await workflowFollowUpWorkpool.cancel(ctx, existingTimer.currentWorkId as never);
  }
  if (existingTimer?.currentRunId) {
    await ctx.db.patch(existingTimer.currentRunId, {
      status: 'cancelled',
      reason: 'Follow-up configuration changed',
      updatedAt: now,
    });
  }
  const timerValues = {
    workflowId: workflow._id,
    agentId: conversation.assignedAgentId,
    conversationId: conversation._id,
    customerId: customer._id,
    channelId: conversation.channelId,
    configurationRevision: config.revision,
    latestOutboundMessageId: message._id,
    latestOutboundAt: message.createdAt,
    dueAt: plan.dueAt,
    nextAttempt: 1,
    status: 'active' as const,
    currentRunId: undefined,
    currentWorkId: undefined,
    workIds: [] as string[],
    updatedAt: now,
  };
  const timerId = existingTimer?._id ?? await ctx.db.insert('workflowFollowUpTimers', {
    ...timerValues,
    createdAt: now,
  });
  if (existingTimer) await ctx.db.patch(existingTimer._id, timerValues);
  const runId = await ctx.db.insert('workflowAutomationRuns', {
    workflowId: workflow._id,
    agentId: conversation.assignedAgentId,
    orgId: workflow.orgId,
    automationKind: 'followUp',
    subjectType: 'conversation',
    subjectKey: conversation._id,
    deduplicationKey: `followUp:${workflow._id}:${conversation._id}:${config.revision}:1`,
    conversationId: conversation._id,
    customerId: customer._id,
    channelId: conversation.channelId,
    sourceMessageId: message._id,
    configurationRevision: config.revision,
    activationScope: config.activationScope,
    attempt: 1,
    scheduledAt: plan.dueAt,
    status: 'scheduled',
    workIds: [],
    templateSnapshot: template,
    createdAt: now,
    updatedAt: now,
  });
  await ctx.db.patch(timerId, { currentRunId: runId });
  await enqueueWorkflowFollowUpWake(ctx, { timerId, runId, dueAt: plan.dueAt, priorWorkIds: [] });
  return true;
}

export async function cancelWorkflowFollowUpForConversation(
  ctx: MutationCtx,
  conversationId: Id<'conversations'>,
  reason: string,
) {
  const timers = await ctx.db
    .query('workflowFollowUpTimers')
    .withIndex('by_conversationId', (q) => q.eq('conversationId', conversationId))
    .collect();
  const now = Date.now();
  for (const timer of timers) {
    if (timer.status !== 'active') continue;
    if (timer.currentWorkId) await workflowFollowUpWorkpool.cancel(ctx, timer.currentWorkId as never);
    await ctx.db.patch(timer._id, { status: 'closed', updatedAt: now });
    if (timer.currentRunId) {
      await ctx.db.patch(timer.currentRunId, { status: 'cancelled', reason, updatedAt: now });
    }
  }
  return timers.length;
}
