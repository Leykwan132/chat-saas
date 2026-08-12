import { expect, test, vi } from 'vitest';
import { ADVANCED_PLAN_MODELS } from '../../shared/planCatalog';

type ScorecardModule = {
  MODEL_SCORECARDS: Record<
    string,
    {
      overall: number;
      metrics: Record<'quality' | 'speed' | 'reasoning' | 'value', number>;
      description: string;
      recommendedFor: readonly string[];
    }
  >;
  getModelScorecard: (modelId: string) => ScorecardModule['MODEL_SCORECARDS'][string] | null;
};

test('provides a complete bounded scorecard for every enabled model', async () => {
  const { MODEL_SCORECARDS } = await vi.importActual<ScorecardModule>('./modelScorecards');

  expect(Object.keys(MODEL_SCORECARDS).sort()).toEqual([...ADVANCED_PLAN_MODELS].sort());

  for (const scorecard of Object.values(MODEL_SCORECARDS)) {
    expect(Object.keys(scorecard).sort()).toEqual([
      'description',
      'metrics',
      'overall',
      'recommendedFor',
    ]);
    expect(scorecard.overall).toBeGreaterThan(0);
    expect(scorecard.overall).toBeLessThanOrEqual(5);
    expect(Object.keys(scorecard.metrics).sort()).toEqual(['quality', 'reasoning', 'speed', 'value']);
    expect(Object.values(scorecard.metrics).every((score) => score > 0 && score <= 5)).toBe(true);
    expect(scorecard.description).toEqual(expect.any(String));
    const descriptionSentences = scorecard.description
      .split('.')
      .map((sentence) => sentence.trim())
      .filter(Boolean);

    expect(scorecard.description).toMatch(/^Best for /);
    expect(descriptionSentences).toHaveLength(2);
    expect(scorecard.recommendedFor.length).toBeGreaterThanOrEqual(1);
    expect(scorecard.recommendedFor.length).toBeLessThanOrEqual(2);
    expect(scorecard.recommendedFor.every((scenario) => scenario.trim().length > 0)).toBe(true);
  }
});

test('provides the approved recommended scenarios for every model', async () => {
  const { MODEL_SCORECARDS } = await vi.importActual<ScorecardModule>('./modelScorecards');

  expect(
    Object.fromEntries(
      Object.entries(MODEL_SCORECARDS).map(([modelId, scorecard]) => [
        modelId,
        scorecard.recommendedFor,
      ]),
    ),
  ).toEqual({
    'ilmu-mini-v3.3': ['Malay-language conversations', 'Budget-friendly FAQs'],
    'xiaomi/mimo-v2.5': ['Chinese-language conversations', 'General customer support'],
    'deepseek/deepseek-v4-flash': [
      'Everyday customer support',
      'Chinese and English conversations',
    ],
    'openai/gpt-oss-120b': ['Budget-friendly reasoning', 'English-language support'],
    'openai/gpt-5.6-luna': [
      'Complex customer conversations',
      'Higher-quality responses',
    ],
    'nvidia/nemotron-3.5-lightning': [
      'Fast English-language replies',
      'High-volume support',
    ],
    'qwen/qwen3.7-flash': [
      'Fast Chinese-language replies',
      'Chinese and English conversations',
    ],
  });
});

test('provides the intended model positioning descriptions', async () => {
  const { getModelScorecard } = await vi.importActual<ScorecardModule>('./modelScorecards');

  expect(getModelScorecard('qwen/qwen3.7-flash')).toMatchObject({
    overall: 4,
    description:
      'Best for fast Chinese customer conversations. It also handles everyday English support reliably.',
  });
  expect(getModelScorecard('nvidia/nemotron-3.5-lightning')).toMatchObject({
    description:
      'Best for fast English customer conversations. It prioritizes response speed while keeping reasoning balanced.',
  });
  expect(getModelScorecard('retired/model')).toBeNull();
});
