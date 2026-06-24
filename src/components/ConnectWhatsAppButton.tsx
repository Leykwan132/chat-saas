import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAction, useMutation, useQuery } from 'convex/react';
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
  waitForFacebookSdk,
  type FBLoginResponse,
} from '@/lib/fbSdk';
import {
  resolveWhatsAppEmbeddedSignupIds,
} from '@/lib/whatsappEmbeddedSignup';
import {
  logWhatsAppConnect,
  redactFacebookPayload,
} from '@/lib/whatsappConnectDebug';
import { getWhatsAppSyncStatus } from '@/lib/whatsappSyncStatus';
import {
  getWhatsAppConnectionAttemptStatus,
  isOpenWhatsAppConnectionAttempt,
} from '@/lib/whatsappConnectionAttemptStatus';

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

const PROGRESS_LABELS: Record<NonNullable<Doc<'channels'>['progressStep']>, string> = {
  linking: 'Forming a digital handshake...',
  subscribing: 'Tuning the frequencies...',
  registering: 'Whispering to the WhatsApp servers...',
  exchanging: 'Swapping secret decoder rings...',
  backfilling: 'Gathering the conversational gossip...',
};


function isSignupFinishEvent(event: SessionInfoMessage['event']) {
  return event === 'FINISH' || event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING';
}

