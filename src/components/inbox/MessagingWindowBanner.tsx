import { useEffect, useState, type ReactNode } from 'react';
import { Info, Timer } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type MessagingWindowBannerProps = {
  label: string;
  expiresAt: number;
  color: 'green' | 'yellow';
  explanation: ReactNode;
  hideWhenExpired?: boolean;
};

function formatRemaining(remainingMs: number) {
  if (remainingMs <= 0) return 'Closed';
  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m ${seconds}s remaining`;
}

export function MessagingWindowBanner({
  label,
  expiresAt,
  color,
  explanation,
  hideWhenExpired = false,
}: MessagingWindowBannerProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(intervalId);
  }, []);

  if (hideWhenExpired && expiresAt <= now) return null;

  return (
    <div
      className={cn(
        'flex items-center gap-2 border-b px-4 py-2 text-xs transition-colors',
        color === 'green'
          ? 'border-emerald-700/50 bg-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-900 text-white'
          : 'border-amber-300/60 bg-amber-200 dark:border-amber-600/50 dark:bg-amber-300 text-amber-950',
      )}
    >
      <Timer className="size-3.5 shrink-0 opacity-80" />
      <span className="font-light">
        <span className="opacity-80">{label}: </span>
        <span className="font-semibold tabular-nums">
          {formatRemaining(expiresAt - now)}
        </span>
      </span>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="ml-1.5 inline-flex shrink-0 cursor-help items-center justify-center opacity-60 transition-opacity hover:opacity-100"
            aria-label={`What is the ${label.toLowerCase()}?`}
          >
            <Info className="size-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="z-50 max-w-72 rounded-xl border border-border bg-popover p-3 text-xs leading-relaxed text-popover-foreground shadow-md"
        >
          {explanation}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
