import { expect, test } from 'vitest';
import {
  getCleanModelName,
  getModelChef,
  getModelImageUrl,
} from './modelLeaderboardUtils';

const supportedModels = [
  {
    value: 'ilmu-mini-v3.3',
    label: 'Ilmu Mini V3.3',
    chef: 'YTL AI Labs',
    imageUrl: 'https://storage.kilobot.app/ytl_ai_labs-removebg-preview.png',
  },
  {
    value: 'deepseek/deepseek-v4-flash',
    label: 'DeepSeek V4 Flash',
    chef: 'DeepSeek',
  },
];

test('ranking uses supported model chef and image for Ilmu Mini', () => {
  expect(getCleanModelName('ilmu-mini-v3.3', supportedModels)).toBe('Ilmu Mini V3.3');
  expect(getModelChef('ilmu-mini-v3.3', supportedModels)).toBe('YTL AI Labs');
  expect(getModelImageUrl('ilmu-mini-v3.3', supportedModels)).toBe(
    'https://storage.kilobot.app/ytl_ai_labs-removebg-preview.png',
  );
});

test('ranking falls back to model path provider when unsupported', () => {
  expect(getModelChef('deepseek/deepseek-v4-flash')).toBe('deepseek');
  expect(getModelChef('ilmu-mini-v3.3')).toBe('openrouter');
  expect(getModelImageUrl('ilmu-mini-v3.3')).toBeUndefined();
});

test('ranking preserves names and providers for retired models', () => {
  expect(getCleanModelName('openai/gpt-oss-120b')).toBe('OpenAI GPT-OSS 120B');
  expect(getModelChef('openai/gpt-oss-120b')).toBe('OpenAI');
  expect(getCleanModelName('amazon/nova-micro-v1')).toBe('Amazon Nova Micro');
  expect(getModelChef('amazon/nova-micro-v1')).toBe('Amazon');
});
