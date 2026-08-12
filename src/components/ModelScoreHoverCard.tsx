import { Rating } from '@smastrom/react-rating';
import type { ReactElement } from 'react';
import { Badge } from '@/components/ui/badge';
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
  children: ReactElement;
};

export function ModelScoreHoverCard({ modelId, children }: ModelScoreHoverCardProps) {
  const scorecard = getModelScorecard(modelId);

  if (scorecard === null) return children;

  return (
    <HoverCard openDelay={250} closeDelay={100}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent side="right" align="start" className="w-80 rounded-xl">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium">Kilobot rating</span>
              <span className="text-sm text-muted-foreground">
                {scorecard.overall.toFixed(1)} / 5
              </span>
            </div>
            <Rating style={{ maxWidth: 120 }} value={scorecard.overall} readOnly />
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
              Language fit
            </span>
            <div className="flex flex-wrap gap-2">
              {scorecard.languages.map((language) => (
                <Badge key={language.name} variant="secondary">
                  {language.name} · {language.strength}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Best for
            </span>
            <span className="text-sm">{scorecard.bestFor}</span>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
