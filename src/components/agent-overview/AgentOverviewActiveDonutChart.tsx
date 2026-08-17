import { Pie, PieChart, Sector } from 'recharts';
import type { PieSectorShapeProps } from 'recharts/types/polar/Pie';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

const activeDonutChartConfig = {
  customerCount: { label: 'Customers' },
} satisfies ChartConfig;
const ACTIVE_SECTOR_RADIUS_OFFSET = 10;
const TOOLTIP_WIDTH = 184;
const TOOLTIP_HEIGHT = 72;
const TOOLTIP_GAP = 8;

export type AgentOverviewActiveDonutDatum = {
  key: string;
  label: string;
  customerCount: number;
  fill: string;
};

function formatCustomerCount(count: number) {
  return `${count.toLocaleString()} customer${count === 1 ? '' : 's'}`;
}

export function getActiveDonutOuterRadius(
  outerRadius: number,
  index: number,
  activeIndex: number | null,
) {
  return index === activeIndex ? outerRadius + ACTIVE_SECTOR_RADIUS_OFFSET : outerRadius;
}

export function getActiveDonutTooltipPosition({
  cx,
  cy,
  midAngle,
  outerRadius,
}: {
  cx: number;
  cy: number;
  midAngle: number;
  outerRadius: number;
}) {
  const angle = (-midAngle * Math.PI) / 180;
  const xDirection = Math.cos(angle);
  const yDirection = Math.sin(angle);
  const projectedTooltipHalfSize =
    (Math.abs(xDirection) * TOOLTIP_WIDTH) / 2 +
    (Math.abs(yDirection) * TOOLTIP_HEIGHT) / 2;
  const distance =
    outerRadius + ACTIVE_SECTOR_RADIUS_OFFSET + projectedTooltipHalfSize + TOOLTIP_GAP;

  return {
    x: cx + xDirection * distance - TOOLTIP_WIDTH / 2,
    y: cy + yDirection * distance - TOOLTIP_HEIGHT / 2,
  };
}

export function AgentOverviewActiveDonutChart({
  data,
  activeIndex,
}: {
  data: AgentOverviewActiveDonutDatum[];
  activeIndex: number | null;
}) {
  return (
    <div className="relative mx-auto aspect-square size-full max-h-[230px] max-w-[230px]">
      <ChartContainer config={activeDonutChartConfig} className="size-full">
        <PieChart>
          <ChartTooltip
            cursor={false}
            content={(
              <ChartTooltipContent
                hideLabel
                formatter={(value, _name, item) => {
                  const datum = item.payload as AgentOverviewActiveDonutDatum;

                  return (
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-foreground">{datum.label}</span>
                      <span className="text-muted-foreground">
                        {formatCustomerCount(Number(value))}
                      </span>
                    </div>
                  );
                }}
              />
            )}
          />
          <Pie
            data={data}
            dataKey="customerCount"
            nameKey="label"
            innerRadius="48%"
            outerRadius="86%"
            strokeWidth={3}
            stroke="var(--background)"
            shape={({
              index,
              outerRadius = 0,
              cx = 0,
              cy = 0,
              midAngle = 0,
              ...sectorProps
            }: PieSectorShapeProps) => {
              const datum = data[index];
              const active = index === activeIndex && datum !== undefined;

              return (
                <g>
                  <Sector
                    {...sectorProps}
                    cx={cx}
                    cy={cy}
                    outerRadius={getActiveDonutOuterRadius(outerRadius, index, activeIndex)}
                  />
                  {active ? (
                    <foreignObject
                      {...getActiveDonutTooltipPosition({ cx, cy, midAngle, outerRadius })}
                      width={TOOLTIP_WIDTH}
                      height={TOOLTIP_HEIGHT}
                      pointerEvents="none"
                    >
                      <div
                        xmlns="http://www.w3.org/1999/xhtml"
                        role="tooltip"
                        aria-atomic="true"
                        aria-live="polite"
                        className="flex size-full items-center justify-center"
                      >
                        <div className="max-w-full rounded-lg border bg-background px-3 py-2 text-center">
                          <span className="block text-xs leading-tight font-medium text-foreground">
                            {datum.label}
                          </span>
                          <span className="mt-0.5 block text-xs leading-tight text-muted-foreground">
                            {formatCustomerCount(datum.customerCount)}
                          </span>
                        </div>
                      </div>
                    </foreignObject>
                  ) : null}
                </g>
              );
            }}
          />
        </PieChart>
      </ChartContainer>
    </div>
  );
}
