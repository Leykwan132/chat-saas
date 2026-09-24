import { expect, test } from 'vitest';
import { getRetiredModelMigrationPatch } from './agentModelMigration';

test('migrates retired agents to the DeepSeek default', () => {
  for (const model of [
    'amazon/nova-micro-v1',
    'google/gemini-3.1-flash-lite',
    'nvidia/nemotron-3.5-lightning',
    'qwen/qwen3.7-flash',
  ]) {
    expect(getRetiredModelMigrationPatch({ model })).toEqual({
      model: 'deepseek/deepseek-v4-flash',
      provider: 'openrouter',
    });
  }
});

test('migrates GPT-5.6 Luna agents to GPT-6 Luna', () => {
  expect(getRetiredModelMigrationPatch({ model: 'openai/gpt-5.6-luna' })).toEqual({
    model: 'openai/gpt-6-luna',
    provider: 'openrouter',
  });
});

test('migrates MiMo V2.5 agents to MiMo V2.6 Pro', () => {
  expect(getRetiredModelMigrationPatch({ model: 'xiaomi/mimo-v2.5' })).toEqual({
    model: 'xiaomi/mimo-v2.6-pro',
    provider: 'openrouter',
  });
});

test('does not change agents on supported models', () => {
  expect(getRetiredModelMigrationPatch({ model: 'openai/gpt-6-luna' })).toBeUndefined();
  expect(
    getRetiredModelMigrationPatch({ model: 'deepseek/deepseek-v4-flash' }),
  ).toBeUndefined();
});
