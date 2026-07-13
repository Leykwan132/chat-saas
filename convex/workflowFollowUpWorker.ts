import { v } from 'convex/values';
import { internal } from './_generated/api';
import { internalAction, internalMutation, internalQuery } from './_generated/server';
import { resolveWorkflowAutomationConfigs } from './workflowAutomationConfig';
import { matchesWorkflowFollowUpAudience } from './workflowFollowUpTimer';
import { enqueueWorkflowFollowUpWake } from './workflowFollowUpRuntime';
import { sendWorkflowWhatsappTemplate } from './workflowWhatsappTemplateSender';
import { recordWorkflowAutomationOutbound } from './workflowAutomationMessageRecord';
import type { Doc } from './_generated/dataModel';
import type { WorkflowWhatsappTemplateSnapshot } from '../shared/workflowAutomations';

type FollowUpWakeContext =
  | { skipped: string }
  | {
      timer: Doc<'workflowFollowUpTimers'>;
      run: Doc<'workflowAutomationRuns'>;
      workflow: Doc<'workflows'>;
      conversation: Doc<'conversations'>;
      customer: Doc<'customers'>;
      channel: Doc<'channels'>;
      config: ReturnType<typeof resolveWorkflowAutomationConfigs>['followUp'];
    };

type FollowUpWakeResult =
  | { skipped: true; reason: string }
  | { reschedule: true; dueAt: number }
  | { ok: true; providerMessageId?: string };

export function getWorkflowFollowUpWakeDecision({ now, dueAt }: { now: number; dueAt: number }) {
  return now < dueAt ? { kind: 'reschedule' as const, dueAt } : { kind: 'send' as const };
}

export const getFollowUpWakeContext = internalQuery({
  args: {
    timerId: v.id('workflowFollowUpTimers'),
    runId: v.id('workflowAutomationRuns'),
  },
  handler: async (ctx, args) => {
    const timer = await ctx.db.get(args.timerId);
    const run = await ctx.db.get(args.runId);
    if (!timer || !run || timer.status !== 'active' || run.status !== 'scheduled') {
      return { skipped: 'Follow-up timer is no longer active' } as const;
    }
    if (timer.currentRunId !== run._id) return { skipped: 'Follow-up run was replaced' } as const;
    const workflow = await ctx.db.get(timer.workflowId);
    const conversation = await ctx.db.get(timer.conversationId);
    const customer = await ctx.db.get(timer.customerId);
    const channel = await ctx.db.get(timer.channelId);
    if (!workflow || !conversation || !customer || !channel) {
      return { skipped: 'Follow-up subject is unavailable' } as const;
    }
    const config = resolveWorkflowAutomationConfigs(workflow).followUp;
    if (!config.enabled || config.revision !== timer.configurationRevision) {
      return { skipped: 'Follow-up configuration changed' } as const;
    }
    if (conversation.status === 'closed' || conversation.service !== 'whatsapp') {
      return { skipped: 'Conversation is no longer eligible' } as const;
    }
    if (channel.status !== 'connected' || channel.service !== 'whatsapp') {
      return { skipped: 'WhatsApp channel is unavailable' } as const;
    }
    if (!matchesWorkflowFollowUpAudience({
      filters: config.audienceFilters,
      leadTemperature: customer.leadTemperature,
      tags: customer.tags,
    })) return { skipped: 'Customer no longer matches the follow-up audience' } as const;
    if (run.attempt > config.maxAttempts) return { skipped: 'Follow-up attempt limit reached' } as const;
    return { timer, run, workflow, conversation, customer, channel, config } as const;
  },
});

export const wakeFollowUp = internalAction({
  args: {
    timerId: v.id('workflowFollowUpTimers'),
    runId: v.id('workflowAutomationRuns'),
  },
  handler: async (ctx, args): Promise<FollowUpWakeResult> => {
    const context: FollowUpWakeContext = await ctx.runQuery(
      internal.workflowFollowUpWorker.getFollowUpWakeContext,
      args,
    );
    if ('skipped' in context) return { skipped: true as const, reason: context.skipped };
    const decision = getWorkflowFollowUpWakeDecision({ now: Date.now(), dueAt: context.timer.dueAt });
    if (decision.kind === 'reschedule') return { reschedule: true as const, dueAt: decision.dueAt };
    const result = await sendWorkflowWhatsappTemplate(ctx, {
      channel: context.channel,
      customer: context.customer,
      orgId: context.run.orgId,
      template: context.run.templateSnapshot,
    });
    return { ok: true as const, ...result };
  },
});

