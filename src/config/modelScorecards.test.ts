import { expect, test, vi } from 'vitest';
import { ADVANCED_PLAN_MODELS } from '../../shared/planCatalog';

type ScorecardModule = {
  MODEL_SCORECARDS: Record<
    string,
    {
      overall: number;
      metrics: Record<'quality' | 'speed' | 'reasoning' | 'value', number>;
      description: string;
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
  }
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
