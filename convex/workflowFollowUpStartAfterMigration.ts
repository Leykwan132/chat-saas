import { Migrations } from '@convex-dev/migrations';
import { components, internal } from './_generated/api';
import type { DataModel } from './_generated/dataModel';
import type { WorkflowAutomationConfigs } from '../shared/workflowAutomations';
import { resolveWorkflowFollowUpStartAfterMinutes } from './workflowAutomationConfig';

type StoredFollowUp = Omit<
  WorkflowAutomationConfigs['followUp'],
  'startAfterMinutes'
> & {
  startAfterMinutes?: number;
};

const migrations = new Migrations<DataModel>(components.migrations);

export function getWorkflowFollowUpStartAfterMigrationPatch(
  followUp: StoredFollowUp | undefined,
) {
  if (!followUp || followUp.startAfterMinutes !== undefined) return undefined;
  return {
    followUpAutomation: {
      ...followUp,
      startAfterMinutes: resolveWorkflowFollowUpStartAfterMinutes(followUp),
    },
  };
}

export const backfillWorkflowFollowUpStartAfterMinutes = migrations.define({
  table: 'workflows',
  batchSize: 25,
  migrateOne: (_, workflow) => getWorkflowFollowUpStartAfterMigrationPatch(
    workflow.followUpAutomation,
  ),
});

export const runBackfillWorkflowFollowUpStartAfterMinutes = migrations.runner(
  internal.workflowFollowUpStartAfterMigration
    .backfillWorkflowFollowUpStartAfterMinutes,
);
