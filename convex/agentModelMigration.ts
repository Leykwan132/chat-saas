import { Migrations } from '@convex-dev/migrations';
import { components, internal } from './_generated/api';
import type { DataModel } from './_generated/dataModel';

const migrations = new Migrations<DataModel>(components.migrations);

export function getGeminiModelMigrationPatch(agent: { model: string }) {
  if (agent.model !== 'google/gemini-3.1-flash-lite') {
    return undefined;
  }

  return {
    model: 'deepseek/deepseek-v4-flash',
    provider: 'openrouter' as const,
  };
}

export const migrateGoogleGeminiAgents = migrations.define({
  table: 'agents',
  batchSize: 25,
  migrateOne: (_, agent) => getGeminiModelMigrationPatch(agent),
});

export const runMigrateGoogleGeminiAgents = migrations.runner(
  internal.agentModelMigration.migrateGoogleGeminiAgents,
);
