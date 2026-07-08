import type { ComponentPropsWithoutRef } from 'react';
import { NumberTicker } from '../ui/number-ticker';
import { cn } from '../../lib/utils';
import { splitTickerText, type LandingTickerTextSegment } from './landingTickerTextSegments';

type LandingTickerTextProps = Omit<ComponentPropsWithoutRef<'span'>, 'children'> & {
  delay?: number;
  numberClassName?: string;
  value: string;
};

function getNumberSegmentIndex(segments: LandingTickerTextSegment[], currentIndex: number) {
  return segments.slice(0, currentIndex).filter((segment) => segment.kind === 'number').length;
}

export function LandingTickerText({
  delay = 0,
  numberClassName,
  value,
  className,
  ...props
}: LandingTickerTextProps) {
  const segments = splitTickerText(value);
  const hasNumber = segments.some((segment) => segment.kind === 'number');

  if (!hasNumber) {
    return (
      <span className={className} {...props}>
        {value}
      </span>
    );
  }

  return (
    <span aria-label={value} className={className} {...props}>
      <span aria-hidden="true">
        {segments.map((segment, index) => {
          if (segment.kind === 'text') {
            return <span key={`${segment.text}-${index}`}>{segment.text}</span>;
          }

          const segmentDelay = delay + getNumberSegmentIndex(segments, index) * 0.04;

          return (
            <NumberTicker
              key={`${segment.raw}-${index}`}
              className={cn('tracking-normal text-current dark:text-current', numberClassName)}
              decimalPlaces={segment.decimalPlaces}
              delay={segmentDelay}
              value={segment.value}
            />
          );
        })}
      </span>
    </span>
  );
}
