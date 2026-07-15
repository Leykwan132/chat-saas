import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { getExactWhatsAppTemplateRateMyr } from '../shared/whatsappTemplatePricing';

export type WorkflowAutomationKind = 'reminder' | 'followUp';

function addEstimatedCostMyr(total: number, cost: number | null) {
  return Math.round((total + (cost ?? 0)) * 10_000) / 10_000;
}

export async function recordWorkflowAutomationSentCost(
  ctx: Pick<MutationCtx, 'db'>,
  run: Doc<'workflowAutomationRuns'>,
) {
  if (run.costAccountingStatus !== undefined) return;
  const estimatedCostMyr = getExactWhatsAppTemplateRateMyr(run.templateSnapshot.category);
  const costAccountingStatus = estimatedCostMyr === null ? 'unpriced' : 'priced';
  const existingTotal = await ctx.db
    .query('workflowAutomationCostTotals')
    .withIndex('by_agentId_and_automationKind', (query) => (
      query.eq('agentId', run.agentId).eq('automationKind', run.automationKind)
    ))
    .unique();
  const now = Date.now();
  if (existingTotal) {
    await ctx.db.patch(existingTotal._id, {
      estimatedTotalSpentMyr: addEstimatedCostMyr(
        existingTotal.estimatedTotalSpentMyr,
        estimatedCostMyr,
      ),
      pricedSentCount: existingTotal.pricedSentCount + (estimatedCostMyr === null ? 0 : 1),
      unpricedSentCount: existingTotal.unpricedSentCount + (estimatedCostMyr === null ? 1 : 0),
      updatedAt: now,
    });
  } else {
    await ctx.db.insert('workflowAutomationCostTotals', {
      agentId: run.agentId,
      automationKind: run.automationKind,
      estimatedTotalSpentMyr: estimatedCostMyr ?? 0,
      pricedSentCount: estimatedCostMyr === null ? 0 : 1,
      unpricedSentCount: estimatedCostMyr === null ? 1 : 0,
      updatedAt: now,
    });
  }
  await ctx.db.patch(run._id, {
    costAccountingStatus,
    estimatedCostMyr: estimatedCostMyr ?? undefined,
  });
}

export async function getWorkflowAutomationCostTotal(
  ctx: Pick<QueryCtx, 'db'>,
  agentId: Id<'agents'>,
  automationKind: WorkflowAutomationKind,
) {
  return await ctx.db
    .query('workflowAutomationCostTotals')
    .withIndex('by_agentId_and_automationKind', (query) => (
      query.eq('agentId', agentId).eq('automationKind', automationKind)
    ))
    .unique();
}
