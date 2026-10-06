import { useEffect, useState } from 'react';
import { Info, Timer } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { SandboxConversationWindowBanners } from './SandboxConversationWindowBanners';
import { MessagingWindowBanner } from './MessagingWindowBanner';
import { MessagingWindowExplanation } from './MessagingWindowExplanation';

const WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const WARNING_MS = 60 * 60 * 1000; // 1 hour

type WindowStatus = 'open' | 'closing' | 'closed';

function getWindowStatus(lastCustomerMessageAt: number | undefined, now: number): {
  status: WindowStatus;
  remainingMs: number;
} {
  if (lastCustomerMessageAt === undefined) {
    return { status: 'closed', remainingMs: 0 };
  }
  const elapsed = now - lastCustomerMessageAt;
  const remaining = WINDOW_MS - elapsed;

  if (remaining <= 0) {
    return { status: 'closed', remainingMs: 0 };
  }
  if (remaining <= WARNING_MS) {
    return { status: 'closing', remainingMs: remaining };
  }
  return { status: 'open', remainingMs: remaining };
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return 'Expired';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (hours === 0) parts.push(`${seconds}s`);

  return `${parts.join(' ')} remaining`;
}

const STATUS_CONFIG: Record<
  WindowStatus,
  {
    bgClass: string;
    borderClass: string;
  }
> = {
  open: {
    bgClass: 'bg-amber-200 dark:bg-amber-300',
    borderClass: 'border-amber-300/60 dark:border-amber-600/50',
  },
  closing: {
    bgClass: 'bg-amber-200 dark:bg-amber-300',
    borderClass: 'border-amber-300/60 dark:border-amber-600/50',
  },
  closed: {
    bgClass: 'bg-rose-800 dark:bg-rose-900',
    borderClass: 'border-rose-700/50 dark:border-rose-800/50',
  },
};

type ConversationWindowBannerProps = {
  freeMessagingExpiresAt?: number;
  /** Timestamp (ms) of the customer's most recent inbound message. */
  lastCustomerMessageAt: number | undefined;
  /** The conversation service/platform. Only Meta platforms show the banner. */
  service: string;
  agentId: string | undefined;
};

export function ConversationWindowBanner({
  lastCustomerMessageAt,
  service,
  freeMessagingExpiresAt,
}: ConversationWindowBannerProps) {
  const [searchParams] = useSearchParams();
  if (searchParams.get('isSandbox') === 'true') {
    return <SandboxConversationWindowBanners />;
  }

  // Only show for Meta platforms
  if (service !== 'whatsapp' && service !== 'instagram' && service !== 'messenger') {
    return null;
  }

  return (
    <>
      {service === 'whatsapp' && freeMessagingExpiresAt !== undefined && (
        <MessagingWindowBanner
          label="Free messaging"
          expiresAt={freeMessagingExpiresAt}
          color="green"
          hideWhenExpired
          explanation={<MessagingWindowExplanation window="free" />}
        />
      )}
      <ConversationWindowBannerInner
        lastCustomerMessageAt={lastCustomerMessageAt}
      />
    </>
  );
}

function ConversationWindowBannerInner({
  lastCustomerMessageAt,
}: {
  lastCustomerMessageAt: number | undefined;
}) {
  const [now, setNow] = useState(() => Date.now());

  // Tick every second so the countdown is live
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const { status, remainingMs } = getWindowStatus(lastCustomerMessageAt, now);
  const config = STATUS_CONFIG[status];

  return (
    <div
      className={cn(
        'flex items-center gap-2 border-b px-4 py-2 text-xs transition-colors',
        config.bgClass,
        config.borderClass,
        status === 'closed' ? 'text-white' : 'text-amber-950',
      )}
    >
      {/* Timer icon */}
      <Timer className="size-3.5 shrink-0 opacity-80" />

      {/* Label & countdown */}
      <span className="font-light">
        Conversation window:{' '}
        <span className="font-semibold tabular-nums">
          {status === 'closed'
            ? lastCustomerMessageAt === undefined
              ? 'No customer message yet'
              : 'Closed'
            : formatRemaining(remainingMs)}
        </span>
      </span>

      {/* Info tooltip */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex shrink-0 items-center justify-center opacity-60 transition-opacity hover:opacity-100 cursor-help ml-1.5"
            aria-label="What is the conversation window?"
          >
            <Info className="size-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-72 p-3 bg-popover text-popover-foreground border border-border shadow-md z-50 text-xs rounded-xl leading-relaxed">
          <MessagingWindowExplanation window="conversation" />
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
