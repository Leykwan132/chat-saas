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
          <div className="flex items-center gap-2">
            <ModelSelectorLogo provider={chefSlug} src={imageUrl} className="size-4" />
            <span className="font-semibold">{modelLabel}</span>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-medium">Kilobot rating</span>
            <div className="flex items-center gap-2">
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
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Best for
            </span>
            <span className="text-sm">{scorecard.bestFor}</span>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {scorecard.languages.map((language) => (
                <span
                  key={language}
                  data-slot="model-language"
                  className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
                >
                  <Check className="size-3.5 text-emerald-600" />
                  {language}
                </span>
              ))}
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
