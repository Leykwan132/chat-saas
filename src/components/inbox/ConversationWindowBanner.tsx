import { useEffect, useState } from 'react';
import { Info, Timer, ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const WARNING_MS = 60 * 60 * 1000; // 1 hour

type WindowStatus = 'open' | 'closing' | 'closed';

function getWindowStatus(lastCustomerMessageAt: number | undefined): {
  status: WindowStatus;
  remainingMs: number;
} {
  if (lastCustomerMessageAt === undefined) {
    return { status: 'closed', remainingMs: 0 };
  }
  const elapsed = Date.now() - lastCustomerMessageAt;
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
    bgClass: 'bg-emerald-800 dark:bg-emerald-900',
    borderClass: 'border-emerald-700/50 dark:border-emerald-800/50',
  },
  closing: {
    bgClass: 'bg-amber-700 dark:bg-amber-850',
    borderClass: 'border-amber-600/50 dark:border-amber-750/50',
  },
  closed: {
    bgClass: 'bg-rose-800 dark:bg-rose-900',
    borderClass: 'border-rose-700/50 dark:border-rose-800/50',
  },
};

type ConversationWindowBannerProps = {
  /** Timestamp (ms) of the customer's most recent inbound message. */
  lastCustomerMessageAt: number | undefined;
  /** The conversation service/platform. Only Meta platforms show the banner. */
  service: string;
  /** The current agent ID, used for building the outreach link. */
  agentId: string | undefined;
};

export function ConversationWindowBanner({
  lastCustomerMessageAt,
  service,
  agentId,
}: ConversationWindowBannerProps) {
  // Only show for Meta platforms
  if (service !== 'whatsapp' && service !== 'instagram' && service !== 'messenger') {
    return null;
  }

  return (
    <ConversationWindowBannerInner
      lastCustomerMessageAt={lastCustomerMessageAt}
      agentId={agentId}
    />
  );
}

function ConversationWindowBannerInner({
  lastCustomerMessageAt,
  agentId,
}: {
  lastCustomerMessageAt: number | undefined;
  agentId: string | undefined;
}) {
  const [now, setNow] = useState(Date.now());

  // Tick every second so the countdown is live
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Recompute when `now` or the timestamp changes
  void now; // ensures reactive dependency
  const { status, remainingMs } = getWindowStatus(lastCustomerMessageAt);
  const config = STATUS_CONFIG[status];

  return (
    <div
      className={cn(
        'flex items-center gap-2 border-b px-4 py-2 text-xs transition-colors',
        config.bgClass,
        config.borderClass,
      )}
    >
      {/* Timer icon */}
      <Timer className="size-3.5 shrink-0 text-white/80" />

      {/* Label & countdown */}
      <span className="font-light text-white/80">
        Conversation window:{' '}
        <span className="font-semibold tabular-nums text-white">
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
            className="inline-flex shrink-0 items-center justify-center text-white/60 transition-colors hover:text-white cursor-help ml-1.5"
            aria-label="What is the conversation window?"
          >
            <Info className="size-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-72 p-3 bg-popover text-popover-foreground border border-border shadow-md z-50 text-xs rounded-xl leading-relaxed">
          <div className="flex flex-col gap-2">
            <p>
              Meta allows free-form replies within 24 hours of the customer's last message. After that, you must use template messages.{' '}
              <a
                href="https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/send-messages"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                Learn more
              </a>
            </p>
            {agentId && (
              <div className="pt-2 border-t border-border/60 flex flex-col gap-2.5">
                <div className="flex flex-col gap-0.5">
                  <span className="text-muted-foreground font-normal">Need to send a follow-up?</span>
                  <Link
                    to={`/dashboard/${agentId}/follow-ups`}
                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium w-fit inline-flex items-center gap-1"
                  >
                    Try Follow-ups
                    <ArrowRight className="size-3" />
                  </Link>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-muted-foreground font-normal">Need to send marketing material?</span>
                  <Link
                    to={`/dashboard/${agentId}/broadcast`}
                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium w-fit inline-flex items-center gap-1"
                  >
                    Try Broadcast
                    <ArrowRight className="size-3" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
