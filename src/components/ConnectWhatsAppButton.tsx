import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { CheckCircle2, CircleAlert, ExternalLink } from 'lucide-react';
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
  buildWhatsAppOnboardUrl,
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

const PAYMENT_METHOD_URL = 'https://business.facebook.com/wa/manage/home/';

function isSignupFinishEvent(event: SessionInfoMessage['event']) {
  return event === 'FINISH' || event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING';
}

export function ConnectWhatsAppButton({ onConnected, forceAllowConnect, disabled, children }: ConnectWhatsAppButtonProps) {
  const prepareSignup = useAction(api.whatsappEmbeddedSignup.prepareWhatsAppSignup);
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
  const sessionInfoRef = useRef<{ wabaId?: string; phoneNumberId?: string }>({});
  const embeddedSignupMessageRef = useRef<SessionInfoMessage | undefined>(undefined);
  const fbLoginResponseRef = useRef<FBLoginResponse | undefined>(undefined);
  const authCodeRef = useRef<string | undefined>(undefined);
  const connectionAttemptPromiseRef = useRef<
    Promise<Id<'whatsappConnectionAttempts'> | undefined> | undefined
  >(undefined);
  const [activePhoneNumberId, setActivePhoneNumberId] = useState<string | undefined>(undefined);
  const completingRef = useRef(false);
  const stagedSignupRef = useRef(false);

  const isPartnerWebhookReady = useCallback(
    (attempt: Doc<'whatsappConnectionAttempts'> | null | undefined) =>
      attempt?.status === 'connected' ||
      attempt?.status === 'syncing' ||
      Boolean(attempt?.partnerAppInstalledAt),
    [],
  );

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
      setDialogState({ kind: 'connecting' });
      if (openConnectionAttempt.phoneNumberId) {
        setActivePhoneNumberId(openConnectionAttempt.phoneNumberId);
      }
    }
  }, [openConnectionAttempt, whatsappChannel?.status, dialogState.kind, onConnected]);

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
    let waitingForWebhook = false;
    logWhatsAppConnect('complete', 'starting backend completeSignup', {
      wabaId,
      phoneNumberId,
      codeLength: code.length,
    });

    try {
      const attemptId = await connectionAttemptPromiseRef.current;

      if (!isPartnerWebhookReady(openConnectionAttempt)) {
        if (!stagedSignupRef.current) {
          await prepareSignup({
            wabaId,
            phoneNumberId,
            attemptId,
          });
          stagedSignupRef.current = true;
        }
        waitingForWebhook = true;
        logWhatsAppConnect('complete', 'staged signup - waiting for PARTNER_APP_INSTALLED webhook', {
          attemptStatus: openConnectionAttempt?.status,
        });
        return;
      }

      logWhatsAppConnect('complete', 'webhook received - exchanging authorization code for access token', {
        attemptStatus: openConnectionAttempt?.status,
      });
      const result = await completeSignup({
        code,
        wabaId,
        phoneNumberId,
        attemptId,
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
      if (!waitingForWebhook) {
        setBusy(false);
      }
    }
  }, [
    completeSignup,
    isPartnerWebhookReady,
    openConnectionAttempt,
    prepareSignup,
  ]);

  // After PARTNER_APP_INSTALLED, exchange the stored auth code for a token.
  useEffect(() => {
    if (!isPartnerWebhookReady(openConnectionAttempt)) return;
    if (!authCodeRef.current || !sessionInfoRef.current.wabaId) return;
    if (completingRef.current) return;
    logWhatsAppConnect('complete', 'PARTNER_APP_INSTALLED observed - starting token exchange');
    void tryCompleteSignup();
  }, [isPartnerWebhookReady, openConnectionAttempt, tryCompleteSignup]);

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
        console.log('response from FB login: ', response);
        fbLoginResponseRef.current = response;

        if (response.authResponse) {
          const code = response.authResponse.code;
          console.log('response: ', code);
        } else {
          console.log('response: ', response);
        }

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
          featureType: 'whatsapp_business_app_onboarding',
          sessionInfoVersion: '3',
        },
      },
    );
  }, [appId, configId, fbSession.ready, tryCompleteSignup]);

  // Meta posts WA_EMBEDDED_SIGNUP to the opener when the hosted onboard flow finishes.
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
        requestAuthCodeAndComplete();
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
  }, [requestAuthCodeAndComplete]);

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
    stagedSignupRef.current = false;
    sessionInfoRef.current = {};
    embeddedSignupMessageRef.current = undefined;
    fbLoginResponseRef.current = undefined;
    authCodeRef.current = undefined;
    connectionAttemptPromiseRef.current = undefined;
    setActivePhoneNumberId(undefined);

    const onboardUrl = buildWhatsAppOnboardUrl(appId, configId);
    logWhatsAppConnect('launch', 'opening embedded signup', {
      appId,
      configId,
      onboardUrl,
    });

    const popup = window.open(
      onboardUrl,
      'whatsapp_embedded_signup',
      'width=960,height=720,menubar=no,toolbar=no,location=no,status=no',
    );

    if (!popup) {
      logWhatsAppConnect('fallback', 'popup blocked - opening new tab', {
        onboardUrl,
      });
      window.open(onboardUrl, '_blank', 'noopener,noreferrer');
      toast.message('Complete WhatsApp setup in the new tab, then return here.');
      setBusy(false);
      return;
    }

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

    logWhatsAppConnect('launch', 'popup opened - waiting for WA_EMBEDDED_SIGNUP postMessage');
  }, [appId, beginConnectionAttempt, configId, openConnectionAttempt]);

  const handleDialogOpenChange = useCallback(
    (open: boolean) => {
      if (open) return;
      // Disallow dismissing while the action is in flight; the open-change
      // event still fires for ESC etc., so guard explicitly.
      if (dialogState.kind === 'connecting') {
        logWhatsAppConnect('complete', 'dialog open-change ignored while connecting');
        return;
      }
      logWhatsAppConnect('complete', 'dialog closed by user', {
        previousKind: dialogState.kind,
      });
      setDialogState({ kind: 'closed' });
    },
    [dialogState.kind],
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
              <SuccessState channel={whatsappChannel} />
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
            <SuccessState channel={whatsappChannel} />
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

function SuccessState({ channel }: { channel: Doc<'channels'> | undefined }) {
  const number =
    channel?.displayPhoneNumber ?? channel?.phoneNumberId ?? undefined;
  const syncStatus = getWhatsAppSyncStatus(channel);
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

      {syncStatus ? (
        <div className="flex flex-col gap-1 rounded-lg border border-border bg-muted/40 p-4 text-sm">
          <p className="font-medium">{syncStatus.label}</p>
          {syncStatus.detail ? (
            <p className="text-muted-foreground">{syncStatus.detail}</p>
          ) : null}
        </div>
      ) : null}

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
