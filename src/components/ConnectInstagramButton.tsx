import { useCallback, useMemo, useState } from 'react';
import { useAction, useQuery } from 'convex/react';
import { CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

// The Instagram OAuth flow uses a STATIC redirect URI registered with Meta:
//   ${CONVEX_SITE_URL}/auth/instagram/callback
//
// Per-flow dynamic state (specifically, where to drop the user back into the
// app after the connect succeeds) travels inside the OAuth `state`
// parameter, which is generated server-side in `instagramAuth.start`. This
// component only:
//   1. Asks the backend for an authorize URL bound to the current return path
//   2. Navigates the browser to that URL
//
// On successful completion the static callback 302-redirects the browser
// back to `returnPath?instagram=connected`, where ChannelsPage shows a
// toast. There is no `?code=` handling on the frontend anymore.
export function ConnectInstagramButton({ forceAllowConnect, disabled, children }: { forceAllowConnect?: boolean; disabled?: boolean; children?: React.ReactNode }) {
  const channels = useQuery(api.channels.listForCurrentOrg, {});
  const startInstagramAuth = useAction(api.instagramAuth.start);
  const [busy, setBusy] = useState(false);

  const instagramChannel = useMemo(
    () => channels?.find((c: any) => c.service === 'instagram'),
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
      {busy ? (
        <>
          <Spinner className="size-4" />
          Connect
        </>
      ) : (
        'Connect'
      )}
    </Button>
  );
}
