import { Migrations } from '@convex-dev/migrations';
import { components, internal } from './_generated/api';
import type { DataModel } from './_generated/dataModel';

const migrations = new Migrations<DataModel>(components.migrations);

const RETIRED_AGENT_MODELS = new Set([
  'amazon/nova-micro-v1',
  'google/gemini-3.1-flash-lite',
  'nvidia/nemotron-3.5-lightning',
  'qwen/qwen3.7-flash',
]);

export function getRetiredModelMigrationPatch(agent: { model: string }) {
  if (agent.model === 'openai/gpt-5.6-luna') {
    return {
      model: 'openai/gpt-6-luna',
      provider: 'openrouter' as const,
    };
  }

  if (agent.model === 'xiaomi/mimo-v2.5') {
    return {
      model: 'xiaomi/mimo-v2.6-pro',
      provider: 'openrouter' as const,
    };
  }

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

export const migrateQwenAgentModels = migrations.define({
  table: 'agents',
  batchSize: 25,
  migrateOne: (_, agent) =>
    agent.model === 'qwen/qwen3.7-flash'
      ? {
          model: 'deepseek/deepseek-v4-flash',
          provider: 'openrouter' as const,
        }
      : undefined,
});

export const runMigrateRetiredAgentModels = migrations.runner(
  internal.agentModelMigration.migrateRetiredAgentModels,
);

export const runMigrateQwenAgentModels = migrations.runner(
  internal.agentModelMigration.migrateQwenAgentModels,
);