async function scheduleNextAttempt(
  ctx: Parameters<typeof recordWorkflowAutomationOutbound>[0],
  args: {
    timer: Doc<'workflowFollowUpTimers'>;
    run: Doc<'workflowAutomationRuns'>;
    maxAttempts: number;
    intervalHours: number;
    messageStrategy: 'same' | 'different';
    sameTemplate?: WorkflowWhatsappTemplateSnapshot;
    attemptTemplates: WorkflowWhatsappTemplateSnapshot[];
  },
) {
  const nextAttempt = args.run.attempt + 1;
  if (nextAttempt > args.maxAttempts) {
    await ctx.db.patch(args.timer._id, { status: 'closed', nextAttempt, updatedAt: Date.now() });
    return;
  }
  const template = args.messageStrategy === 'same'
    ? args.sameTemplate
    : args.attemptTemplates[nextAttempt - 1];
  if (!template) throw new Error(`Follow-up attempt ${nextAttempt} has no template`);
  const now = Date.now();
  const dueAt = now + args.intervalHours * 60 * 60 * 1000;
  const nextRunId = await ctx.db.insert('workflowAutomationRuns', {
    workflowId: args.run.workflowId,
    agentId: args.run.agentId,
    orgId: args.run.orgId,
    automationKind: 'followUp',
    subjectType: 'conversation',
    subjectKey: args.run.subjectKey,
    deduplicationKey: `followUp:${args.run.workflowId}:${args.timer.conversationId}:${args.run.configurationRevision}:${nextAttempt}`,
    conversationId: args.timer.conversationId,
    customerId: args.timer.customerId,
    channelId: args.timer.channelId,
    sourceMessageId: args.timer.latestOutboundMessageId,
    configurationRevision: args.run.configurationRevision,
    activationScope: args.run.activationScope,
    attempt: nextAttempt,
    scheduledAt: dueAt,
    status: 'scheduled',
    workIds: [],
    templateSnapshot: template,
    createdAt: now,
    updatedAt: now,
  });
  await ctx.db.patch(args.timer._id, {
    currentRunId: nextRunId,
    currentWorkId: undefined,
    dueAt,
    nextAttempt,
    workIds: [],
    updatedAt: now,
  });
  await enqueueWorkflowFollowUpWake(ctx, {
    timerId: args.timer._id,
    runId: nextRunId,
    dueAt,
    priorWorkIds: [],
  });
}

export const completeFollowUpWake = internalMutation({
  args: {
    workId: v.string(),
    context: v.object({
      timerId: v.id('workflowFollowUpTimers'),
      runId: v.id('workflowAutomationRuns'),
    }),
    result: v.union(
      v.object({ kind: v.literal('success'), returnValue: v.any() }),
      v.object({ kind: v.literal('failed'), error: v.string() }),
      v.object({ kind: v.literal('canceled') }),
    ),
  },
  handler: async (ctx, args) => {
    const timer = await ctx.db.get(args.context.timerId);
    const run = await ctx.db.get(args.context.runId);
    if (!timer || !run || run.currentWorkId !== args.workId || timer.currentRunId !== run._id) return;
    if (args.result.kind === 'success' && args.result.returnValue?.reschedule) {
      await enqueueWorkflowFollowUpWake(ctx, {
        timerId: timer._id,
        runId: run._id,
        dueAt: args.result.returnValue.dueAt,
        priorWorkIds: run.workIds,
      });
      return;
    }
    const now = Date.now();
    if (args.result.kind === 'success' && args.result.returnValue?.ok) {
      await ctx.db.patch(run._id, {
        status: 'sent',
        providerMessageId: args.result.returnValue.providerMessageId,
        attemptedAt: now,
        sentAt: now,
        updatedAt: now,
      });
      await recordWorkflowAutomationOutbound(ctx, {
        conversationId: timer.conversationId,
        providerMessageId: args.result.returnValue.providerMessageId,
        source: 'workflowFollowUp',
        templateName: run.templateSnapshot.name,
      });
      const workflow = await ctx.db.get(run.workflowId);
      if (!workflow) return;
      const config = resolveWorkflowAutomationConfigs(workflow).followUp;
      await scheduleNextAttempt(ctx, {
        timer,
        run,
        maxAttempts: config.maxAttempts,
        intervalHours: config.intervalHours,
        messageStrategy: config.messageStrategy,
        sameTemplate: config.sameTemplate,
        attemptTemplates: config.attemptTemplates,
      });
      return;
    }
    if (args.result.kind === 'success' && args.result.returnValue?.skipped) {
      await ctx.db.patch(run._id, {
        status: 'skipped',
        reason: args.result.returnValue.reason,
        attemptedAt: now,
        updatedAt: now,
      });
      await ctx.db.patch(timer._id, { status: 'closed', updatedAt: now });
      return;
    }
    await ctx.db.patch(run._id, {
      status: args.result.kind === 'canceled' ? 'cancelled' : 'failed',
      reason: args.result.kind === 'failed' ? args.result.error : 'Workpool job cancelled',
      attemptedAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(timer._id, { status: 'closed', updatedAt: now });
  },
});
