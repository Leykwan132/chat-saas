import { expect, test } from 'vitest';
import { getRetiredModelMigrationPatch } from './agentModelMigration';

test('migrates retired Amazon and Google agents to the DeepSeek default', () => {
  for (const model of [
    'amazon/nova-micro-v1',
    'google/gemini-3.1-flash-lite',
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

test('does not change agents on supported models', () => {
  expect(getRetiredModelMigrationPatch({ model: 'qwen/qwen3.7-flash' })).toBeUndefined();
  expect(
    getRetiredModelMigrationPatch({ model: 'deepseek/deepseek-v4-flash' }),
  ).toBeUndefined();
});
