import { expect, test } from 'vitest';
import { getGeminiModelMigrationPatch } from './agentModelMigration';

test('migrates retired Gemini agents to the DeepSeek default', () => {
  expect(getGeminiModelMigrationPatch({ model: 'google/gemini-3.1-flash-lite' })).toEqual({
    model: 'deepseek/deepseek-v4-flash',
    provider: 'openrouter',
  });
});

test('does not change agents on supported models', () => {
  expect(getGeminiModelMigrationPatch({ model: 'qwen/qwen3.7-flash' })).toBeUndefined();
});
