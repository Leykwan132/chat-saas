import { useState } from 'react';
import {
  MoreHorizontal,
  Send,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { LandingPreviewMetric, LandingPreviewSection } from './landingAppPreviewData';
import { LandingAppPreviewAgentSetup } from './LandingAppPreviewAgentSetup';
import { LandingAppPreviewWorkflow } from './LandingAppPreviewWorkflow';
import { LandingTickerText } from './LandingTickerText';

function getChartRange(values: number[]) {
  const max = Math.max(...values);
  return max === 0 ? 1 : max;
}

function getChartPoints({
  values,
  width,
  height,
  paddingX,
  paddingY,
}: {
  values: number[];
  width: number;
  height: number;
  paddingX: number;
  paddingY: number;
}) {
  const max = getChartRange(values);
  const innerWidth = width - paddingX * 2;
  const innerHeight = height - paddingY * 2;

  return values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : paddingX + (index / (values.length - 1)) * innerWidth;
    const y = height - paddingY - (value / max) * innerHeight;

    return { x, y };
  });
}

function buildSmoothChartPath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) {
    return '';
  }

  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`;
  }

  return points.reduce((path, point, index) => {
    if (index === 0) {
      return `M ${point.x} ${point.y}`;
    }

    const previous = points[index - 1];
    const controlX = (previous.x + point.x) / 2;

    return `${path} C ${controlX} ${previous.y}, ${controlX} ${point.y}, ${point.x} ${point.y}`;
  }, '');
}

function buildAreaPath(linePath: string, points: Array<{ x: number; y: number }>, baselineY: number) {
  if (points.length === 0) {
    return '';
  }

  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];

  return `${linePath} L ${lastPoint.x} ${baselineY} L ${firstPoint.x} ${baselineY} Z`;
}

function MetricGrid({
  metrics,
  selectedMetricIndex,
  onSelectMetric,
}: {
  metrics: LandingPreviewMetric[];
  selectedMetricIndex: number;
  onSelectMetric: (index: number) => void;
}) {
  return (
    <div className="grid h-[104px] overflow-hidden rounded-lg border border-zinc-200 bg-zinc-200 md:grid-cols-4">
      {metrics.map((metric, index) => (
        <button
          key={metric.label}
          type="button"
          className="h-[104px] bg-white px-4 py-3 text-left transition-colors hover:bg-zinc-50 data-[selected=true]:bg-zinc-100"
          data-selected={index === selectedMetricIndex}
          onClick={() => onSelectMetric(index)}
        >
          <span data-preview-metric-value className="block text-[24px] font-light leading-none tracking-normal text-zinc-950">
            {metric.value}
          </span>
          <div className="mt-1.5 text-[12px] font-medium text-zinc-800">{metric.label}</div>
        </button>
      ))}
    </div>
  );
}

function OverviewChart({ metric }: { metric: LandingPreviewMetric }) {
  const width = 960;
  const height = 330;
  const paddingX = 44;
  const paddingY = 34;
  const baselineY = height - paddingY;
  const points = getChartPoints({
    values: metric.trend,
    width,
    height,
    paddingX,
    paddingY,
  });
  const linePath = buildSmoothChartPath(points);
  const areaPath = buildAreaPath(linePath, points, baselineY);
  const max = getChartRange(metric.trend);
  const yLabels = [4, 3, 2, 1, 0].map((step) => Math.round((max / 4) * step));

  return (
    <svg aria-hidden="true" viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
      {[0, 1, 2, 3, 4].map((line) => (
        <line
          key={line}
          x1={paddingX}
          x2={width - 20}
          y1={paddingY + line * ((height - paddingY * 2) / 4)}
          y2={paddingY + line * ((height - paddingY * 2) / 4)}
          stroke="#e4e4e7"
        />
      ))}
      {yLabels.map((label, index) => (
        <text key={`${label}-${index}`} x="20" y={paddingY + 5 + index * ((height - paddingY * 2) / 4)} className="fill-zinc-500 text-[12px]">
          {label}
        </text>
      ))}
      <path d={areaPath} fill="#f4f4f5" opacity="0.6" />
      <path
        data-preview-overview-chart-path
        d={linePath}
        fill="none"
        stroke="#52525b"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function OverviewPanel({ section }: { section: LandingPreviewSection }) {
  const [selectedMetricIndex, setSelectedMetricIndex] = useState(0);
  const selectedMetric = section.metrics[selectedMetricIndex];

  if (!selectedMetric) {
    throw new Error('Landing overview metric is missing');
  }

  return (
    <div data-preview-section-content className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <MetricGrid
        metrics={section.metrics}
        selectedMetricIndex={selectedMetricIndex}
        onSelectMetric={setSelectedMetricIndex}
      />
      <div className="min-h-0 flex-1 rounded-lg border border-zinc-200 bg-white p-5">
        <div>
          <h3 className="text-lg font-semibold text-zinc-950">{selectedMetric.label}</h3>
        </div>
        <div data-preview-overview-chart className="mt-4 h-[calc(100%-2.5rem)] overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={selectedMetric.label}
              className="h-full w-full"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            >
              <OverviewChart metric={selectedMetric} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function InboxPanel({ section }: { section: LandingPreviewSection }) {
  return (
    <div data-preview-section-content className="grid min-h-0 flex-1 grid-cols-[330px_minmax(0,1fr)] gap-5">
      <div className="rounded-lg border border-zinc-200 bg-white">
        {section.conversations.map((conversation) => (
          <button
            key={conversation.name}
            type="button"
            className="flex w-full gap-3 border-b border-zinc-100 p-4 text-left last:border-b-0 hover:bg-zinc-50"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-sm font-semibold text-white">
              {conversation.name.slice(0, 1)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold text-zinc-950">{conversation.name}</span>
                <LandingTickerText className="text-xs font-semibold text-zinc-500" value={conversation.value} />
              </div>
              <div className="mt-1 text-xs font-medium text-red-500">{conversation.status}</div>
              <div className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500">{conversation.message}</div>
            </div>
          </button>
        ))}
      </div>
      <div className="flex min-h-0 flex-col rounded-lg border border-zinc-200 bg-white">
        <div className="flex h-14 items-center justify-between border-b border-zinc-200 px-5">
          <div className="font-semibold text-zinc-950">Alicia Tan</div>
          <MoreHorizontal className="size-5 text-zinc-500" />
        </div>
        <div className="flex-1 space-y-4 p-5">
          <div className="max-w-md rounded-2xl rounded-tl-sm bg-zinc-100 p-3 text-sm text-zinc-700">
            Hi, can I book the premium facial tomorrow afternoon?
          </div>
          <div className="ml-auto max-w-md rounded-2xl rounded-tr-sm bg-zinc-950 p-3 text-sm text-white">
            Yes. I found two open slots: 2:30 PM and 4:00 PM. Which one works best?
          </div>
          <div className="max-w-md rounded-2xl rounded-tl-sm bg-zinc-100 p-3 text-sm text-zinc-700">
            4:00 PM please.
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-zinc-200 p-4">
          <div className="flex-1 rounded-full bg-zinc-100 px-4 py-2 text-sm text-zinc-500">
            AI is preparing a confirmation...
          </div>
          <button type="button" className="flex size-9 items-center justify-center rounded-full bg-zinc-950 text-white">
            <Send className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function LandingAppPreviewContent({ section }: { section: LandingPreviewSection }) {
  if (section.id === 'agentSetup') {
    if (!section.agentSetup) {
      throw new Error('Landing agent setup mock data is missing');
    }

    return <LandingAppPreviewAgentSetup setup={section.agentSetup} />;
  }

  if (section.id === 'workflow') {
    return <LandingAppPreviewWorkflow workflow={section.workflow} />;
  }

  if (section.id === 'inbox') {
    return <InboxPanel section={section} />;
  }

  return <OverviewPanel section={section} />;
}
