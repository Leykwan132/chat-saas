import { Migrations } from '@convex-dev/migrations';
import { components, internal } from './_generated/api';
import type { DataModel } from './_generated/dataModel';
import { recordWorkflowAutomationSentCost } from './workflowAutomationCost';

const migrations = new Migrations<DataModel>(components.migrations);

export const backfillWorkflowAutomationSentCosts = migrations.define({
  table: 'workflowAutomationRuns',
  batchSize: 25,
  migrateOne: async (ctx, run) => {
    if (run.status !== 'sent' || run.costAccountingStatus !== undefined) return;
    await recordWorkflowAutomationSentCost(ctx, run);
  },
});

export const runBackfillWorkflowAutomationSentCosts = migrations.runner(
  internal.workflowAutomationCostMigration.backfillWorkflowAutomationSentCosts,
);
