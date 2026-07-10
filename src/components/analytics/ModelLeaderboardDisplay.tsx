import { ModelIcon } from '@lobehub/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { MODEL_USAGE_OTHERS_COLOR } from '../../../shared/modelUsageChartColors';
import {
  formatTokens,
  getCleanModelName,
  type SupportedModelOption,
} from './modelLeaderboardUtils';

export function ModelLogo({
  model,
  imageUrl,
  size = 18,
}: {
  model: string;
  imageUrl?: string;
  size?: number;
}) {
  if (imageUrl) {
    return (
      <img
        alt=""
        className="select-none object-contain"
        height={size}
        src={imageUrl}
        width={size}
      />
    );
  }

  return (
    <ModelIcon
      model={model}
      size={size}
      type="color"
      className="select-none"
    />
  );
}

export function ModelUsageTooltip({
  active,
  payload,
  topModels,
  supportedModels,
  modelColorMap,
}: {
  active?: boolean;
  payload?: Array<{ payload?: Record<string, number | string> }>;
  topModels: string[];
  supportedModels?: SupportedModelOption[];
  modelColorMap: Map<string, string>;
}) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const monthData = payload[0]?.payload;
  if (!monthData) return null;

  const modelEntries = [];

  for (const model of topModels) {
    const tokens = Number(monthData[model]) || 0;
    if (tokens > 0) {
      modelEntries.push({
        key: model,
        name: getCleanModelName(model, supportedModels),
        value: tokens,
        color: modelColorMap.get(model) ?? MODEL_USAGE_OTHERS_COLOR,
      });
    }
  }

  const othersTokens = Number(monthData.others) || 0;
  if (othersTokens > 0) {
    modelEntries.push({
      key: 'others',
      name: 'Others',
      value: othersTokens,
      color: MODEL_USAGE_OTHERS_COLOR,
    });
  }

  modelEntries.sort((left, right) => right.value - left.value);
  const total = Number(monthData.prompt || 0) + Number(monthData.completion || 0);

  return (
    <div className="grid min-w-48 animate-fade-in items-start gap-2 rounded-xl border border-zinc-200/50 bg-white px-3 py-2.5 text-xs text-zinc-950 shadow-xl ring-1 ring-black/5 dark:border-white/[0.08] dark:bg-zinc-950 dark:text-zinc-50 dark:ring-white/10">
      <div className="w-max rounded bg-zinc-900 px-2 py-1 text-[10px] font-semibold text-white select-none">
        {String(monthData.month)}
      </div>
      <div className="mt-1 flex flex-col gap-1.5">
        {modelEntries.map((entry) => (
          <div key={entry.key} className="flex w-full items-center justify-between gap-3 leading-none">
            <div className="flex min-w-0 items-center gap-2">
              <div
                className="h-2.5 w-1 shrink-0 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="truncate font-medium text-zinc-500 dark:text-zinc-400">
                {entry.name}
              </span>
            </div>
            <span className="shrink-0 font-mono font-semibold text-zinc-900 tabular-nums dark:text-white">
              {formatTokens(entry.value)}
            </span>
          </div>
        ))}
      </div>
      <div className="my-1 h-px bg-zinc-100 dark:bg-white/[0.06]" />
      <div className="flex items-center justify-between gap-3 font-semibold leading-none text-zinc-900 dark:text-white">
        <span>Total</span>
        <span className="font-mono">{formatTokens(total)}</span>
      </div>
    </div>
  );
}

export function ModelLeaderboardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex w-full flex-col gap-6 animate-fade-in', className)}>
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-white/[0.08] dark:bg-white/[0.02]">
        <div className="flex items-center gap-2.5">
          <Skeleton className="size-5 rounded" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="mt-4 h-[320px] w-full" />
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-white/[0.08] dark:bg-white/[0.02]">
        <Skeleton className="mb-4 h-5 w-28" />
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
