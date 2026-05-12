import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAction, useQuery } from 'convex/react';
import { CheckCircle2, CircleAlert, ExternalLink, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import type { Doc } from '../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { Shimmer } from '@/components/ai-elements/shimmer';
import { ensureFacebookSdkLoaded, type FBLoginResponse } from '@/lib/fbSdk';

const DEFAULT_MESSENGER_CONFIG_ID = '1680761212948366';

const PROGRESS_LABELS: Record<NonNullable<Doc<'channels'>['progressStep']>, string> = {
  linking: 'Linking your Facebook account',
  subscribing: 'Subscribing the Page to webhooks',
  registering: 'Registering the Page',
  exchanging: 'Exchanging your code for an access token',
  backfilling: 'Loading your recent conversations',
};

type DialogState =
  | { kind: 'closed' }
  | { kind: 'connecting' }
  | { kind: 'picker'; code: string; redirectUri: string; pages: Array<{ id: string; name?: string }> }
  | { kind: 'success' }
  | { kind: 'error'; message: string };

export function ConnectMessengerButton({
  onConnected,
}: {
  onConnected?: () => void;
}) {
  const completeSignup = useAction(api.messengerConnect.completeSignup);
  const channels = useQuery(api.channels.listForCurrentOrg, {});
  const [busy, setBusy] = useState(false);
  const [dialogState, setDialogState] = useState<DialogState>({ kind: 'closed' });

  const appId = import.meta.env.VITE_META_APP_ID as string | undefined;
  const configId =
    (import.meta.env.VITE_MESSENGER_CONFIG_ID as string | undefined) ||
    DEFAULT_MESSENGER_CONFIG_ID;
  const graphVersion =
    (import.meta.env.VITE_META_GRAPH_API_VERSION as string | undefined) || 'v22.0';

  useEffect(() => {
    if (!appId) return;
    ensureFacebookSdkLoaded({ appId, version: graphVersion });
  }, [appId, graphVersion]);

  const messengerChannel = useMemo(
    () => channels?.find((c) => c.service === 'messenger'),
    [channels],
  );

  const runCompleteSignup = useCallback(
    async (
      code: string,
      redirectUri: string,
      pageId?: string,
    ) => {
      try {
        const result = await completeSignup({ code, redirectUri, pageId });
        if ('needsPagePicker' in result && result.needsPagePicker) {
          setDialogState({
            kind: 'picker',
            code,
            redirectUri,
            pages: result.pages,
          });
          return;
        }
        setDialogState({ kind: 'success' });
        onConnected?.();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setDialogState({ kind: 'error', message: msg });
      }
    },
    [completeSignup, onConnected],
  );

  const launchSignup = useCallback(() => {
    if (!appId) {
      toast.error(
        'Messenger is not configured. Set VITE_META_APP_ID on the frontend.',
      );
      return;
    }
    if (!window.FB) {
      toast.error('Facebook SDK not loaded yet. Please try again in a moment.');
      return;
    }
    setBusy(true);

    window.FB.login(
      (response: FBLoginResponse) => {
        void (async () => {
          try {
            const code = response.authResponse?.code;
            if (!code) {
              toast.error(
                response.status === 'unknown'
                  ? 'Signup cancelled before completion.'
                  : 'Did not receive an authorisation code.',
              );
              return;
            }
            setDialogState({ kind: 'connecting' });
            // FB Login for Business validates redirect_uri loosely — the
            // origin is what matters, so we pass the page origin.
            await runCompleteSignup(code, window.location.origin);
          } finally {
            setBusy(false);
          }
        })();
      },
      {
        config_id: configId,
        response_type: 'code',
        override_default_response_type: true,
      },
    );
  }, [appId, configId, runCompleteSignup]);

  const handleDialogOpenChange = useCallback(
    (open: boolean) => {
      if (open) return;
      if (dialogState.kind === 'connecting') return;
      setDialogState({ kind: 'closed' });
    },
    [dialogState.kind],
  );

  if (messengerChannel?.status === 'connected') {
    return (
      <Button type="button" variant="outline" disabled>
        <CheckCircle2 className="size-4" />
        Connected
      </Button>
    );
  }

  return (
    <>
      <Button type="button" onClick={launchSignup} disabled={busy}>
        {busy && dialogState.kind === 'closed' ? (
          <Spinner className="size-4" />
        ) : (
          <Plus className="size-4" />
        )}
        Connect
      </Button>

      <Dialog
        open={dialogState.kind !== 'closed'}
        onOpenChange={handleDialogOpenChange}
      >
        <DialogContent
          showCloseButton={dialogState.kind !== 'connecting'}
          onInteractOutside={(e) => {
            if (dialogState.kind === 'connecting') e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (dialogState.kind === 'connecting') e.preventDefault();
          }}
        >
          {dialogState.kind === 'connecting' ? (
            <ConnectingState channel={messengerChannel} />
          ) : dialogState.kind === 'picker' ? (
            <PickerState
              pages={dialogState.pages}
              onPick={(pageId) => {
                setDialogState({ kind: 'connecting' });
                void runCompleteSignup(
                  dialogState.code,
                  dialogState.redirectUri,
                  pageId,
                );
              }}
            />
          ) : dialogState.kind === 'success' ? (
            <SuccessState channel={messengerChannel} />
          ) : dialogState.kind === 'error' ? (
            <ErrorState
              message={dialogState.message}
              onRetry={() => {
                setDialogState({ kind: 'closed' });
                launchSignup();
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function ConnectingState({ channel }: { channel: Doc<'channels'> | undefined }) {
  const label =
    channel?.progressStep && PROGRESS_LABELS[channel.progressStep]
      ? PROGRESS_LABELS[channel.progressStep]
      : 'Setting things up';
  return (
    <div className="flex flex-col items-center gap-5 py-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
      <div className="flex flex-col items-center gap-2">
        <DialogTitle className="text-base">Connecting your Page</DialogTitle>
        <DialogDescription asChild>
          <div>
            <Shimmer duration={2} spread={3}>
              {label}
            </Shimmer>
          </div>
        </DialogDescription>
      </div>
      <p className="text-xs text-muted-foreground">
        This usually takes a few seconds. Please keep this window open.
      </p>
    </div>
  );
}

function PickerState({
  pages,
  onPick,
}: {
  pages: Array<{ id: string; name?: string }>;
  onPick: (pageId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="flex flex-col gap-1">
        <DialogTitle className="text-base">Choose a Page</DialogTitle>
        <DialogDescription>
          You manage multiple Facebook Pages. Pick the one you want to connect
          to this workspace.
        </DialogDescription>
      </div>
      <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {pages.map((page) => (
          <li key={page.id} className="flex items-center justify-between gap-3 px-3 py-2">
            <div className="flex flex-col min-w-0">
              <span className="truncate text-sm font-medium">
                {page.name ?? page.id}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {page.id}
              </span>
            </div>
            <Button type="button" size="sm" onClick={() => onPick(page.id)}>
              Use this Page
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SuccessState({ channel }: { channel: Doc<'channels'> | undefined }) {
  const name = channel?.displayUsername ?? channel?.pageId ?? undefined;
  return (
    <div className="flex flex-col gap-5 py-2">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-6" />
        </div>
        <div className="flex flex-col gap-1">
          <DialogTitle className="text-base">Messenger connected</DialogTitle>
          <DialogDescription>
            {name
              ? `${name} is linked to this workspace.`
              : 'Your Facebook Page is linked to this workspace.'}
          </DialogDescription>
        </div>
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <DialogClose asChild>
          <Button variant="outline">Done</Button>
        </DialogClose>
        <Button asChild>
          <a
            href="https://business.facebook.com/latest/inbox"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open Meta Business Suite
            <ExternalLink className="size-4" />
          </a>
        </Button>
      </div>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col gap-5 py-2">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
          <CircleAlert className="size-6" />
        </div>
        <div className="flex flex-col gap-1">
          <DialogTitle className="text-base">Connection failed</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </div>
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <DialogClose asChild>
          <Button variant="outline">Close</Button>
        </DialogClose>
        <Button type="button" onClick={onRetry}>
          Try again
        </Button>
      </div>
    </div>
  );
}
