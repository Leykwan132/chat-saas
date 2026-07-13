import type { Infer } from 'convex/values';
import type { Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import { workflowTemplateIdValidator } from './workflowTemplateUsageSchema';

export type WorkflowTemplateId = Infer<typeof workflowTemplateIdValidator>;

export async function recordWorkflowTemplateUsage(
  ctx: MutationCtx,
  agentId: Id<'agents'>,
  templateId: WorkflowTemplateId,
  now: number,
) {
  const usage = await ctx.db
    .query('workflowTemplateUsage')
    .withIndex('by_agentId_and_templateId', (query) => (
      query.eq('agentId', agentId).eq('templateId', templateId)
    ))
    .unique();
  const totals = await ctx.db
    .query('workflowTemplateUsageTotals')
    .withIndex('by_templateId', (query) => query.eq('templateId', templateId))
    .unique();

  if (usage) {
    if (!totals) throw new Error('Workflow template usage totals not found');
    await ctx.db.patch(usage._id, {
      lastUsedAt: now,
      saveCount: usage.saveCount + 1,
    });
    await ctx.db.patch(totals._id, {
      saveCount: totals.saveCount + 1,
      updatedAt: now,
    });
    return;
  }

  await ctx.db.insert('workflowTemplateUsage', {
    agentId,
    templateId,
    firstUsedAt: now,
    lastUsedAt: now,
    saveCount: 1,
  });
  if (totals) {
    await ctx.db.patch(totals._id, {
      uniqueAgentCount: totals.uniqueAgentCount + 1,
      saveCount: totals.saveCount + 1,
      updatedAt: now,
    });
    return;
  }
  await ctx.db.insert('workflowTemplateUsageTotals', {
    templateId,
    uniqueAgentCount: 1,
    saveCount: 1,
    updatedAt: now,
  });
}
