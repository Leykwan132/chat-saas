import type { WorkId } from '@convex-dev/workpool';
import { v } from 'convex/values';
import { internal } from './_generated/api';
import { internalMutation } from './_generated/server';
import { resolveWorkflowAutomationConfigs } from './workflowAutomationConfig';
import { scheduleWorkflowRemindersForAppointment } from './workflowReminderRuntime';
import { handleWorkflowFollowUpOutbound } from './workflowFollowUpRuntime';
import {
  isEligibleWorkflowFollowUpOutbound,
  matchesWorkflowFollowUpAudience,
  shouldReconcileWorkflowFollowUpOutbound,
} from './workflowFollowUpTimer';
import { workflowReminderWorkpool } from './workflowReminderPool';
import { workflowFollowUpWorkpool } from './workflowFollowUpPool';

async function appendWorkId(
  ctx: Parameters<typeof scheduleWorkflowRemindersForAppointment>[0],
  operationId: Parameters<typeof ctx.db.get<'workflowAutomationOperations'>>[0],
  workId: WorkId,
) {
  const operation = await ctx.db.get(operationId);
  if (!operation) return;
  await ctx.db.patch(operation._id, {
    currentWorkId: workId,
    workIds: [...operation.workIds, workId],
    updatedAt: Date.now(),
  });
}

export const reconcileReminderBatch = internalMutation({
  args: { operationId: v.id('workflowAutomationOperations') },
  handler: async (ctx, args) => {
    const operation = await ctx.db.get(args.operationId);
    if (!operation || operation.status !== 'scheduled') return;
    const workflow = await ctx.db.get(operation.workflowId);
    if (!workflow) return;
    const config = resolveWorkflowAutomationConfigs(workflow).reminder;
    if (!config.enabled || config.revision !== operation.configurationRevision) {
      await ctx.db.patch(operation._id, { status: 'cancelled', updatedAt: Date.now() });
      return;
    }
    const page = await ctx.db
      .query('calendarEvents')
      .withIndex('by_agentId_and_startAt', (q) => (
        q.eq('agentId', operation.agentId).gt('startAt', Date.now())
      ))
      .paginate({ cursor: operation.cursor ?? null, numItems: 50 });
    for (const appointment of page.page) {
      await scheduleWorkflowRemindersForAppointment(ctx, appointment._id);
    }
    if (page.isDone) {
      await ctx.db.patch(operation._id, { status: 'completed', updatedAt: Date.now() });
      return;
    }
    await ctx.db.patch(operation._id, { cursor: page.continueCursor, updatedAt: Date.now() });
    const workId = await workflowReminderWorkpool.enqueueMutation(
      ctx,
      internal.workflowAutomationReconciliation.reconcileReminderBatch,
      { operationId: operation._id },
      {
        onComplete: internal.workflowAutomationLifecycle.completeOperationWork,
        context: { operationId: operation._id },
      },
    );
    await appendWorkId(ctx, operation._id, workId);
  },
});

export const reconcileFollowUpBatch = internalMutation({
  args: { operationId: v.id('workflowAutomationOperations') },
  handler: async (ctx, args) => {
    const operation = await ctx.db.get(args.operationId);
    if (!operation || operation.status !== 'scheduled') return;
    const workflow = await ctx.db.get(operation.workflowId);
    if (!workflow) return;
    const config = resolveWorkflowAutomationConfigs(workflow).followUp;
    if (!config.enabled || config.revision !== operation.configurationRevision) {
      await ctx.db.patch(operation._id, { status: 'cancelled', updatedAt: Date.now() });
      return;
    }
    const page = await ctx.db
      .query('conversations')
      .withIndex('by_orgId_and_assignedAgentId_and_lastMessageAt', (q) => (
        q.eq('orgId', workflow.orgId).eq('assignedAgentId', operation.agentId)
      ))
      .order('desc')
      .paginate({ cursor: operation.cursor ?? null, numItems: 50 });
    const now = Date.now();
    for (const conversation of page.page) {
      if (conversation.service !== 'whatsapp' || conversation.status === 'closed' || !conversation.customerId) continue;
      const customer = await ctx.db.get(conversation.customerId);
      if (!customer || !matchesWorkflowFollowUpAudience({
        filters: config.audienceFilters,
        leadTemperature: customer.leadTemperature,
        tags: customer.tags,
      })) continue;
      const message = await ctx.db
        .query('messages')
        .withIndex('by_conversationId_and_createdAt', (q) => q.eq('conversationId', conversation._id))
        .order('desc')
        .first();
      if (!message || !isEligibleWorkflowFollowUpOutbound({
        service: message.service,
        direction: message.direction,
        status: message.status,
        source: message.workflowAutomationSource ?? (message.messageKind === 'broadcast' ? 'broadcast' : message.agentId ? 'ai' : 'human'),
        broadcast: message.messageKind === 'broadcast',
      })) continue;
      const dueAt = message.createdAt + config.startAfterMinutes * 60 * 1000;
      const existingTimer = await ctx.db
        .query('workflowFollowUpTimers')
        .withIndex('by_workflowId_and_conversationId', (q) => (
          q.eq('workflowId', workflow._id).eq('conversationId', conversation._id)
        ))
        .unique();
      if (!shouldReconcileWorkflowFollowUpOutbound({
        hasActiveTimer: existingTimer?.status === 'active',
        dueAt,
        now,
      })) continue;
      await handleWorkflowFollowUpOutbound(ctx, message._id);
    }
    if (page.isDone) {
      await ctx.db.patch(operation._id, { status: 'completed', updatedAt: Date.now() });
      return;
    }
    await ctx.db.patch(operation._id, { cursor: page.continueCursor, updatedAt: Date.now() });
    const workId = await workflowFollowUpWorkpool.enqueueMutation(
      ctx,
      internal.workflowAutomationReconciliation.reconcileFollowUpBatch,
      { operationId: operation._id },
      {
        onComplete: internal.workflowAutomationLifecycle.completeOperationWork,
        context: { operationId: operation._id },
      },
    );
    await appendWorkId(ctx, operation._id, workId);
  },
});
