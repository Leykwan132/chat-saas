import type { WorkId } from '@convex-dev/workpool';
import { v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';
import { internal } from './_generated/api';
import { internalMutation, type MutationCtx } from './_generated/server';
import type { WorkflowAutomationConfigs } from '../shared/workflowAutomations';
import { getWorkflowAutomationSaveEffects } from './workflowAutomationConfig';
import { workflowReminderWorkpool } from './workflowReminderPool';
import { workflowFollowUpWorkpool } from './workflowFollowUpPool';

type AutomationKind = 'reminder' | 'followUp';

function poolFor(kind: AutomationKind) {
  return kind === 'reminder' ? workflowReminderWorkpool : workflowFollowUpWorkpool;
}

async function appendOperationWorkId(
  ctx: MutationCtx,
  operationId: Id<'workflowAutomationOperations'>,
  workId: WorkId,
) {
  const operation = await ctx.db.get(operationId);
  if (!operation) return;
  await ctx.db.patch(operationId, {
    currentWorkId: workId,
    workIds: [...operation.workIds, workId],
    updatedAt: Date.now(),
  });
}

async function enqueueOperation(
  ctx: MutationCtx,
  workflow: Doc<'workflows'>,
  kind: AutomationKind,
  operationKind: 'reconcile' | 'cancel',
  revision: number,
) {
  const now = Date.now();
  const operationId = await ctx.db.insert('workflowAutomationOperations', {
    workflowId: workflow._id,
    agentId: workflow.agentId,
    automationKind: kind,
    operationKind,
    configurationRevision: revision,
    status: 'scheduled',
    workIds: [],
    createdAt: now,
    updatedAt: now,
  });
  const pool = poolFor(kind);
  const fn = operationKind === 'cancel'
    ? internal.workflowAutomationLifecycle.cancelPendingBatch
    : kind === 'reminder'
      ? internal.workflowAutomationReconciliation.reconcileReminderBatch
      : internal.workflowAutomationReconciliation.reconcileFollowUpBatch;
  const workId = await pool.enqueueMutation(
    ctx,
    fn,
    { operationId },
    {
      onComplete: internal.workflowAutomationLifecycle.completeOperationWork,
      context: { operationId },
    },
  );
  await appendOperationWorkId(ctx, operationId, workId);
}

export async function applyWorkflowAutomationSaveEffects(
  ctx: MutationCtx,
  workflow: Doc<'workflows'>,
  current: WorkflowAutomationConfigs,
  next: WorkflowAutomationConfigs,
) {
  const effects = getWorkflowAutomationSaveEffects(current, next);
  for (const kind of effects.reconcile) {
    await enqueueOperation(ctx, workflow, kind, 'reconcile', next[kind].revision);
  }
  for (const kind of effects.cancel) {
    await enqueueOperation(ctx, workflow, kind, 'cancel', next[kind].revision);
  }
}

export const cancelPendingBatch = internalMutation({
  args: { operationId: v.id('workflowAutomationOperations') },
  handler: async (ctx, args) => {
    const operation = await ctx.db.get(args.operationId);
    if (!operation || operation.status !== 'scheduled') return;
    const reconciliationOperations = await ctx.db
      .query('workflowAutomationOperations')
      .withIndex('by_agentId_and_automationKind_and_status', (q) => (
        q.eq('agentId', operation.agentId)
          .eq('automationKind', operation.automationKind)
          .eq('status', 'scheduled')
      ))
      .take(50);
    const pool = poolFor(operation.automationKind);
    for (const reconciliation of reconciliationOperations) {
      if (reconciliation.operationKind !== 'reconcile') continue;
      if (reconciliation.currentWorkId) {
        await pool.cancel(ctx, reconciliation.currentWorkId as WorkId);
      }
      await ctx.db.patch(reconciliation._id, {
        status: 'cancelled',
        reason: 'Automation was turned off',
        updatedAt: Date.now(),
      });
    }
    const runs = await ctx.db
      .query('workflowAutomationRuns')
      .withIndex('by_agentId_and_automationKind_and_status', (q) => (
        q.eq('agentId', operation.agentId)
          .eq('automationKind', operation.automationKind)
          .eq('status', 'scheduled')
      ))
      .take(50);
    const now = Date.now();
    for (const run of runs) {
      if (run.currentWorkId) await pool.cancel(ctx, run.currentWorkId as WorkId);
      await ctx.db.patch(run._id, {
        status: 'cancelled',
        reason: 'Automation was turned off',
        updatedAt: now,
      });
      if (run.automationKind === 'followUp' && run.conversationId) {
        const timers = await ctx.db
          .query('workflowFollowUpTimers')
          .withIndex('by_conversationId', (q) => q.eq('conversationId', run.conversationId!))
          .collect();
        for (const timer of timers) await ctx.db.patch(timer._id, { status: 'cancelled', updatedAt: now });
      }
    }
    if (runs.length < 50) {
      await ctx.db.patch(operation._id, { status: 'completed', updatedAt: now });
      return;
    }
    const workId = await pool.enqueueMutation(
      ctx,
      internal.workflowAutomationLifecycle.cancelPendingBatch,
      { operationId: operation._id },
      {
        onComplete: internal.workflowAutomationLifecycle.completeOperationWork,
        context: { operationId: operation._id },
      },
    );
    await appendOperationWorkId(ctx, operation._id, workId);
  },
});

export const completeOperationWork = internalMutation({
  args: {
    workId: v.string(),
    context: v.object({ operationId: v.id('workflowAutomationOperations') }),
    result: v.union(
      v.object({ kind: v.literal('success'), returnValue: v.any() }),
      v.object({ kind: v.literal('failed'), error: v.string() }),
      v.object({ kind: v.literal('canceled') }),
    ),
  },
  handler: async (ctx, args) => {
    if (args.result.kind === 'success') return;
    const operation = await ctx.db.get(args.context.operationId);
    if (!operation || operation.currentWorkId !== args.workId) return;
    await ctx.db.patch(operation._id, {
      status: args.result.kind === 'failed' ? 'failed' : 'cancelled',
      reason: args.result.kind === 'failed' ? args.result.error : 'Operation cancelled',
      updatedAt: Date.now(),
    });
  },
});
