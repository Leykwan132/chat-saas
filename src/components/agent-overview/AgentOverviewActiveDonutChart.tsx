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
  return index === activeIndex ? outerRadius + 10 : outerRadius;
}

export function AgentOverviewActiveDonutChart({
  data,
  activeIndex,
}: {
  data: AgentOverviewActiveDonutDatum[];
  activeIndex: number | null;
}) {
  const activeDatum = activeIndex === null ? null : data[activeIndex] ?? null;

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
                    <span className="font-medium text-foreground">
                      {datum.label}: {formatCustomerCount(Number(value))}
                    </span>
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
            shape={({ index, outerRadius = 0, ...props }: PieSectorShapeProps) => (
              <Sector
                {...props}
                outerRadius={getActiveDonutOuterRadius(outerRadius, index, activeIndex)}
              />
            )}
          />
        </PieChart>
      </ChartContainer>
      <div
        aria-atomic="true"
        aria-live="polite"
        className="pointer-events-none absolute inset-[28%] flex flex-col items-center justify-center text-center"
      >
        {activeDatum ? (
          <>
            <span className="max-w-full break-words text-xs leading-tight font-medium text-foreground">
              {activeDatum.label}
            </span>
            <span className="mt-1 text-xs leading-tight text-muted-foreground">
              {formatCustomerCount(activeDatum.customerCount)}
            </span>
          </>
        ) : null}
      </div>
    </div>
  );
}