export function ConnectWhatsAppButton({ onConnected, forceAllowConnect, disabled, children }: ConnectWhatsAppButtonProps) {
  const completeSignup = useAction(api.whatsappEmbeddedSignup.completeSignup);
  const beginConnectionAttempt = useMutation(
    api.whatsappEmbeddedSignup.beginConnectionAttempt,
  );
  const openConnectionAttempt = useQuery(
    api.whatsappEmbeddedSignup.getOpenConnectionAttempt,
    {},
  );
  const channels = useQuery(api.channels.listForCurrentOrg, {});
  const [busy, setBusy] = useState(false);
  const [dialogState, setDialogState] = useState<DialogState>({ kind: 'closed' });
  const [userDismissed, setUserDismissed] = useState(false);
  const sessionInfoRef = useRef<{ wabaId?: string; phoneNumberId?: string }>({});
  const embeddedSignupMessageRef = useRef<SessionInfoMessage | undefined>(undefined);
  const fbLoginResponseRef = useRef<FBLoginResponse | undefined>(undefined);
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
  const fbSession = useFacebookSession();

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
        setDialogState({ kind: 'success' });
        onConnected?.();
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
        if (!userDismissed && dialogState.kind !== 'success') {
          setDialogState({ kind: 'success' });
          onConnected?.();
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
  }, [openConnectionAttempt, whatsappChannel?.status, dialogState.kind, onConnected, userDismissed]);

  useEffect(() => {
    if (whatsappChannel) {
      logWhatsAppConnect('complete', 'channel state observed', {
        channelId: whatsappChannel._id,
        status: whatsappChannel.status,
        progressStep: whatsappChannel.progressStep,
        hasDisplayPhoneNumber: Boolean(whatsappChannel.displayPhoneNumber),
        activePhoneNumberId,
      });
    }
  }, [whatsappChannel, activePhoneNumberId]);

  useEffect(() => {
    if (!forceAllowConnect && whatsappChannel?.status === 'connected') {
      logWhatsAppConnect('complete', 'rendering connected-state button', {
        channelId: whatsappChannel._id,
        displayPhoneNumber: whatsappChannel.displayPhoneNumber,
      });
    }
  }, [forceAllowConnect, whatsappChannel]);

  useEffect(() => {
    logWhatsAppConnect('dialog', 'state changed', { kind: dialogState.kind });
  }, [dialogState.kind]);

  const tryCompleteSignup = useCallback(async () => {
    if (completingRef.current) {
      logWhatsAppConnect('complete', 'skipped - already completing');
      return;
    }

    const code = authCodeRef.current;
    const { wabaId, phoneNumberId } = sessionInfoRef.current;
    if (!code || !wabaId || !phoneNumberId) {
      logWhatsAppConnect('complete', 'skipped - missing prerequisites', {
        hasCode: Boolean(code),
        hasWabaId: Boolean(wabaId),
        hasPhoneNumberId: Boolean(phoneNumberId),
      });
      return;
    }

    completingRef.current = true;
    setDialogState({ kind: 'connecting' });
    logWhatsAppConnect('complete', 'starting backend completeSignup', {
      wabaId,
      phoneNumberId,
      codeLength: code.length,
    });

    try {
      const attemptId = await connectionAttemptPromiseRef.current;

      logWhatsAppConnect('complete', 'exchanging authorization code for access token', {
        attemptId,
      });
      const result = await completeSignup({
        code,
        applicationId: appId,
        wabaId,
        phoneNumberId,
        attemptId,
        flowType: 'existing_phone_number',
      });
      logWhatsAppConnect('complete', 'WhatsApp connected - Facebook responses', {
        embeddedSignupMessage: redactFacebookPayload(embeddedSignupMessageRef.current),
        fbLogin: redactFacebookPayload(fbLoginResponseRef.current),
        completeSignupResult: result,
      });
      logWhatsAppConnect('complete', 'backend completeSignup succeeded', { result });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logWhatsAppConnect('complete', 'backend completeSignup failed', { error: msg });
      setDialogState({ kind: 'error', message: msg });
    } finally {
      completingRef.current = false;
      setBusy(false);
    }
  }, [appId, completeSignup]);

  const requestAuthCodeAndComplete = useCallback(async () => {
    logWhatsAppConnect('auth-code', 'requestAuthCodeAndComplete called', {
      hasAppId: Boolean(appId),
      hasConfigId: Boolean(configId),
      fbReady: fbSession.ready,
      hasFbSdk: Boolean(window.FB),
      wabaId: sessionInfoRef.current.wabaId,
      phoneNumberId: sessionInfoRef.current.phoneNumberId,
    });

    if (!appId || !configId) {
      logWhatsAppConnect('auth-code', 'aborted - missing appId or configId');
      return;
    }

    let fb: NonNullable<typeof window.FB>;
    try {
      fb = await waitForFacebookSdk();
    } catch {
      logWhatsAppConnect('auth-code', 'aborted - Facebook SDK not ready');
      toast.error('Facebook SDK not loaded yet. Please try again in a moment.');
      setBusy(false);
      return;
    }

    fb.login(
      (response: FBLoginResponse) => {
        refreshFacebookLoginStatus();
        fbLoginResponseRef.current = response;

        const code = response.authResponse?.code;
        logWhatsAppConnect('auth-code', 'FB.login returned', {
          status: response.status,
          hasCode: Boolean(code),
        });
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
  }, [appId, configId, fbSession.ready, tryCompleteSignup]);

  // Meta posts WA_EMBEDDED_SIGNUP when the embedded signup flow finishes.
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

      logWhatsAppConnect('message', `WA_EMBEDDED_SIGNUP:${payload.event}`, {
        origin: event.origin,
        payload: redactFacebookPayload(payload),
      });

      if (isSignupFinishEvent(payload.event) && payload.data) {
        embeddedSignupMessageRef.current = payload;
        sessionInfoRef.current = {
          wabaId: payload.data.waba_id,
          phoneNumberId: payload.data.phone_number_id,
        };
        setActivePhoneNumberId(payload.data.phone_number_id);
        void tryCompleteSignup();
      } else if (payload.event === 'CANCEL') {
        logWhatsAppConnect('message', 'signup cancelled by user');
        setBusy(false);
        toast.message('WhatsApp connection cancelled');
      } else if (payload.event === 'ERROR' && payload.data?.error_message) {
        logWhatsAppConnect('message', 'embedded signup error', {
          error: payload.data.error_message,
        });
        setBusy(false);
        toast.error(`Embedded Signup error: ${payload.data.error_message}`);
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [tryCompleteSignup]);

  const launchSignup = useCallback(async () => {
    if (!appId || !configId) {
      logWhatsAppConnect('launch', 'aborted - missing appId or configId');
      toast.error(
        'WhatsApp is not configured. Set VITE_META_APP_ID and VITE_META_EMBEDDED_SIGNUP_CONFIG_ID.',
      );
      return;
    }

    if (
      openConnectionAttempt &&
      isOpenWhatsAppConnectionAttempt(openConnectionAttempt)
    ) {
      logWhatsAppConnect('launch', 'aborted - open connection attempt exists');
      toast.error(
        'You already have a WhatsApp connection in progress. Cancel it on the Channels page first.',
      );
      return;
    }

    try {
      await waitForFacebookSdk();
    } catch {
      logWhatsAppConnect('launch', 'aborted - Facebook SDK not ready');
      toast.error('Facebook SDK not loaded yet. Please try again in a moment.');
      return;
    }

    setBusy(true);
    completingRef.current = false;
    setUserDismissed(false);
    sessionInfoRef.current = {};
    embeddedSignupMessageRef.current = undefined;
    fbLoginResponseRef.current = undefined;
    authCodeRef.current = undefined;
    connectionAttemptPromiseRef.current = undefined;
    setActivePhoneNumberId(undefined);

    logWhatsAppConnect('launch', 'starting FB.login embedded signup', {
      appId,
      configId,
    });

    connectionAttemptPromiseRef.current = beginConnectionAttempt({})
      .then((attemptId) => {
        setDialogState({ kind: 'connecting' });
        return attemptId;
      })
      .catch((err) => {
        logWhatsAppConnect('launch', 'connection attempt tracking failed', {
          error: err instanceof Error ? err.message : String(err),
        });
        toast.error(err instanceof Error ? err.message : String(err));
        setBusy(false);
        return undefined;
      });

    void requestAuthCodeAndComplete();
    logWhatsAppConnect('launch', 'FB.login started - waiting for auth code and WA_EMBEDDED_SIGNUP postMessage');
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
        logWhatsAppConnect('complete', 'dialog open-change ignored while connecting');
        return;
      }
      logWhatsAppConnect('complete', 'dialog closed by user', {
        previousKind: dialogState.kind,
      });
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
              <ConnectingState
                channel={whatsappChannel}
                attempt={openConnectionAttempt ?? undefined}
              />
            ) : dialogState.kind === 'success' ? (
              <SuccessState />
            ) : dialogState.kind === 'error' ? (
              <ErrorState
                message={dialogState.message}
                onRetry={() => {
                  logWhatsAppConnect('dialog', 'retry requested from error state', {
                    errorMessage: dialogState.message,
                  });
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
            <SuccessState />
          ) : dialogState.kind === 'error' ? (
            <ErrorState
              message={dialogState.message}
              onRetry={() => {
                logWhatsAppConnect('dialog', 'retry requested from error state', {
                  errorMessage: dialogState.message,
                });
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

function ConnectingState({
  channel,
  attempt,
}: {
  channel: Doc<'channels'> | undefined;
  attempt?: Doc<'whatsappConnectionAttempts'>;
}) {
  const attemptStatus = attempt
    ? getWhatsAppConnectionAttemptStatus(attempt, channel)
    : null;
  const syncStatus = getWhatsAppSyncStatus(channel);
  const label =
    attemptStatus?.label ??
    syncStatus?.label ??
    (channel?.progressStep && PROGRESS_LABELS[channel.progressStep]
      ? PROGRESS_LABELS[channel.progressStep]
      : 'Setting things up');
  const detail = attemptStatus?.detail ?? syncStatus?.detail;

  return (
    <div className="flex flex-col items-center gap-5 py-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
      <div className="flex flex-col items-center gap-2">
        <DialogTitle className="text-base">Connecting your WhatsApp account</DialogTitle>
        <DialogDescription asChild>
          <div className="flex flex-col gap-1">
            <Shimmer duration={2} spread={3}>
              {label}
            </Shimmer>
            {detail ? (
              <span className="text-xs text-muted-foreground">{detail}</span>
            ) : null}
          </div>
        </DialogDescription>
      </div>
    </div>
  );
}

function SuccessState() {
  return (
    <div className="flex flex-col items-center gap-5 py-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="size-6" />
      </div>
      <div className="flex flex-col items-center gap-2">
        <DialogTitle className="text-base font-semibold">WhatsApp connected</DialogTitle>
        <DialogDescription>
          Syncing is in progress, will be completed soon.
        </DialogDescription>
      </div>
      <div className="mt-2 w-full">
        <DialogClose asChild>
          <Button variant="outline" className="w-full">
            Dismiss
          </Button>
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
