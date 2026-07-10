import { useEffect, useState } from 'react';
import { useAction } from 'convex/react';
import { ExternalLink, Loader2 } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';

const META_MESSAGING_LIMIT_DOCS_URL =
  'https://developers.facebook.com/documentation/business-messaging/whatsapp/messaging-limits#scaling-paths';

type MessagingLimitInfo = {
  tier: string;
  displayLabel: string;
  conversationLimit: number | null;
  wabaId: string;
  docsUrl: string;
  fetchedAt: number;
};

type BroadcastMessagingLimitCardProps = {
  channelId: Id<'channels'> | '';
};

export function BroadcastMessagingLimitCard({ channelId }: BroadcastMessagingLimitCardProps) {
  const getMessagingLimit = useAction(api.whatsappMessagingLimit.getMessagingLimit);
  const [messagingLimit, setMessagingLimit] = useState<MessagingLimitInfo | null>(null);
  const [messagingLimitLoading, setMessagingLimitLoading] = useState(false);
  const [messagingLimitError, setMessagingLimitError] = useState<string | null>(null);

  useEffect(() => {
    if (!channelId) {
      setMessagingLimit(null);
      setMessagingLimitError(null);
      setMessagingLimitLoading(false);
      return;
    }

    let cancelled = false;
    setMessagingLimitLoading(true);
    setMessagingLimitError(null);
    void getMessagingLimit({ channelId })
      .then((result) => {
        if (cancelled) return;
        setMessagingLimit(result);
      })
      .catch((error) => {
        if (cancelled) return;
        setMessagingLimit(null);
        setMessagingLimitError(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        if (!cancelled) {
          setMessagingLimitLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [channelId, getMessagingLimit]);

  return (
    <section className="rounded-lg border border-border bg-white p-4">
      <div className="flex flex-col items-stretch gap-3">
        <div className="flex w-full items-center justify-between gap-2">
          <div className="min-w-0">
            <h3 className="m-0 text-sm font-semibold text-zinc-950">
              Broadcast Daily Limit
            </h3>
          </div>
          {messagingLimitLoading && (
            <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-muted-foreground" />
          )}
        </div>

        {messagingLimitError ? (
          <p className="text-xs leading-5 text-muted-foreground">
            We could not load the latest limit from Meta right now.
          </p>
        ) : messagingLimit ? (
          <div className="flex flex-col gap-1.5 text-left">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold tracking-normal text-zinc-950">
                {messagingLimit.displayLabel}
              </span>
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              Business-initiated conversations in a rolling 24-hour window.
            </p>
          </div>
        ) : (
          <p className="text-xs leading-5 text-muted-foreground">
            Checking your WhatsApp Business Account limit with Meta.
          </p>
        )}

        <div className="flex justify-start pt-1">
          <Button type="button" variant="outline" size="sm" asChild className="h-8 justify-center gap-1.5 rounded-full px-4 text-xs">
            <a
              href={messagingLimit?.docsUrl ?? META_MESSAGING_LIMIT_DOCS_URL}
              target="_blank"
              rel="noreferrer"
            >
              View detail
              <ExternalLink className="size-3.5" />
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
