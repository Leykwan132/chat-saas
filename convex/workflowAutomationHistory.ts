import { paginationOptsValidator } from 'convex/server';
import { v } from 'convex/values';
import { query } from './_generated/server';
import { assertManageableAgent } from './agentAccess';
import { getWorkflowAutomationCostTotal } from './workflowAutomationCost';

const automationKindValidator = v.union(v.literal('reminder'), v.literal('followUp'));

function userFacingReason(reason: string | undefined) {
  if (reason?.toLowerCase().includes('workpool')) return undefined;
  return reason;
}

export const list = query({
  args: {
    agentId: v.id('agents'),
    automationKind: automationKindValidator,
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await assertManageableAgent(ctx, args.agentId);
    const result = await ctx.db
      .query('workflowAutomationRuns')
      .withIndex('by_agentId_and_automationKind_and_updatedAt', (q) => (
        q.eq('agentId', args.agentId).eq('automationKind', args.automationKind)
      ))
      .order('desc')
      .paginate({
        cursor: args.paginationOpts.cursor,
        numItems: Math.min(args.paginationOpts.numItems, 25),
      });
    const page = await Promise.all(result.page.map(async (run) => {
      const customer = run.customerId ? await ctx.db.get(run.customerId) : null;
      const appointment = run.appointmentId ? await ctx.db.get(run.appointmentId) : null;
      const conversation = run.conversationId ? await ctx.db.get(run.conversationId) : null;
      return {
        id: run._id,
        automationKind: run.automationKind,
        subjectKey: run.subjectKey,
        customerName: customer?.name ?? conversation?.contactName,
        customerAddress: customer?.contactAddress ?? conversation?.contactAddress,
        subjectLabel: appointment?.title ?? conversation?.contactName ?? run.subjectKey,
        templateName: run.templateSnapshot.name,
        templateLanguage: run.templateSnapshot.language,
        attempt: run.attempt,
        scheduledAt: run.scheduledAt,
        sentAt: run.sentAt,
        activationScope: run.activationScope,
        status: run.status,
        estimatedCostMyr: run.estimatedCostMyr,
        reason: userFacingReason(run.reason),
        updatedAt: run.updatedAt,
      };
    }));
    return { ...result, page };
  },
});

export const estimatedTotal = query({
  args: {
    agentId: v.id('agents'),
    automationKind: automationKindValidator,
  },
  handler: async (ctx, args) => {
    await assertManageableAgent(ctx, args.agentId);
    const total = await getWorkflowAutomationCostTotal(ctx, args.agentId, args.automationKind);
    return {
      estimatedTotalSpentMyr: total?.estimatedTotalSpentMyr ?? 0,
      sentCount: (total?.pricedSentCount ?? 0) + (total?.unpricedSentCount ?? 0),
      unpricedSentCount: total?.unpricedSentCount ?? 0,
    };
  },
});
