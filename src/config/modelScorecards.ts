export type ModelMetricScores = {
  quality: number;
  speed: number;
  reasoning: number;
  value: number;
};

export type ModelLanguageScore = {
  name: 'Malay' | 'Chinese' | 'English';
  score: number;
};

export type ModelScorecard = {
  overall: number;
  metrics: ModelMetricScores;
  languages: ModelLanguageScore[];
  bestFor: string;
};

export type ModelScorecardId = (typeof ADVANCED_PLAN_MODELS)[number];

export const MODEL_SCORECARDS: Record<ModelScorecardId, ModelScorecard> = {
  'ilmu-mini-v3.3': {
    overall: 3,
    metrics: { quality: 3, speed: 4, reasoning: 2.5, value: 5 },
    languages: [
      { name: 'Malay', score: 5 },
      { name: 'English', score: 3 },
    ],
    bestFor: 'Free Malay-first conversations',
  },
  'xiaomi/mimo-v2.5': {
    overall: 3.5,
    metrics: { quality: 3.5, speed: 4, reasoning: 3.5, value: 4 },
    languages: [
      { name: 'Chinese', score: 5 },
      { name: 'English', score: 4 },
    ],
    bestFor: 'General-purpose Chinese conversations',
  },
  'deepseek/deepseek-v4-flash': {
    overall: 4,
    metrics: { quality: 4, speed: 4, reasoning: 4, value: 4 },
    languages: [
      { name: 'Chinese', score: 4 },
      { name: 'English', score: 4 },
    ],
    bestFor: 'Balanced everyday support',
  },
  'openai/gpt-oss-120b': {
    overall: 3.5,
    metrics: { quality: 3.5, speed: 3.5, reasoning: 4, value: 5 },
    languages: [{ name: 'English', score: 5 }],
    bestFor: 'Budget-friendly reasoning',
  },
  'openai/gpt-5.6-luna': {
    overall: 4.5,
    metrics: { quality: 4.5, speed: 3.5, reasoning: 4.5, value: 3 },
    languages: [
      { name: 'English', score: 5 },
      { name: 'Chinese', score: 3 },
    ],
    bestFor: 'Strongest overall performance',
  },
  'nvidia/nemotron-3.5-lightning': {
    overall: 4,
    metrics: { quality: 4, speed: 5, reasoning: 4, value: 4 },
    languages: [{ name: 'English', score: 5 }],
    bestFor: 'Fast English responses',
  },
  'qwen/qwen3.7-flash': {
    overall: 4,
    metrics: { quality: 4, speed: 4.5, reasoning: 4, value: 5 },
    languages: [
      { name: 'Chinese', score: 5 },
      { name: 'English', score: 4 },
    ],
    bestFor: 'Fast Chinese conversations',
  },
};

export function getModelScorecard(modelId: string): ModelScorecard | null {
  if (!ADVANCED_PLAN_MODELS.includes(modelId as ModelScorecardId)) return null;
  return MODEL_SCORECARDS[modelId as ModelScorecardId];
}
import { ADVANCED_PLAN_MODELS } from '../../shared/planCatalog';
