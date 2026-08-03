import { Migrations } from '@convex-dev/migrations';
import { components, internal } from './_generated/api';
import type { DataModel } from './_generated/dataModel';
import {
  getWorkflowNodeReadiness,
  getWorkflowNodeReadinessFactsForAgent,
} from './workflowNodeReadiness';

const migrations = new Migrations<DataModel>(components.migrations);

export const backfillWorkflowNodeReadiness = migrations.define({
  table: 'workflowNodes',
  batchSize: 25,
  migrateOne: async (ctx, node) => {
    if (node.isReady !== undefined) return undefined;
    const workflow = await ctx.db.get(node.workflowId);
    if (workflow === null) return undefined;
    const facts = await getWorkflowNodeReadinessFactsForAgent(ctx, workflow.agentId);
    return { isReady: getWorkflowNodeReadiness(node, facts) };
  },
});

export const runBackfillWorkflowNodeReadiness = migrations.runner(
  internal.workflowNodeReadinessMigration.backfillWorkflowNodeReadiness,
);
