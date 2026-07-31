import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { useNavigate, useParams } from 'react-router';
import { usePostHog } from '@posthog/react';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import type { Doc, Id } from '../../convex/_generated/dataModel';
import {
  waitForFacebookSdk,
  type FBLoginResponse,
} from '@/lib/fbSdk';
import { resolveWhatsAppEmbeddedSignupIds } from '@/lib/whatsappEmbeddedSignup';
import { completeWhatsAppSignupFromCode } from '@/lib/whatsappSignupCompletion';
import { isOpenWhatsAppConnectionAttempt } from '@/lib/whatsappConnectionAttemptStatus';
import { useWhatsAppEmbeddedSignupEvents } from './useWhatsAppEmbeddedSignupEvents';

export type WhatsAppDialogState =
  | { kind: 'closed' }
  | { kind: 'connecting' }
  | { kind: 'error'; message: string };

export function useWhatsAppConnectionFlow({
  onConnected,
}: {
  onConnected?: () => void;
}) {
  const navigate = useNavigate();
  const posthog = usePostHog();
  const { agentId } = useParams();
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
  const [dialogState, setDialogState] = useState<WhatsAppDialogState>({
    kind: 'closed',
  });
  const [userDismissed, setUserDismissed] = useState(false);
  const connectionAttemptPromiseRef = useRef<
    Promise<Id<'whatsappConnectionAttempts'> | undefined> | undefined
  >(undefined);
  const completingRef = useRef(false);

  const signupIds = resolveWhatsAppEmbeddedSignupIds({
    appId: import.meta.env.VITE_META_APP_ID as string | undefined,
    configId: import.meta.env.VITE_META_EMBEDDED_SIGNUP_CONFIG_ID as
      | string
      | undefined,
  });
  const appId = signupIds?.appId;
  const configId = signupIds?.configId;

  const whatsappChannel = useMemo(() => {
    if (!channels) return undefined;
    if (openConnectionAttempt?.channelId) {
      return channels.find((channel) => channel._id === openConnectionAttempt.channelId);
    }
    if (openConnectionAttempt?.phoneNumberId) {
      return channels.find(
        (channel) =>
          channel.service === 'whatsapp' &&
          channel.phoneNumberId === openConnectionAttempt.phoneNumberId,
      );
    }
    return channels.find(
      (channel: Doc<'channels'>) => channel.service === 'whatsapp',
    );
  }, [channels, openConnectionAttempt]);

  useEffect(() => {
    const synchronization = window.setTimeout(() => {
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
              onClick: () => navigate(agentId ? `/dashboard/${agentId}/channels` : '/dashboard'),
            },
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
      if (!isOpenWhatsAppConnectionAttempt(openConnectionAttempt)) return;
      const connected =
        openConnectionAttempt.status === 'connected' ||
        openConnectionAttempt.status === 'syncing';
      if (connected && !userDismissed && dialogState.kind === 'connecting') {
        setDialogState({ kind: 'closed' });
        setUserDismissed(true);
        onConnected?.();
        posthog?.capture('channel_connected', { channel_type: 'whatsapp' });
        toast.success('WhatsApp connected successfully', {
          description: 'Chat syncing is in progress, will be completed soon.',
          duration: 15000,
          action: {
            label: 'See progress',
            onClick: () => navigate(agentId ? `/dashboard/${agentId}/channels` : '/dashboard'),
          },
        });
      } else if (!connected && !userDismissed && dialogState.kind !== 'connecting') {
        setDialogState({ kind: 'connecting' });
      }
    }, 0);
    return () => window.clearTimeout(synchronization);
  }, [agentId, dialogState.kind, navigate, onConnected, openConnectionAttempt, posthog, userDismissed, whatsappChannel?.status]);

  const finishWithCode = useCallback(
    async (code: string) => {
      if (completingRef.current) {
        console.info('[whatsapp-connect] completeSignup already running');
        return;
      }
      console.info('[whatsapp-connect] authorization code ready', {
        hasCode: code.length > 0,
        codeLength: code.length,
        hasAttemptPromise: connectionAttemptPromiseRef.current !== undefined,
      });
      completingRef.current = true;
      setDialogState({ kind: 'connecting' });
      try {
        const result = await completeWhatsAppSignupFromCode({
          code,
          attemptPromise: connectionAttemptPromiseRef.current,
          completeSignup,
        });
        console.info('[whatsapp-connect] completeSignup completed', result);
      } catch (error) {
        console.error('[whatsapp-connect] completeSignup failed', error);
        setDialogState({
          kind: 'error',
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        completingRef.current = false;
        setBusy(false);
      }
    },
    [completeSignup],
  );

  const requestAuthCode = useCallback(async () => {
    if (!appId || !configId) return;
    let facebook: NonNullable<typeof window.FB>;
    try {
      facebook = await waitForFacebookSdk();
      console.info('[whatsapp-connect] Facebook SDK ready');
    } catch (error) {
      console.error('[whatsapp-connect] Facebook SDK unavailable', error);
      toast.error('Facebook SDK not loaded yet. Please try again in a moment.');
      setBusy(false);
      return;
    }
    console.info('[whatsapp-connect] invoking FB.login', {
      appId,
      configId,
      responseType: 'code',
      featureType: 'whatsapp_business_app_onboarding',
    });
    facebook.login(
      (response: FBLoginResponse) => {
        const code = response.authResponse?.code;
        console.info('[whatsapp-connect] FB.login response', {
          status: response.status,
          hasCode: Boolean(code),
          codeLength: code?.length,
        });
        if (!code) {
          toast.error(
            response.status === 'unknown'
              ? 'Signup cancelled before completion.'
              : 'Did not receive an authorisation code.',
          );
          setBusy(false);
          return;
        }
        void finishWithCode(code);
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
  }, [appId, configId, finishWithCode]);

  const launchSignup = useCallback(async () => {
    console.info('[whatsapp-connect] signup launch requested', {
      agentId,
      hasAppId: Boolean(appId),
      hasConfigId: Boolean(configId),
      openAttemptId: openConnectionAttempt?._id,
      openAttemptStatus: openConnectionAttempt?.status,
    });
    if (!appId || !configId) {
      toast.error(
        'WhatsApp is not configured. Set VITE_META_APP_ID and VITE_META_EMBEDDED_SIGNUP_CONFIG_ID.',
      );
      return;
    }
    if (openConnectionAttempt && isOpenWhatsAppConnectionAttempt(openConnectionAttempt)) {
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
    console.info('[whatsapp-connect] creating connection attempt', {
      agentId,
    });
    connectionAttemptPromiseRef.current = beginConnectionAttempt({})
      .then((attemptId) => {
        console.info('[whatsapp-connect] connection attempt created', {
          attemptId,
        });
        setDialogState({ kind: 'connecting' });
        return attemptId;
      })
      .catch((error) => {
        console.error('[whatsapp-connect] connection attempt creation failed', error);
        toast.error(error instanceof Error ? error.message : String(error));
        setBusy(false);
        return undefined;
      });
    void requestAuthCode();
  }, [agentId, appId, beginConnectionAttempt, configId, openConnectionAttempt, requestAuthCode]);

  const handleDialogOpenChange = useCallback(
    (open: boolean) => {
      if (open) return;
      const connected =
        openConnectionAttempt?.status === 'connected' ||
        openConnectionAttempt?.status === 'syncing';
      if (dialogState.kind === 'connecting' && !connected) return;
      setUserDismissed(true);
      setDialogState({ kind: 'closed' });
    },
    [dialogState.kind, openConnectionAttempt?.status],
  );

  const onEmbeddedCancel = useCallback(() => {
    setBusy(false);
    toast.message('WhatsApp connection cancelled');
  }, []);
  const onEmbeddedError = useCallback((message: string) => {
    setBusy(false);
    setDialogState({ kind: 'error', message });
  }, []);
  useWhatsAppEmbeddedSignupEvents({
    onCancel: onEmbeddedCancel,
    onError: onEmbeddedError,
  });

  return {
    busy,
    dialogState,
    whatsappChannel,
    launchSignup,
    handleDialogOpenChange,
  };
}
