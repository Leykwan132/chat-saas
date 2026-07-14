import type { Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import { internal } from './_generated/api';
import { resolveWorkflowAutomationConfigs } from './workflowAutomationConfig';
import { getWorkflowForAgent } from './workflowCore';
import { getReminderScheduleCandidates } from './workflowReminderSchedule';
import { workflowReminderWorkpool } from './workflowReminderPool';

export async function scheduleWorkflowRemindersForAppointment(
  ctx: MutationCtx,
  appointmentId: Id<'calendarEvents'>,
) {
  const appointment = await ctx.db.get(appointmentId);
  if (!appointment || appointment.status !== 'confirmed' || !appointment.agentId) return 0;
  const workflow = await getWorkflowForAgent(ctx, appointment.agentId);
  if (!workflow) return 0;
  const config = resolveWorkflowAutomationConfigs(workflow).reminder;
  if (!config.enabled) return 0;
  if (!config.activationScope || !config.template) throw new Error('Reminder configuration is incomplete');
  if (!appointment.conversationId) return 0;
  const conversation = await ctx.db.get(appointment.conversationId);
  if (!conversation || conversation.service !== 'whatsapp' || !conversation.channelId || !conversation.customerId) return 0;
  const channel = await ctx.db.get(conversation.channelId);
  const customer = await ctx.db.get(conversation.customerId);
  if (!channel || channel.service !== 'whatsapp' || channel.status !== 'connected' || !customer) return 0;
  const now = Date.now();
  const candidates = getReminderScheduleCandidates({
    appointmentId,
    appointmentStartAt: appointment.startAt,
    now,
    timingOptionIds: config.timingOptionIds,
  });
  let scheduledCount = 0;
  for (const candidate of candidates) {
    const existing = await ctx.db
      .query('workflowAutomationRuns')
      .withIndex('by_deduplicationKey', (q) => q.eq('deduplicationKey', candidate.deduplicationKey))
      .unique();
    if (existing?.status === 'sent') continue;
    if (
      existing?.status === 'scheduled' &&
      existing.scheduledAt === candidate.scheduledAt &&
      existing.configurationRevision === config.revision
    ) continue;
    if (existing?.currentWorkId) {
      await workflowReminderWorkpool.cancel(ctx, existing.currentWorkId as never);
    }
    const values = {
      workflowId: workflow._id,
      agentId: appointment.agentId,
      orgId: workflow.orgId,
      automationKind: 'reminder' as const,
      subjectType: 'appointment' as const,
      subjectKey: appointmentId,
      deduplicationKey: candidate.deduplicationKey,
      appointmentId,
      appointmentStartAt: appointment.startAt,
      conversationId: conversation._id,
      customerId: customer._id,
      channelId: channel._id,
      configurationRevision: config.revision,
      activationScope: config.activationScope,
      attempt: 1,
      scheduledAt: candidate.scheduledAt,
      status: 'scheduled' as const,
      workIds: existing?.workIds ?? [],
      templateSnapshot: config.template,
      reason: undefined,
      providerMessageId: undefined,
      attemptedAt: undefined,
      sentAt: undefined,
      updatedAt: now,
    };
    const runId = existing?._id ?? await ctx.db.insert('workflowAutomationRuns', {
      ...values,
      createdAt: now,
    });
    if (existing) await ctx.db.patch(existing._id, values);
    const workId = await workflowReminderWorkpool.enqueueAction(
      ctx,
      internal.workflowReminderWorker.sendReminder,
      { runId },
      {
        runAt: candidate.scheduledAt,
        onComplete: internal.workflowReminderWorker.completeReminder,
        context: { runId },
        retry: false,
      },
    );
    console.log('workflow_reminder_workpool_scheduled', {
      appointmentId,
      runId,
      workId,
      scheduledAt: candidate.scheduledAt,
      timingOptionId: candidate.timingOptionId,
      templateName: config.template.name,
    });
    await ctx.db.patch(runId, {
      currentWorkId: workId,
      workIds: [...values.workIds, workId],
      updatedAt: now,
    });
    scheduledCount += 1;
  }
  return scheduledCount;
}

export async function cancelWorkflowRemindersForAppointment(
  ctx: MutationCtx,
  appointmentId: Id<'calendarEvents'>,
  reason: string,
) {
  const runs = await ctx.db
    .query('workflowAutomationRuns')
    .withIndex('by_appointmentId', (q) => q.eq('appointmentId', appointmentId))
    .collect();
  const now = Date.now();
  let cancelledCount = 0;
  for (const run of runs) {
    if (run.status !== 'scheduled') continue;
    if (run.currentWorkId) {
      await workflowReminderWorkpool.cancel(ctx, run.currentWorkId as never);
    }
    await ctx.db.patch(run._id, {
      status: 'cancelled',
      reason,
      updatedAt: now,
    });
    cancelledCount += 1;
  }
  return cancelledCount;
}
