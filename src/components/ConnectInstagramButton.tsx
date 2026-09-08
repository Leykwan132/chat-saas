import { useCallback, useMemo, useState } from 'react';
import { useAction, useQuery } from 'convex/react';
import { useParams } from 'react-router';
import { CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import type { Doc, Id } from '../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { waitForFacebookSdk } from '@/lib/fbSdk';
import {
  isCommentToInboxUserAllowed,
  isProductFeatureEnabled,
  useEnableCommentToInboxFeature,
} from '@/lib/posthogFeatureFlags';
import { useAuth } from '@/partnerAuth/AppAuthProvider';

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
  const { agentId } = useParams();
  const channels = useQuery(
    api.channels.listForCurrentOrg,
    agentId ? { agentId: agentId as Id<'agents'> } : 'skip',
  );
  const completeSignup = useAction(api.instagramEmbeddedSignup.completeSignup);
  const [busy, setBusy] = useState(false);
  const { user } = useAuth();
  const commentToInboxFeatureState = useEnableCommentToInboxFeature();
  const enableCommentWebhooks =
    isProductFeatureEnabled(commentToInboxFeatureState) &&
    isCommentToInboxUserAllowed(user?.email);
  const configId = import.meta.env.VITE_IG_CONFIG_ID as string | undefined;
  const codeExchangeRedirectUri =
    (import.meta.env.VITE_MESSENGER_CODE_EXCHANGE_REDIRECT_URI as
      | string
      | undefined)?.trim() || undefined;

  const instagramChannel = useMemo(
    () => channels?.find((c: Doc<'channels'>) => c.service === 'instagram'),
    [channels],
  );

  const launchSignup = useCallback(() => {
    if (!agentId) {
      toast.error('Open an agent’s Channels page to connect Instagram.');
      return;
    }
    if (!configId) {
      toast.error('Instagram is not configured. Set VITE_IG_CONFIG_ID.');
      return;
    }
    setBusy(true);
    void (async () => {
      try {
        const fb = await waitForFacebookSdk();
        fb.login(
          (response) => {
            void (async () => {
              try {
                const code = response.authResponse?.code;
                if (!code) {
                  toast.error('Instagram signup cancelled before completion.');
                  return;
                }
                await completeSignup({
                  agentId: agentId as Id<'agents'>,
                  code,
                  enableCommentWebhooks,
                  ...(codeExchangeRedirectUri
                    ? { redirectUri: codeExchangeRedirectUri }
                    : {}),
                });
                toast.success('Instagram account connected');
              } catch (error) {
                const message =
                  error instanceof Error ? error.message : String(error);
                toast.error(`Instagram connect failed: ${message}`);
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
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        toast.error(`Instagram connect failed: ${message}`);
        setBusy(false);
      }
    })();
  }, [
    agentId,
    codeExchangeRedirectUri,
    completeSignup,
    configId,
    enableCommentWebhooks,
  ]);

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
        disabled={busy || disabled || !agentId}
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
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={launchSignup}
      disabled={busy || disabled || !agentId}
    >
      {busy ? <Spinner className="size-3" /> : 'Connect'}
    </Button>
  );
}
