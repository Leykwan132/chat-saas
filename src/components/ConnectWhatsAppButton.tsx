import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { useNavigate, useParams } from 'react-router';
import { CheckCircle2, CircleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { usePostHog } from '@posthog/react';
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
import {
  refreshFacebookLoginStatus,
  useFacebookSession,
  waitForFacebookSdk,
  type FBLoginResponse,
} from '@/lib/fbSdk';
import {
  resolveWhatsAppEmbeddedSignupIds,
} from '@/lib/whatsappEmbeddedSignup';
import {
  isOpenWhatsAppConnectionAttempt,
} from '@/lib/whatsappConnectionAttemptStatus';
import { usePersistWhatsAppSignupFinish } from '@/hooks/usePersistWhatsAppSignupFinish';

type SessionInfoMessage = {
  type: 'WA_EMBEDDED_SIGNUP';
  event: 'FINISH' | 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING' | 'CANCEL' | 'ERROR';
  data?: {
    phone_number_id?: string;
    waba_id?: string;
    error_message?: string;
    current_step?: string;
  };
};

type ConnectWhatsAppButtonProps = {
  onConnected?: () => void;
  forceAllowConnect?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
};

type DialogState =
  | { kind: 'closed' }
  | { kind: 'connecting' }
  | { kind: 'success' }
  | { kind: 'error'; message: string };



function isSignupFinishEvent(event: SessionInfoMessage['event']) {
  return event === 'FINISH' || event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING';
}

export function ConnectWhatsAppButton({ onConnected, forceAllowConnect, disabled, children }: ConnectWhatsAppButtonProps) {
  const navigate = useNavigate();
  const posthog = usePostHog();
  const { agentId } = useParams();
  const completeSignup = useAction(api.whatsappEmbeddedSignup.completeSignup);
  const beginConnectionAttempt = useMutation(
    api.whatsappEmbeddedSignup.beginConnectionAttempt,
  );
  const persistSignupFinish = usePersistWhatsAppSignupFinish();
  const openConnectionAttempt = useQuery(
    api.whatsappEmbeddedSignup.getOpenConnectionAttempt,
    {},
  );
  const channels = useQuery(api.channels.listForCurrentOrg, {});
  const [busy, setBusy] = useState(false);
  const [dialogState, setDialogState] = useState<DialogState>({ kind: 'closed' });
  const [userDismissed, setUserDismissed] = useState(false);
  const sessionInfoRef = useRef<{ wabaId?: string; phoneNumberId?: string }>({});
  const authCodeRef = useRef<string | undefined>(undefined);
  const connectionAttemptPromiseRef = useRef<
    Promise<Id<'whatsappConnectionAttempts'> | undefined> | undefined
  >(undefined);
  const [activePhoneNumberId, setActivePhoneNumberId] = useState<string | undefined>(undefined);
  const completingRef = useRef(false);

  const signupIds = resolveWhatsAppEmbeddedSignupIds({
    appId: import.meta.env.VITE_META_APP_ID as string | undefined,
    configId: import.meta.env.VITE_META_EMBEDDED_SIGNUP_CONFIG_ID as string | undefined,
  });
  const appId = signupIds?.appId;
  const configId = signupIds?.configId;

  // SDK is loaded from index.html; hook attaches session listeners.
  useFacebookSession();

  // Live whatsapp channel row from Convex. Used both to pull the active
  // progressStep into the connecting state and to display the phone number
  // in the success state.
  const whatsappChannel = useMemo(() => {
    if (!channels) return undefined;
    if (openConnectionAttempt?.channelId) {
      return channels.find((c) => c._id === openConnectionAttempt.channelId);
    }
    if (activePhoneNumberId) {
      return channels.find(
        (c: Doc<'channels'>) =>
          c.service === 'whatsapp' && c.phoneNumberId === activePhoneNumberId,
      );
    }
    if (openConnectionAttempt?.phoneNumberId) {
      return channels.find(
        (c) =>
          c.service === 'whatsapp' &&
          c.phoneNumberId === openConnectionAttempt.phoneNumberId,
      );
    }
    return channels.find((c: Doc<'channels'>) => c.service === 'whatsapp');
  }, [channels, activePhoneNumberId, openConnectionAttempt]);

  useEffect(() => {
    if (!openConnectionAttempt) {
      if (
        dialogState.kind === 'connecting' &&
        whatsappChannel?.status === 'connected'
      ) {
        setDialogState({ kind: 'closed' });
        setUserDismissed(true);
        onConnected?.();
        posthog?.capture('channel_connected', { channel_type: 'whatsapp' });
        toast.success('WhatsApp connected successfully', {
          description: 'Chat syncing is in progress, will be completed soon.',
          duration: 15000,
          action: {
            label: 'See progress',
            onClick: () => {
              const redirectPath = agentId ? `/dashboard/${agentId}/channels` : '/dashboard';
              navigate(redirectPath);
            }
          }
        });
      }
      setUserDismissed(false);
      return;
    }

    if (openConnectionAttempt.status === 'error') {
      setDialogState({
        kind: 'error',
        message: openConnectionAttempt.lastError ?? 'Connection failed',
      });
      setBusy(false);
      return;
    }

    if (isOpenWhatsAppConnectionAttempt(openConnectionAttempt)) {
      const isSyncingOrConnected =
        openConnectionAttempt.status === 'connected' ||
        openConnectionAttempt.status === 'syncing';

      if (isSyncingOrConnected) {
        if (!userDismissed && dialogState.kind === 'connecting') {
          setDialogState({ kind: 'closed' });
          setUserDismissed(true);
          onConnected?.();
          posthog?.capture('channel_connected', { channel_type: 'whatsapp' });
          toast.success('WhatsApp connected successfully', {
            description: 'Chat syncing is in progress, will be completed soon.',
            duration: 15000,
            action: {
              label: 'See progress',
              onClick: () => {
                const redirectPath = agentId ? `/dashboard/${agentId}/channels` : '/dashboard';
                navigate(redirectPath);
              }
            }
          });
        }
      } else {
        if (!userDismissed && dialogState.kind !== 'connecting') {
          setDialogState({ kind: 'connecting' });
        }
      }

      if (openConnectionAttempt.phoneNumberId) {
        setActivePhoneNumberId(openConnectionAttempt.phoneNumberId);
      }
    }
  }, [openConnectionAttempt, whatsappChannel?.status, dialogState.kind, onConnected, userDismissed, agentId, navigate]);

  const tryCompleteSignup = useCallback(async () => {
    if (completingRef.current) return;

    const code = authCodeRef.current;
    const { wabaId, phoneNumberId } = sessionInfoRef.current;
    if (!code || !wabaId || !phoneNumberId) return;

    completingRef.current = true;
    setDialogState({ kind: 'connecting' });

    try {
      const attemptId = await connectionAttemptPromiseRef.current;
      await completeSignup({
        code,
        applicationId: appId,
        wabaId,
        phoneNumberId,
        attemptId,
        flowType: 'existing_phone_number',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setDialogState({ kind: 'error', message: msg });
    } finally {
      completingRef.current = false;
      setBusy(false);
    }
  }, [appId, completeSignup]);

  const requestAuthCodeAndComplete = useCallback(async () => {
    if (!appId || !configId) return;

    let fb: NonNullable<typeof window.FB>;
    try {
      fb = await waitForFacebookSdk();
    } catch {
      toast.error('Facebook SDK not loaded yet. Please try again in a moment.');
      setBusy(false);
      return;
    }

    fb.login(
      (response: FBLoginResponse) => {
        refreshFacebookLoginStatus();

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

        authCodeRef.current = code;
        void tryCompleteSignup();
      },
      {
        config_id: configId,
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: 'whatsapp_business_app_onboarding',
          sessionInfoVersion: '3',
        },
      },
    );
  }, [appId, configId, tryCompleteSignup]);

  // Meta posts WA_EMBEDDED_SIGNUP when the embedded signup flow finishes.
  useEffect(() => {
    async function handleMessage(event: MessageEvent) {
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

      if (
        isSignupFinishEvent(payload.event) &&
        payload.data?.waba_id &&
        payload.data.phone_number_id
      ) {
        const wabaId = payload.data.waba_id;
        const phoneNumberId = payload.data.phone_number_id;
        try {
          await persistSignupFinish(
            connectionAttemptPromiseRef.current,
            wabaId,
            phoneNumberId,
          );
        } catch (err) {
          setDialogState({
            kind: 'error',
            message: err instanceof Error ? err.message : String(err),
          });
          setBusy(false);
          return;
        }
        sessionInfoRef.current = {
          wabaId,
          phoneNumberId,
        };
        setActivePhoneNumberId(phoneNumberId);
        void tryCompleteSignup();
      } else if (payload.event === 'CANCEL') {
        setBusy(false);
        toast.message('WhatsApp connection cancelled');
      } else if (payload.event === 'ERROR' && payload.data?.error_message) {
        setBusy(false);
        toast.error(`Embedded Signup error: ${payload.data.error_message}`);
      }
    }

    const receiveMessage = (event: MessageEvent) => {
      void handleMessage(event);
    };
    window.addEventListener('message', receiveMessage);
    return () => window.removeEventListener('message', receiveMessage);
  }, [persistSignupFinish, tryCompleteSignup]);

  const launchSignup = useCallback(async () => {
    if (!appId || !configId) {
      toast.error(
        'WhatsApp is not configured. Set VITE_META_APP_ID and VITE_META_EMBEDDED_SIGNUP_CONFIG_ID.',
      );
      return;
    }

    const isSignupActive =
      openConnectionAttempt &&
      (openConnectionAttempt.status === 'started' ||
        openConnectionAttempt.status === 'signup_finished' ||
        openConnectionAttempt.status === 'token_ready');

    if (isSignupActive) {
      toast.error(
        'You already have a WhatsApp connection in progress. Cancel it on the Channels page first.',
      );
      return;
    }

    try {
      await waitForFacebookSdk();
    } catch {
      toast.error('Facebook SDK not loaded yet. Please try again in a moment.');
      return;
    }

    setBusy(true);
    completingRef.current = false;
    setUserDismissed(false);
    sessionInfoRef.current = {};
    authCodeRef.current = undefined;
    connectionAttemptPromiseRef.current = undefined;
    setActivePhoneNumberId(undefined);

    connectionAttemptPromiseRef.current = beginConnectionAttempt({})
      .then((attemptId) => {
        setDialogState({ kind: 'connecting' });
        return attemptId;
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : String(err));
        setBusy(false);
        return undefined;
      });

    void requestAuthCodeAndComplete();
  }, [appId, beginConnectionAttempt, configId, openConnectionAttempt, requestAuthCodeAndComplete]);

  const handleDialogOpenChange = useCallback(
    (open: boolean) => {
      if (open) return;
      // Disallow dismissing while the action is in flight; the open-change
      // event still fires for ESC etc., so guard explicitly.
      const isSyncingOrConnected =
        openConnectionAttempt?.status === 'connected' ||
        openConnectionAttempt?.status === 'syncing';

      if (dialogState.kind === 'connecting' && !isSyncingOrConnected) {
        return;
      }
      setUserDismissed(true);
      setDialogState({ kind: 'closed' });
    },
    [dialogState.kind, openConnectionAttempt?.status],
  );

  if (!forceAllowConnect && whatsappChannel?.status === 'connected') {
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

        <Dialog
          open={dialogState.kind === 'error'}
          onOpenChange={handleDialogOpenChange}
        >
          <DialogContent>
            {dialogState.kind === 'error' ? (
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
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={launchSignup}
          disabled={busy}
        >
          {busy && dialogState.kind === 'closed' ? (
            <>
              <Spinner className="size-3" />
              Connect
            </>
          ) : (
            'Connect'
          )}
        </Button>
      </div>

      <Dialog
        open={dialogState.kind === 'error'}
        onOpenChange={handleDialogOpenChange}
      >
        <DialogContent>
          {dialogState.kind === 'error' ? (
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
