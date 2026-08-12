export type ModelMetricScores = {
  quality: number;
  speed: number;
  reasoning: number;
  value: number;
};

export type ModelScorecard = {
  overall: number;
  metrics: ModelMetricScores;
  description: string;
};

export type ModelScorecardId = (typeof ADVANCED_PLAN_MODELS)[number];

export const MODEL_SCORECARDS: Record<ModelScorecardId, ModelScorecard> = {
  'ilmu-mini-v3.3': {
    overall: 3,
    metrics: { quality: 3, speed: 4, reasoning: 2.5, value: 5 },
    description:
      'Best for free Malay-first customer conversations. It also handles straightforward English support.',
  },
  'xiaomi/mimo-v2.5': {
    overall: 3.5,
    metrics: { quality: 3.5, speed: 4, reasoning: 3.5, value: 4 },
    description:
      'Best for general-purpose Chinese customer conversations. It also supports everyday English interactions.',
  },
  'deepseek/deepseek-v4-flash': {
    overall: 4,
    metrics: { quality: 4, speed: 4, reasoning: 4, value: 4 },
    description:
      'Best for balanced everyday customer support. It works well across Chinese and English conversations.',
  },
  'openai/gpt-oss-120b': {
    overall: 3.5,
    metrics: { quality: 3.5, speed: 3.5, reasoning: 4, value: 5 },
    description:
      'Best for budget-friendly reasoning tasks. It provides capable English support at the lowest paid credit tier.',
  },
  'openai/gpt-5.6-luna': {
    overall: 4.5,
    metrics: { quality: 4.5, speed: 3.5, reasoning: 4.5, value: 3 },
    description:
      'Best for conversations that need stronger overall performance. It handles English especially well and can also support Chinese.',
  },
  'nvidia/nemotron-3.5-lightning': {
    overall: 4,
    metrics: { quality: 4, speed: 5, reasoning: 4, value: 4 },
    description:
      'Best for fast English customer conversations. It prioritizes response speed while keeping reasoning balanced.',
  },
  'qwen/qwen3.7-flash': {
    overall: 4,
    metrics: { quality: 4, speed: 4.5, reasoning: 4, value: 5 },
    description:
      'Best for fast Chinese customer conversations. It also handles everyday English support reliably.',
  },
};

export function getModelScorecard(modelId: string): ModelScorecard | null {
  if (!ADVANCED_PLAN_MODELS.includes(modelId as ModelScorecardId)) return null;
  return MODEL_SCORECARDS[modelId as ModelScorecardId];
}
import { ADVANCED_PLAN_MODELS } from '../../shared/planCatalog';
