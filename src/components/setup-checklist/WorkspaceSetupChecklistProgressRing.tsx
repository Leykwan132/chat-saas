import { cn } from '@/lib/utils';

type WorkspaceSetupChecklistProgressRingProps = {
  completed: number;
  total: number;
  className?: string;
};

const VIEWBOX = 16;
const STROKE_WIDTH = 2;
const RADIUS = (VIEWBOX - STROKE_WIDTH) / 2 - 0.5;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function WorkspaceSetupChecklistProgressRing({
  completed,
  total,
  className,
}: WorkspaceSetupChecklistProgressRingProps) {
  const progress = total > 0 ? Math.min(completed / total, 1) : 0;
  const offset = CIRCUMFERENCE * (1 - progress);

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
      className={cn('size-[1em] shrink-0 overflow-visible', className)}
      aria-hidden
    >
      <circle
        cx={VIEWBOX / 2}
        cy={VIEWBOX / 2}
        r={RADIUS}
        fill="none"
        stroke="currentColor"
        strokeWidth={STROKE_WIDTH}
        className="text-muted-foreground/25"
      />
      <circle
        cx={VIEWBOX / 2}
        cy={VIEWBOX / 2}
        r={RADIUS}
        fill="none"
        stroke="currentColor"
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={offset}
        className="text-teal-600"
        transform={`rotate(-90 ${VIEWBOX / 2} ${VIEWBOX / 2})`}
      />
    </svg>
  );
}
