import { useCallback, useMemo, useState } from 'react';
import { useAction, useQuery } from 'convex/react';
import { CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import type { Doc } from '../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

type ConnectInstagramButtonProps = {
  forceAllowConnect?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
};

export function ConnectInstagramButton({
  forceAllowConnect,
  disabled,
  children,
}: ConnectInstagramButtonProps) {
  const channels = useQuery(api.channels.listForCurrentOrg, {});
  const startInstagramAuth = useAction(api.instagramAuth.start);
  const [busy, setBusy] = useState(false);

  const instagramChannel = useMemo(
    () => channels?.find((c: Doc<'channels'>) => c.service === 'instagram'),
    [channels],
  );

  const launchSignup = useCallback(() => {
    setBusy(true);
    void (async () => {
      try {
        const returnPath = `${window.location.pathname}${window.location.search}`;
        const { authorizeUrl } = await startInstagramAuth({ returnPath });
        window.location.assign(authorizeUrl);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        toast.error(`Instagram connect failed: ${message}`);
        setBusy(false);
      }
    })();
  }, [startInstagramAuth]);

  if (!forceAllowConnect && instagramChannel?.status === 'connected') {
    return (
      <Button type="button" variant="outline" disabled>
        <CheckCircle2 className="size-4" />
        Connected
      </Button>
    );
  }

  if (children) {
    return (
      <button
        type="button"
        onClick={launchSignup}
        disabled={busy || disabled}
        className={`group relative size-36 flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card p-3 text-center transition-all shadow-sm focus:outline-none ${
          busy
            ? 'cursor-wait'
            : disabled
              ? 'opacity-40 cursor-not-allowed'
              : 'hover:border-foreground/20 hover:bg-muted/30 cursor-pointer'
        }`}
      >
        {busy ? (
          <Spinner className="size-6 text-muted-foreground" />
        ) : (
          children
        )}
      </button>
    );
  }

  return (
    <Button type="button" onClick={launchSignup} disabled={busy}>
      {busy ? <Spinner className="size-4" /> : 'Connect'}
    </Button>
  );
}
