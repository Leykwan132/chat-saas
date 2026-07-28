import { v } from 'convex/values';
import { internalAction, internalMutation, internalQuery } from './_generated/server';
import { internal } from './_generated/api';
import { resolveWorkflowAutomationConfigs } from './workflowAutomationConfig';
import {
  sendWorkflowWhatsappTemplate,
  type WorkflowWhatsappSendResult,
} from './workflowWhatsappTemplateSender';
import { recordWorkflowAutomationOutbound } from './workflowAutomationOutbound';
import { recordWorkflowAutomationSentCost } from './workflowAutomationCost';
import type { Doc } from './_generated/dataModel';

type ReminderContext =
  | { skipped: string }
  | {
      run: Doc<'workflowAutomationRuns'>;
      channel: Doc<'channels'>;
      customer: Doc<'customers'>;
    };

type ReminderActionResult =
  | { skipped: true; reason: string }
  | ({ ok: true } & WorkflowWhatsappSendResult);

export const getReminderContext = internalQuery({
  args: { runId: v.id('workflowAutomationRuns') },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run || run.automationKind !== 'reminder' || run.status !== 'scheduled') {
      return { skipped: 'Reminder run is no longer scheduled' } as const;
    }
    const workflow = await ctx.db.get(run.workflowId);
    const appointment = run.appointmentId ? await ctx.db.get(run.appointmentId) : null;
    const conversation = run.conversationId ? await ctx.db.get(run.conversationId) : null;
    const channel = run.channelId ? await ctx.db.get(run.channelId) : null;
    const customer = run.customerId ? await ctx.db.get(run.customerId) : null;
    if (!workflow || !appointment || !conversation || !channel || !customer) {
      return { skipped: 'Reminder subject is unavailable' } as const;
    }
    const config = resolveWorkflowAutomationConfigs(workflow).reminder;
    if (!config.enabled || config.revision !== run.configurationRevision) {
      return { skipped: 'Reminder configuration changed' } as const;
    }
    if (
      appointment.status !== 'confirmed' ||
      appointment.startAt !== run.appointmentStartAt ||
      appointment.startAt <= Date.now()
    ) return { skipped: 'Appointment is no longer eligible' } as const;
    if (conversation.service !== 'whatsapp' || conversation.status === 'closed') {
      return { skipped: 'WhatsApp conversation is no longer eligible' } as const;
    }
    if (channel.service !== 'whatsapp' || channel.status !== 'connected') {
      return { skipped: 'WhatsApp channel is unavailable' } as const;
    }
    return { run, channel, customer } as const;
  },
});

export const sendReminder = internalAction({
  args: { runId: v.id('workflowAutomationRuns') },
  handler: async (ctx, args): Promise<ReminderActionResult> => {
    const context: ReminderContext = await ctx.runQuery(
      internal.workflowReminderWorker.getReminderContext,
      args,
    );
    if ('skipped' in context) return { skipped: true as const, reason: context.skipped };
    const deleting = await ctx.runQuery(
      internal.teamDeletion.access.isDeleting,
      { orgId: context.run.orgId },
    );
    if (deleting) {
      return { skipped: true as const, reason: "Workspace unavailable" };
    }
    console.log('workflow_reminder_sending', {
      appointmentId: context.run.appointmentId,
      runId: context.run._id,
      conversationId: context.run.conversationId,
      templateName: context.run.templateSnapshot.name,
    });
    const result = await sendWorkflowWhatsappTemplate(ctx, {
      channel: context.channel,
      customer: context.customer,
      orgId: context.run.orgId,
      template: context.run.templateSnapshot,
    });
    return { ok: true as const, ...result };
  },
});

export const completeReminder = internalMutation({
  args: {
    workId: v.string(),
    context: v.object({ runId: v.id('workflowAutomationRuns') }),
    result: v.union(
      v.object({ kind: v.literal('success'), returnValue: v.any() }),
      v.object({ kind: v.literal('failed'), error: v.string() }),
      v.object({ kind: v.literal('canceled') }),
    ),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.context.runId);
    if (!run || run.currentWorkId !== args.workId) return;
    const now = Date.now();
    if (args.result.kind === 'success' && args.result.returnValue?.ok) {
      await recordWorkflowAutomationOutbound(ctx, {
        run,
        result: args.result.returnValue,
      });
      await recordWorkflowAutomationSentCost(ctx, run);
      await ctx.db.patch(run._id, {
        status: 'sent',
        providerMessageId: args.result.returnValue.providerMessageId,
        attemptedAt: now,
        sentAt: now,
        updatedAt: now,
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
      return;
    }
    await ctx.db.patch(run._id, {
      status: args.result.kind === 'canceled' ? 'cancelled' : 'failed',
      reason: args.result.kind === 'failed' ? args.result.error : 'Workpool job cancelled',
      attemptedAt: now,
      updatedAt: now,
    });
  },
});
