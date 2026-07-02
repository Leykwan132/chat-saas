import { cn } from '@/lib/utils';
import type {
  OverviewChartMode,
  OverviewTrendRow,
} from './AgentOverviewTrendChart';

const WIDTH = 180;
const HEIGHT = 64;
const TOP = 8;
const BOTTOM = 8;
const LEFT = 4;
const RIGHT = 4;

type PreviewPoint = {
  x: number;
  y: number;
};

function buildPointSegments(values: Array<number | null>) {
  const numericValues = values.filter(
    (value): value is number => value !== null && Number.isFinite(value),
  );

  if (numericValues.length === 0) {
    return [];
  }

  const min = Math.min(...numericValues, 0);
  const max = Math.max(...numericValues, 0);
  const range = max === min ? 1 : max - min;
  const drawingWidth = WIDTH - LEFT - RIGHT;
  const drawingHeight = HEIGHT - TOP - BOTTOM;
  const segments: PreviewPoint[][] = [];
  let currentSegment: PreviewPoint[] = [];

  values.forEach((value, index) => {
    if (value === null || !Number.isFinite(value)) {
      if (currentSegment.length > 0) {
        segments.push(currentSegment);
        currentSegment = [];
      }
      return;
    }

    const x =
      values.length === 1
        ? WIDTH / 2
        : LEFT + (index / (values.length - 1)) * drawingWidth;
    const y = max === min ? HEIGHT - BOTTOM : TOP + ((max - value) / range) * drawingHeight;
    currentSegment.push({ x, y });
  });

  if (currentSegment.length > 0) {
    segments.push(currentSegment);
  }

  return segments;
}

function linePath(points: PreviewPoint[]) {
  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
}

function smoothPath(points: PreviewPoint[]) {
  if (points.length <= 2) {
    return linePath(points);
  }

  const [first] = points;
  const segments = [`M ${first.x} ${first.y}`];

  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[index - 1] ?? points[index];
    const current = points[index];
    const next = points[index + 1];
    const afterNext = points[index + 2] ?? next;
    const controlOne = {
      x: current.x + (next.x - previous.x) / 6,
      y: current.y + (next.y - previous.y) / 6,
    };
    const controlTwo = {
      x: next.x - (afterNext.x - current.x) / 6,
      y: next.y - (afterNext.y - current.y) / 6,
    };

    segments.push(
      `C ${controlOne.x} ${controlOne.y}, ${controlTwo.x} ${controlTwo.y}, ${next.x} ${next.y}`,
    );
  }

  return segments.join(' ');
}

export function AgentOverviewMetricPreview({
  rows,
  mode,
  isSelected,
}: {
  rows: OverviewTrendRow[];
  mode: OverviewChartMode;
  isSelected: boolean;
}) {
  const values = rows.map((row) => row[mode]);
  const segments = buildPointSegments(values);
  const paths = segments
    .filter((segment) => segment.length > 1)
    .map((segment) => smoothPath(segment));
  const dots = segments.filter((segment) => segment.length === 1).flat();

  return (
    <svg
      aria-hidden="true"
      className={cn(
        'h-16 w-full shrink-0 overflow-visible',
        isSelected ? 'text-primary' : 'text-muted-foreground',
      )}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
    >
      {paths.map((path) => (
        <path
          key={path}
          d={path}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          strokeOpacity={isSelected ? 0.8 : 0.58}
        />
      ))}
      {dots.map((point) => (
        <circle
          key={`${point.x}-${point.y}`}
          cx={point.x}
          cy={point.y}
          r="2"
          fill="currentColor"
          opacity={isSelected ? 0.8 : 0.58}
        />
      ))}
    </svg>
  );
}
