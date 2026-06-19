import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAction, useQuery } from 'convex/react';
import { useSearchParams } from 'react-router';
import { CheckCircle2, CircleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import type { Doc, Id } from '../../convex/_generated/dataModel';
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
import {
  refreshFacebookLoginStatus,
  useFacebookSession,
  type FBLoginResponse,
} from '@/lib/fbSdk';

// Messenger: Facebook Login for Business — `FB.login` with a **Messenger**
// configuration id from the Meta App Dashboard (Facebook Login for Business →
// Configurations), same pattern as WhatsApp Embedded Signup.
//
// Token exchange omits `redirect_uri` when Meta issues a config-based auth
// code (see `messengerConnect.exchangeCodeForUserToken`). If Graph returns an
// error, set `VITE_MESSENGER_CODE_EXCHANGE_REDIRECT_URI` to a URL listed under
// Valid OAuth Redirect URIs and pass it on each `completeSignup` call.
//
// Classic `dialog/oauth` → `/auth/messenger/callback` is still supported via
// `messengerAuth.start` for integrations that do not use Embedded Signup.

export function ConnectMessengerButton({
  onConnected,
  forceAllowConnect,
  disabled,
  children,
}: {
  onConnected?: () => void;
  forceAllowConnect?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  const completeSignup = useAction(api.messengerConnect.completeSignup);
  const channels = useQuery(api.channels.listForCurrentOrg, {});
  const [busy, setBusy] = useState(false);
  const [dialogState, setDialogState] = useState<
    | { kind: 'closed' }
    | { kind: 'connecting' }
    | { kind: 'success' }
    | { kind: 'error'; message: string }
  >({ kind: 'closed' });

  const appId = import.meta.env.VITE_META_APP_ID as string | undefined;
  const messengerConfigId = import.meta.env
    .VITE_MESSENGER_CONFIG_ID as string | undefined;
  const graphVersion =
    (import.meta.env.VITE_META_GRAPH_API_VERSION as string | undefined) ||
    'v22.0';
  const codeExchangeRedirectUri =
    (import.meta.env.VITE_MESSENGER_CODE_EXCHANGE_REDIRECT_URI as
      | string
      | undefined)?.trim() || undefined;

  const fbSession = useFacebookSession({ appId, version: graphVersion });

  const [activeChannelId, setActiveChannelId] = useState<Id<'channels'> | undefined>(undefined);

  const messengerChannel = useMemo(() => {
    if (!channels) return undefined;
    if (activeChannelId) {
      return channels.find((c: any) => c._id === activeChannelId);
    }
    return channels.find((c: any) => c.service === 'messenger');
  }, [channels, activeChannelId]);

  const [, setSearchParams] = useSearchParams();

  const openPagePicker = useCallback((sessionId: Id<'oauthSessions'>) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('messenger', 'pick');
        next.set('session', sessionId);
        return next;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  const launchSignup = useCallback(() => {
    if (!appId || !messengerConfigId) {
      toast.error(
        'Messenger is not configured. Set VITE_META_APP_ID and VITE_META_MESSENGER_EMBEDDED_SIGNUP_CONFIG_ID.',
      );
      return;
    }

    if (!fbSession.ready || !window.FB) {
      toast.error('Facebook SDK not loaded yet. Please try again in a moment.');
      return;
    }

    setBusy(true);
    setDialogState({ kind: 'closed' });
    setActiveChannelId(undefined);

    window.FB.login(
      (response: FBLoginResponse) => {
        refreshFacebookLoginStatus();
        void (async () => {
          try {
            const code = response.authResponse?.code;
            if (!code) {
              const message =
                response.status === 'unknown'
                  ? 'Signup cancelled before completion.'
                  : 'Did not receive an authorisation code.';
              toast.error(message);
              return;
            }

            setDialogState({ kind: 'connecting' });

            const returnPath = `${window.location.pathname}${window.location.search}`;
            const result = await completeSignup({
              code,
              returnPath,
              ...(codeExchangeRedirectUri
                ? { redirectUri: codeExchangeRedirectUri }
                : {}),
            });

            if ('needsPagePicker' in result) {
              setDialogState({ kind: 'closed' });
              openPagePicker(result.sessionId);
              return;
            }

            setActiveChannelId(result.channelId);
            setDialogState({ kind: 'success' });
            onConnected?.();
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            setDialogState({ kind: 'error', message: msg });
          } finally {
            setBusy(false);
          }
        })();
      },
      {
        config_id: messengerConfigId,
        response_type: 'code',
        override_default_response_type: true,
      },
    );
  }, [
    appId,
    messengerConfigId,
    completeSignup,
    onConnected,
    fbSession.ready,
    codeExchangeRedirectUri,
    openPagePicker,
  ]);

  const handleDialogOpenChange = useCallback(
    (open: boolean) => {
      if (open) return;
      if (dialogState.kind === 'connecting') return;
      setDialogState({ kind: 'closed' });
    },
    [dialogState.kind],
  );

  if (!forceAllowConnect && messengerChannel?.status === 'connected') {
    return (
      <Button type="button" variant="outline" disabled>
        <CheckCircle2 className="size-4" />
        Connected
      </Button>
    );
  }

  if (children) {
    const isConnecting = busy || dialogState.kind === 'connecting';

    return (
      <>
        <button
          type="button"
          onClick={launchSignup}
          disabled={isConnecting || disabled}
          className={`group relative size-36 flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card p-3 text-center transition-all shadow-sm focus:outline-none ${
            isConnecting
              ? 'cursor-wait'
              : busy || disabled
                ? 'opacity-40 cursor-not-allowed'
                : 'hover:border-foreground/20 hover:bg-muted/30 cursor-pointer'
          }`}
        >
          {isConnecting ? (
            <Spinner className="size-6 text-muted-foreground" />
          ) : (
            children
          )}
        </button>

        <Dialog open={dialogState.kind !== 'closed'} onOpenChange={handleDialogOpenChange}>
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

  return (
    <>
      <div className="flex flex-col items-end gap-1">
        <Button type="button" onClick={launchSignup} disabled={busy}>
          {busy && dialogState.kind === 'closed' ? (
            <>
              <Spinner className="size-4" />
              Connect
            </>
          ) : (
            'Connect'
          )}
        </Button>
      </div>

      <Dialog open={dialogState.kind !== 'closed'} onOpenChange={handleDialogOpenChange}>
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

      <MessengerPagePickerDialog onConnected={onConnected} />
    </>
  );
}

const PROGRESS_LABELS: Record<
  NonNullable<Doc<'channels'>['progressStep']>,
  string
> = {
  linking: 'High-fiving the Meta servers...',
  subscribing: 'Plugging in the tin-can phone line...',
  registering: 'Engaging hyperdrive...',
  exchanging: 'Exchanging top-secret handshakes...',
  backfilling: 'Rescuing historical chats...',
};

function ConnectingState({
  channel,
}: {
  channel: Doc<'channels'> | undefined;
}) {
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
        <DialogTitle className="text-base">Connecting Messenger</DialogTitle>
        <DialogDescription asChild>
          <div>
            <Shimmer duration={2} spread={3}>
              {label}
            </Shimmer>
          </div>
        </DialogDescription>
      </div>
    </div>
  );
}

function SuccessState({
  channel,
}: {
  channel: Doc<'channels'> | undefined;
}) {
  const label =
    channel?.displayUsername ??
    channel?.pageId ??
    'Your Facebook Page';
  return (
    <div className="flex flex-col gap-5 py-2">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-6" />
        </div>
        <div className="flex flex-col gap-1">
          <DialogTitle className="text-base">Messenger connected</DialogTitle>
          <DialogDescription>
            {`Page "${label}" is linked to this workspace.`}
          </DialogDescription>
        </div>
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <DialogClose asChild>
          <Button variant="outline">Done</Button>
        </DialogClose>
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

/**
 * After redirect OAuth or Embedded Signup multi-Page flow, URL has
 * `?messenger=pick&session=<oauthSessionId>`.
 */
function MessengerPagePickerDialog({
  onConnected,
}: {
  onConnected?: () => void;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const getPickerPages = useAction(api.messengerAuth.getPickerPages);
  const finalizePick = useAction(api.messengerAuth.finalizePick);

  const sessionIdRaw =
    searchParams.get('messenger') === 'pick'
      ? searchParams.get('session')
      : null;
  const sessionId = sessionIdRaw as Id<'oauthSessions'> | null;

  const [pages, setPages] = useState<
    Array<{ id: string; name?: string }> | null
  >(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pickingId, setPickingId] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setPages(null);
      setLoadError(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const { pages: loaded } = await getPickerPages({ sessionId });
        if (cancelled) return;
        setPages(loaded);
        setLoadError(null);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        setLoadError(message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, getPickerPages]);

  const clearPickerParams = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete('messenger');
    next.delete('session');
    next.delete('message');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const handlePick = useCallback(
    (pageId: string) => {
      if (!sessionId) return;
      setPickingId(pageId);
      void (async () => {
        try {
          await finalizePick({ sessionId, pageId });
          toast.success('Messenger account connected');
          clearPickerParams();
          onConnected?.();
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          toast.error(`Messenger connect failed: ${message}`);
        } finally {
          setPickingId(null);
        }
      })();
    },
    [sessionId, finalizePick, clearPickerParams, onConnected],
  );

  const open = sessionId !== null;

  return (
    <Dialog open={open} modal>
      <DialogContent
        showCloseButton={false}
        className="max-h-[85vh] w-full max-w-xl gap-4 overflow-y-auto p-6 sm:max-w-2xl sm:p-8"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {loadError ? (
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
              <CircleAlert className="size-6" />
            </div>
            <DialogTitle className="text-lg font-semibold sm:text-xl">
              Could not load Pages
            </DialogTitle>
            <DialogDescription className="max-w-prose">
              {loadError}
            </DialogDescription>
            <Button
              type="button"
              variant="outline"
              className="mt-2"
              onClick={() => clearPickerParams()}
            >
              Close
            </Button>
          </div>
        ) : pages === null ? (
          <div className="flex flex-col items-center gap-4 py-8 text-center sm:py-10">
            <Spinner className="size-8 text-muted-foreground" />
            <DialogTitle className="text-lg font-semibold sm:text-xl">
              Loading your Pages
            </DialogTitle>
            <DialogDescription asChild>
              <div>
                <Shimmer duration={2} spread={3}>
                  Fetching Facebook Pages
                </Shimmer>
              </div>
            </DialogDescription>
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-prose flex-col gap-5 py-1">
            <div className="flex flex-col gap-2">
              <DialogTitle className="text-lg font-semibold sm:text-xl">
                Choose a Page
              </DialogTitle>
              <DialogDescription className="text-base leading-relaxed">
                You manage multiple Facebook Pages. Pick the one you want to
                connect to this workspace.
              </DialogDescription>
            </div>
            <ul className="flex max-h-[min(32rem,60vh)] w-full flex-col gap-3 overflow-y-auto">
              {pages.map((page) => {
                const isBusy = pickingId === page.id;
                return (
                  <li
                    key={page.id}
                    className="flex flex-row items-center gap-3 rounded-xl border border-border bg-card/40 px-4 py-4"
                  >
                    <div className="min-w-0 flex-1 space-y-2">
                      <p className="text-sm font-medium leading-snug text-foreground whitespace-normal [overflow-wrap:anywhere]">
                        {page.name ?? page.id}
                      </p>
                      <p className="font-mono text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere] break-all">
                        {page.id}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="shrink-0"
                      disabled={pickingId !== null}
                      onClick={() => handlePick(page.id)}
                    >
                      {isBusy ? (
                        <>
                          <Spinner className="size-3.5" />
                          Connecting
                        </>
                      ) : (
                        'Use this Page'
                      )}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
