import { Rating, StickerStar } from '@smastrom/react-rating';
import { Check } from 'lucide-react';
import type { ReactElement } from 'react';
import { ModelSelectorLogo } from '@/components/ai-elements/model-selector';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { getModelScorecard } from '@/config/modelScorecards';

const metricLabels = {
  quality: 'Quality',
  speed: 'Speed',
  reasoning: 'Reasoning',
  value: 'Value',
} as const;

type ModelScoreHoverCardProps = {
  modelId: string;
  modelLabel: string;
  chefSlug: string;
  imageUrl?: string;
  children: ReactElement;
};

const modelRatingItemStyles = {
  itemShapes: StickerStar,
  activeFillColor: '#f59e0b',
  inactiveFillColor: '#ffedd5',
};

export function ModelScoreHoverCard({
  modelId,
  modelLabel,
  chefSlug,
  imageUrl,
  children,
}: ModelScoreHoverCardProps) {
  const scorecard = getModelScorecard(modelId);

  if (scorecard === null) return children;

  return (
    <HoverCard openDelay={250} closeDelay={100}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent side="right" align="start" className="w-80 rounded-xl">
        <div className="flex flex-col gap-4">
          <div data-slot="model-rating" className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {scorecard.overall.toFixed(1)}
            </span>
            <Rating
              style={{ width: 88 }}
              value={scorecard.overall}
              itemStyles={modelRatingItemStyles}
              readOnly
            />
          </div>
          <div className="flex flex-col gap-2">
            <div data-slot="model-identity" className="flex items-center gap-2">
              <ModelSelectorLogo
                provider={chefSlug}
                src={imageUrl}
                className="size-4"
              />
              <span className="font-semibold">{modelLabel}</span>
            </div>
            <p
              data-slot="model-description"
              className="text-sm leading-5 text-muted-foreground"
            >
              {scorecard.description}
            </p>
          </div>
          <div data-slot="model-recommendations" className="flex flex-col gap-1.5">
            <span
              data-slot="model-recommendations-label"
              className="text-xs font-medium text-muted-foreground"
            >
              Recommended for
            </span>
            <div className="flex flex-col gap-1.5">
              {scorecard.recommendedFor.map((scenario) => (
                <div
                  key={scenario}
                  data-slot="model-recommendation"
                  className="flex items-center gap-2 text-sm text-foreground"
                >
                  <span
                    data-slot="model-recommendation-check"
                    className="inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-600"
                  >
                    <Check className="size-2.5 text-white" />
                  </span>
                  <span>{scenario}</span>
                </div>
              ))}
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-x-5 gap-y-2 text-sm">
            {Object.entries(scorecard.metrics).map(([metric, score]) => (
              <div key={metric} className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">
                  {metricLabels[metric as keyof typeof metricLabels]}
                </dt>
                <dd className="font-medium">{score.toFixed(1)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
