import { useCallback, useMemo, useState } from 'react';
import { useAction, useQuery } from 'convex/react';
import { useSearchParams } from 'react-router';
import { CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import type { Doc, Id } from '../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { MessengerPagePickerDialog } from '@/components/MessengerPagePickerDialog';
import {
  MessengerConnectionStatusDialog,
} from '@/components/MessengerConnectionStatusDialog';
import type { MessengerConnectionDialogState } from '@/components/messengerConnectionDialogState';
import {
  waitForFacebookSdk,
  type FBLoginResponse,
} from '@/lib/fbSdk';

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
  const [dialogState, setDialogState] =
    useState<MessengerConnectionDialogState>({ kind: 'closed' });

  const appId = import.meta.env.VITE_META_APP_ID as string | undefined;
  const messengerConfigId = import.meta.env
    .VITE_MESSENGER_CONFIG_ID as string | undefined;
  const codeExchangeRedirectUri =
    (import.meta.env.VITE_MESSENGER_CODE_EXCHANGE_REDIRECT_URI as
      | string
      | undefined)?.trim() || undefined;

  const [activeChannelId, setActiveChannelId] = useState<
    Id<'channels'> | undefined
  >(undefined);

  const messengerChannel = useMemo(() => {
    if (!channels) return undefined;
    if (activeChannelId) {
      return channels.find((c: Doc<'channels'>) => c._id === activeChannelId);
    }
    return channels.find((c: Doc<'channels'>) => c.service === 'messenger');
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

    void (async () => {
      let fb: NonNullable<typeof window.FB>;
      try {
        fb = await waitForFacebookSdk();
      } catch {
        toast.error('Facebook SDK not loaded yet. Please try again in a moment.');
        return;
      }

      setBusy(true);
      setDialogState({ kind: 'closed' });
      setActiveChannelId(undefined);

      fb.login(
        (response: FBLoginResponse) => {
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
              setDialogState({ kind: 'closed' });
              toast.success('Messenger account connected');
              onConnected?.();
            } catch {
              setDialogState({ kind: 'error' });
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
    })();
  }, [
    appId,
    messengerConfigId,
    completeSignup,
    onConnected,
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

        <MessengerConnectionStatusDialog
          state={dialogState}
          onOpenChange={handleDialogOpenChange}
          onRetry={() => {
            setDialogState({ kind: 'closed' });
            launchSignup();
          }}
        />

        <MessengerPagePickerDialog onConnected={onConnected} />
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col items-end gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={launchSignup}
          disabled={busy}
        >
          {busy && dialogState.kind === 'closed' ? (
            <Spinner className="size-3" />
          ) : (
            'Connect'
          )}
        </Button>
      </div>

      <MessengerConnectionStatusDialog
        state={dialogState}
        onOpenChange={handleDialogOpenChange}
        onRetry={() => {
          setDialogState({ kind: 'closed' });
          launchSignup();
        }}
      />

      <MessengerPagePickerDialog onConnected={onConnected} />
    </>
  );
}
