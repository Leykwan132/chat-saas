import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAction, useQuery } from 'convex/react';
import { CheckCircle2, CircleAlert, ExternalLink } from 'lucide-react';
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
import {
  refreshFacebookLoginStatus,
  useFacebookSession,
  type FBLoginResponse,
} from '@/lib/fbSdk';

type SessionInfoMessage = {
  type: 'WA_EMBEDDED_SIGNUP';
  event: 'FINISH' | 'CANCEL' | 'ERROR';
  data?: {
    phone_number_id?: string;
    waba_id?: string;
    error_message?: string;
    current_step?: string;
  };
};

type ConnectWhatsAppButtonProps = {
  onConnected?: () => void;
};

type DialogState =
  | { kind: 'closed' }
  | { kind: 'connecting' }
  | { kind: 'success' }
  | { kind: 'error'; message: string };

const PROGRESS_LABELS: Record<NonNullable<Doc<'channels'>['progressStep']>, string> = {
  linking: 'Linking your WhatsApp Business account',
  subscribing: 'Connecting realtime updates',
  registering: 'Activating your phone number',
  // WhatsApp does not use these two — they exist on the shared progressStep
  // union for Instagram / Messenger. Mapped here so the type stays exhaustive.
  exchanging: 'Exchanging your code for an access token',
  backfilling: 'Loading your recent conversations',
};

const PAYMENT_METHOD_URL = 'https://business.facebook.com/wa/manage/home/';

export function ConnectWhatsAppButton({ onConnected }: ConnectWhatsAppButtonProps) {
  const completeSignup = useAction(api.whatsappEmbeddedSignup.completeSignup);
  const channels = useQuery(api.channels.listForCurrentOrg, {});
  const [busy, setBusy] = useState(false);
  const [dialogState, setDialogState] = useState<DialogState>({ kind: 'closed' });
  const sessionInfoRef = useRef<{ wabaId?: string; phoneNumberId?: string }>({});

  const appId = import.meta.env.VITE_META_APP_ID as string | undefined;
  const configId = import.meta.env.VITE_META_EMBEDDED_SIGNUP_CONFIG_ID as string | undefined;
  const graphVersion =
    (import.meta.env.VITE_META_GRAPH_API_VERSION as string | undefined) || 'v22.0';

  // The shared session hook handles SDK loading, the initial
  // getLoginStatus round-trip, and live auth.statusChange updates. The
  // Messenger button uses the same hook, so we only ever load the SDK
  // once per page.
  const fbSession = useFacebookSession({ appId, version: graphVersion });

  // Listen for the session info postMessage from the Embedded Signup popup.
  // Meta sends this when the user finishes the flow; the payload carries the
  // waba_id + phone_number_id we need to forward to the backend action.
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      let payload: SessionInfoMessage | null = null;
      try {
        if (typeof event.data === 'string') {
          payload = JSON.parse(event.data) as SessionInfoMessage;
        } else if (typeof event.data === 'object' && event.data !== null) {
          payload = event.data as SessionInfoMessage;
        }
      } catch {
        return;
      }
      if (!payload || payload.type !== 'WA_EMBEDDED_SIGNUP') return;

      if (payload.event === 'FINISH' && payload.data) {
        sessionInfoRef.current = {
          wabaId: payload.data.waba_id,
          phoneNumberId: payload.data.phone_number_id,
        };
      } else if (payload.event === 'CANCEL') {
        toast.message('WhatsApp connection cancelled');
      } else if (payload.event === 'ERROR' && payload.data?.error_message) {
        toast.error(`Embedded Signup error: ${payload.data.error_message}`);
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Live whatsapp channel row from Convex. Used both to pull the active
  // progressStep into the connecting state and to display the phone number
  // in the success state.
  const whatsappChannel = useMemo(
    () => channels?.find((c: any) => c.service === 'whatsapp'),
    [channels],
  );

  const launchSignup = useCallback(() => {
    if (!appId || !configId) {
      toast.error(
        'WhatsApp is not configured. Set VITE_META_APP_ID and VITE_META_EMBEDDED_SIGNUP_CONFIG_ID.',
      );
      return;
    }

    if (!fbSession.ready || !window.FB) {
      toast.error('Facebook SDK not loaded yet. Please try again in a moment.');
      return;
    }

    setBusy(true);
    sessionInfoRef.current = {};

    window.FB.login(
      (response: FBLoginResponse) => {
        // Pull the freshest login state into the cache. auth.statusChange
        // also fires on its own, this is just belt-and-braces.
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
              setBusy(false);
              return;
            }

            const { wabaId, phoneNumberId } = sessionInfoRef.current;
            if (!wabaId || !phoneNumberId) {
              const message =
                'Signup completed but WhatsApp Business Account info was not received.';
              toast.error(message);
              setBusy(false);
              return;
            }

            // Open the dialog only once we have something real to wait on
            // (the FB.login popup itself was already in front of the user).
            setDialogState({ kind: 'connecting' });

            try {
              await completeSignup({ code, wabaId, phoneNumberId });
              setDialogState({ kind: 'success' });
              onConnected?.();
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              setDialogState({ kind: 'error', message: msg });
            }
          } finally {
            setBusy(false);
          }
        })();
      },
      {
        config_id: configId,
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          featureType: 'whatsapp_business_app_onboarding',
          sessionInfoVersion: '3',
        },
      },
    );
  }, [appId, configId, completeSignup, onConnected, fbSession.ready]);

  const handleDialogOpenChange = useCallback(
    (open: boolean) => {
      if (open) return;
      // Disallow dismissing while the action is in flight; the open-change
      // event still fires for ESC etc., so guard explicitly.
      if (dialogState.kind === 'connecting') return;
      setDialogState({ kind: 'closed' });
    },
    [dialogState.kind],
  );

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
            <ConnectingState channel={whatsappChannel} />
          ) : dialogState.kind === 'success' ? (
            <SuccessState channel={whatsappChannel} />
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
        <DialogTitle className="text-base">Connecting your WhatsApp account</DialogTitle>
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

function SuccessState({ channel }: { channel: Doc<'channels'> | undefined }) {
  const number =
    channel?.displayPhoneNumber ?? channel?.phoneNumberId ?? undefined;
  return (
    <div className="flex flex-col gap-5 py-2">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-6" />
        </div>
        <div className="flex flex-col gap-1">
          <DialogTitle className="text-base">WhatsApp connected</DialogTitle>
          <DialogDescription>
            {number
              ? `Your number ${number} is linked to this workspace.`
              : 'Your WhatsApp Business account is linked to this workspace.'}
          </DialogDescription>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-4 text-sm">
        <p className="font-medium">One last step: add a payment method</p>
        <p className="text-muted-foreground">
          Open WhatsApp Manager and add a payment method so you can start
          sending messages to your customers.
        </p>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <DialogClose asChild>
          <Button variant="outline">Done</Button>
        </DialogClose>
        <Button asChild>
          <a href={PAYMENT_METHOD_URL} target="_blank" rel="noopener noreferrer">
            Open WhatsApp Manager
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
