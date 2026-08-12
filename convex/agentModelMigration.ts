import { Migrations } from '@convex-dev/migrations';
import { components, internal } from './_generated/api';
import type { DataModel } from './_generated/dataModel';

const migrations = new Migrations<DataModel>(components.migrations);

const RETIRED_AGENT_MODELS = new Set([
  'amazon/nova-micro-v1',
  'google/gemini-3.1-flash-lite',
]);

export function getRetiredModelMigrationPatch(agent: { model: string }) {
  if (!RETIRED_AGENT_MODELS.has(agent.model)) {
    return undefined;
  }

  return {
    model: 'deepseek/deepseek-v4-flash',
    provider: 'openrouter' as const,
  };
}

export const migrateRetiredAgentModels = migrations.define({
  table: 'agents',
  batchSize: 25,
  migrateOne: (_, agent) => getRetiredModelMigrationPatch(agent),
});

export const runMigrateRetiredAgentModels = migrations.runner(
  internal.agentModelMigration.migrateRetiredAgentModels,
);
