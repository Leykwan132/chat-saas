import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { useParams, useSearchParams } from 'react-router';
import { usePostHog } from '@posthog/react';
import {
  Loader2,
  RefreshCw,
  Trash2,
  MoreHorizontal,
} from 'lucide-react';
import { SiWhatsapp } from 'react-icons/si';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import type { Doc, Id } from '../../convex/_generated/dataModel';
import { formatPrefixedRelativeAge } from '@/lib/formatRelativeAge';
import { PageTitleBlock } from '@/components/PageTitleBlock';
import { Button } from '@/components/ui/button';
import { useUpgradeModal } from '@/components/upgradeModalContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

import { cn } from '@/lib/utils';
import { AvailableChannelCard } from '@/components/channels/AvailableChannelCard';
import {
  SavedConversationStatus,
} from '@/components/channels/ChannelReadyStatus';
import { WhatsAppSyncSummary } from '@/components/channels/WhatsAppSyncSummary';
import { WhatsAppConnectingAction } from '@/components/channels/WhatsAppConnectionFeedback';
import { WebWidgetDetailsDialog } from '@/components/channels/WebWidgetDetailsDialog';
import { WebsiteChannelCard } from '@/components/channels/WebsiteChannelCard';
import { WHATSAPP_OAUTH_REDIRECT_CODE_KEY } from '@/lib/whatsappEmbeddedSignup';
import {
  isOpenWhatsAppConnectionAttempt,
} from '@/lib/whatsappConnectionAttemptStatus';
import {
  getChannelServiceMeta,
  isSupportedChannelService,
  type SupportedChannelService,
} from '@/lib/channelServiceMeta';
import { getCustomerSafeMessengerConnectionFailureMessage } from '@/lib/messengerConnectionFeedback';

const CONNECTABLE_SERVICES: SupportedChannelService[] = [
  'whatsapp',
  'instagram',
  'messenger',
];

type ChannelDoc = Doc<'channels'>;
type ChannelWithConversationCount = ChannelDoc & { conversationCount?: number };
type WhatsAppConnectionAttemptDoc = Doc<'whatsappConnectionAttempts'>;

const STATUS_META: Record<
  ChannelDoc['status'],
  { label: string; tone: 'success' | 'warning' | 'muted' | 'danger' }
> = {
  connected: { label: 'Connected', tone: 'success' },
  pending: { label: 'Pending', tone: 'warning' },
  disconnected: { label: 'Disconnected', tone: 'muted' },
  error: { label: 'Error', tone: 'danger' },
};

// Picks the most user-friendly identifier we have for a channel row.
// WhatsApp surfaces the phone number; Instagram its handle; Messenger its
// Page name. Falls back to whichever Meta id we know.
function channelIdentifier(channel: ChannelDoc): string {
  if (channel.service === 'web') {
    return 'Website';
  }
  if (!isSupportedChannelService(channel.service)) {
    return getChannelServiceMeta(channel.service).label;
  }

  switch (channel.service) {
    case 'whatsapp':
      return (
        channel.displayPhoneNumber ??
        channel.phoneNumberId ??
        channel.wabaId ??
        'No identifier yet'
      );
    case 'instagram':
      return channel.displayUsername ?? channel.igUserId ?? 'No identifier yet';
    case 'messenger':
      return channel.displayUsername ?? channel.pageId ?? 'No identifier yet';
  }
}

// Static OAuth callbacks redirect back with `?instagram=...` or
// `?messenger=...`. Toast once and strip query params so refresh does not
// replay. Multi-Page Messenger pick (`?messenger=pick`) is handled inside
// ConnectMessengerButton.
//
// Static OAuth callbacks land on Channels with `?instagram=…`, `?messenger=…`,
// or `?whatsapp=…`. WhatsApp redirect carries a one-time code we stash in
// sessionStorage for ConnectWhatsAppButton to finish completeSignup.
function useMetaChannelCallbackParams() {
  const [searchParams, setSearchParams] = useSearchParams();
  const posthog = usePostHog();
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    const instagram = searchParams.get('instagram');
    const messenger = searchParams.get('messenger');
    const whatsapp = searchParams.get('whatsapp');

    if (whatsapp === 'redirect') {
      const code = searchParams.get('code');
      const key = code ? `whatsapp:redirect:${code.slice(0, 12)}` : 'whatsapp:redirect';
      if (handledRef.current === key) return;
      handledRef.current = key;
      if (code) {
        sessionStorage.setItem(WHATSAPP_OAUTH_REDIRECT_CODE_KEY, code);
        toast.message('WhatsApp authorization received. Finishing connection…');
      } else {
        toast.error('WhatsApp redirect was missing an authorization code.');
      }
      const next = new URLSearchParams(searchParams);
      next.delete('whatsapp');
      next.delete('code');
      setSearchParams(next, { replace: true });
      return;
    }

    if (whatsapp === 'error') {
      const key = 'whatsapp:error';
      if (handledRef.current === key) return;
      handledRef.current = key;
      const message = searchParams.get('message') ?? 'Unknown error';
      toast.error(`WhatsApp connect failed: ${message}`);
      const next = new URLSearchParams(searchParams);
      next.delete('whatsapp');
      next.delete('message');
      setSearchParams(next, { replace: true });
      return;
    }

    if (instagram === 'connected' || instagram === 'error') {
      const key = `instagram:${instagram}`;
      if (handledRef.current === key) return;
      handledRef.current = key;
      if (instagram === 'connected') {
        posthog?.capture('channel_connected', { channel_type: 'instagram' });
        toast.success('Instagram account connected');
      } else {
        const message = searchParams.get('message') ?? 'Unknown error';
        toast.error(`Instagram connect failed: ${message}`);
      }
      const next = new URLSearchParams(searchParams);
      next.delete('instagram');
      next.delete('message');
      setSearchParams(next, { replace: true });
      return;
    }

    if (messenger === 'connected' || messenger === 'error') {
      const key = `messenger:${messenger}`;
      if (handledRef.current === key) return;
      handledRef.current = key;
      if (messenger === 'connected') {
        posthog?.capture('channel_connected', { channel_type: 'messenger' });
        toast.success('Messenger account connected');
      } else {
        toast.error(
          getCustomerSafeMessengerConnectionFailureMessage(
            searchParams.get('message'),
          ),
        );
      }
      const next = new URLSearchParams(searchParams);
      next.delete('messenger');
      next.delete('message');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);
}

export default function ChannelsPage() {
  const { agentId } = useParams();
  const channels = useQuery(
    api.channels.listForCurrentOrg,
    agentId ? { agentId: agentId as Id<'agents'> } : {},
  );
  const openWhatsAppAttempt = useQuery(
    api.whatsappEmbeddedSignup.getOpenConnectionAttempt,
    {},
  );
  const isWhatsAppSignupActive = useMemo(() => {
    return (
      openWhatsAppAttempt != null &&
      (openWhatsAppAttempt.status === 'started' ||
        openWhatsAppAttempt.status === 'signup_finished' ||
        openWhatsAppAttempt.status === 'token_ready')
    );
  }, [openWhatsAppAttempt]);
  const cancelWhatsAppAttempt = useMutation(
    api.whatsappEmbeddedSignup.cancelConnectionAttempt,
  );
  const planAndUsage = useQuery(api.plans.getPlanAndUsage, {});
  const ensureDefaultAgentId = useMutation(api.channels.ensureDefaultAgentId);
  const { openUpgradeModal } = useUpgradeModal();
  useMetaChannelCallbackParams();

  const [webDetailsOpen, setWebDetailsOpen] = useState(false);
  const [disconnectingChannelIds, setDisconnectingChannelIds] = useState<
    Set<string>
  >(new Set());

  const connectedChannelsList = useMemo(
    () =>
      (channels ?? []).filter(
        (c: ChannelDoc) =>
          c.status !== 'disconnected' &&
          !disconnectingChannelIds.has(c._id as string),
      ),
    [channels, disconnectingChannelIds],
  );

  const externalConnectedChannelsList = useMemo(
    () => connectedChannelsList.filter(
      (channel) => channel.service !== 'web' && channel.service !== 'avatar',
    ),
    [connectedChannelsList],
  );
  const connectedByService = useMemo(() => {
    const map = new Map<SupportedChannelService, ChannelDoc>();
    for (const channel of externalConnectedChannelsList) {
      if (!isSupportedChannelService(channel.service)) continue;
      if (!map.has(channel.service)) {
        map.set(channel.service, channel);
      }
    }
    return map;
  }, [externalConnectedChannelsList]);
  const activeCount = externalConnectedChannelsList.length;
  const channelLimit = planAndUsage?.channelLimit ?? 1;
  const limitReached = activeCount >= channelLimit;
  const showPendingWhatsApp =
    openWhatsAppAttempt != null &&
    ((isOpenWhatsAppConnectionAttempt(openWhatsAppAttempt) &&
      openWhatsAppAttempt.status !== 'connected' &&
      openWhatsAppAttempt.status !== 'syncing') ||
      openWhatsAppAttempt.status === 'error');
  const openAttemptChannel = useMemo(() => {
    if (!channels || !openWhatsAppAttempt) return undefined;
    if (openWhatsAppAttempt.channelId) {
      return channels.find((c) => c._id === openWhatsAppAttempt.channelId);
    }
    if (openWhatsAppAttempt.phoneNumberId) {
      return channels.find(
        (c) =>
          c.service === 'whatsapp' &&
          c.phoneNumberId === openWhatsAppAttempt.phoneNumberId,
      );
    }
    return undefined;
  }, [channels, openWhatsAppAttempt]);

  useEffect(() => {
    if (!channels) return;
    queueMicrotask(() => {
      setDisconnectingChannelIds((prev) => {
        const next = new Set(prev);
        for (const id of prev) {
          const ch = channels.find((c: ChannelDoc) => (c._id as string) === id);
          if (!ch || ch.status === 'disconnected') next.delete(id);
        }
        return next;
      });
    });
  }, [channels]);

  useEffect(() => {
    if (!agentId || !channels) return;
    for (const ch of channels) {
      if (ch.status === 'connected' && !ch.defaultAgentId) {
        void ensureDefaultAgentId({
          channelId: ch._id,
          agentId: agentId as Id<'agents'>,
        });
      }
    }
  }, [agentId, channels, ensureDefaultAgentId]);

  return (
    <div className="flex w-full flex-col gap-6">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <PageTitleBlock
          title="Channels"
          description="Connect the platforms where customers can reach your agent."
        />
      </header>

      <section className="flex flex-col gap-4 animate-fade-in">
        <div className="flex flex-wrap gap-2">
          <WebsiteChannelCard
            agentId={agentId}
            onShowDetails={() => setWebDetailsOpen(true)}
          />

          {showPendingWhatsApp && openWhatsAppAttempt ? (
            <PendingWhatsAppConnectionCard
              attempt={openWhatsAppAttempt}
              channel={openAttemptChannel}
              onCancel={async () => {
                try {
                  await cancelWhatsAppAttempt({
                    attemptId: openWhatsAppAttempt._id,
                  });
                  toast.message('WhatsApp connection cancelled');
                } catch (err) {
                  toast.error(
                    err instanceof Error ? err.message : String(err),
                  );
                }
              }}
            />
          ) : null}

          {CONNECTABLE_SERVICES.map((service) => {
            if (service === 'whatsapp' && showPendingWhatsApp) {
              return null;
            }

            const channel = connectedByService.get(service);
            if (channel) {
              return (
                <ConnectedChannelCard
                  key={channel._id}
                  agentId={agentId}
                  channel={channel}
                  onDisconnectBegin={() => {
                    setDisconnectingChannelIds((s) =>
                      new Set(s).add(channel._id as string),
                    );
                  }}
                  onDisconnectUndone={() => {
                    setDisconnectingChannelIds((s) => {
                      const next = new Set(s);
                      next.delete(channel._id as string);
                      return next;
                    });
                  }}
                  onShowWebDetails={() => setWebDetailsOpen(true)}
                />
              );
            }

            return (
              <AvailableChannelCard
                key={service}
                service={service}
                disabled={
                  limitReached ||
                  (service === 'whatsapp' && isWhatsAppSignupActive)
                }
                onLimitReached={openUpgradeModal}
              />
            );
          })}
        </div>
      </section>

      <WebWidgetDetailsDialog
        open={webDetailsOpen}
        onOpenChange={setWebDetailsOpen}
        agentId={agentId}
      />

    </div>
  );
}
export function PendingWhatsAppConnectionCard({
  attempt,
  channel,
  onCancel,
}: {
  attempt: WhatsAppConnectionAttemptDoc;
  channel: ChannelDoc | undefined;
  onCancel: () => void | Promise<void>;
}) {
  const [cancelling, setCancelling] = useState(false);
  const label =
    channel?.displayPhoneNumber ??
    attempt.phoneNumberId ??
    attempt.wabaId ??
    'WhatsApp';

  return (
    <div
      className={cn(
        'flex size-56 flex-col rounded-lg border border-border bg-card p-3.5',
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col justify-between">
        <div>
          <div className="flex items-center gap-2">
            <SiWhatsapp className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <h3 className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
              {label}
            </h3>
          </div>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            {getChannelServiceMeta('whatsapp').description}
          </p>
        </div>

        <WhatsAppConnectingAction
          stopping={cancelling}
          onStop={() => {
            setCancelling(true);
            void Promise.resolve(onCancel()).finally(() => setCancelling(false));
          }}
        />
      </div>
    </div>
  );
}

function ConnectedChannelCard({
  agentId,
  channel,
  onDisconnectBegin,
  onDisconnectUndone,
  onShowWebDetails,
}: {
  agentId?: string;
  channel: ChannelDoc;
  onDisconnectBegin: () => void;
  onDisconnectUndone: () => void;
  onShowWebDetails: () => void;
}) {
  const meta = getChannelServiceMeta(channel.service);
  const Icon = meta.icon;
  const status = STATUS_META[channel.status];
  const currentIconColor = meta.iconColor;

  const disconnect = useMutation(api.channels.disconnect);
  const enqueueSyncConversations = useAction(
    api.channels.enqueueSyncConversations,
  );
  const [busy, setBusy] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [acknowledgedDataLoss, setAcknowledgedDataLoss] = useState(false);

  const channelName = channelIdentifier(channel);
  const handleDisconnectOpenChange = useCallback((open: boolean) => {
    setDisconnectOpen(open);
    if (!open) {
      setAcknowledgedDataLoss(false);
    }
  }, [setDisconnectOpen, setAcknowledgedDataLoss]);

  const confirmDisconnect = useCallback(async () => {
    onDisconnectBegin();
    setBusy(true);
    try {
      await disconnect({ channelId: channel._id });
      toast.success('Channel disconnected');
      handleDisconnectOpenChange(false);
    } catch (err) {
      onDisconnectUndone();
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }, [disconnect, channel._id, onDisconnectBegin, onDisconnectUndone, handleDisconnectOpenChange]);

  const canSyncConversations =
    channel.status === 'connected' &&
    (channel.service === 'instagram' || channel.service === 'messenger');

  const handleSyncConversations = useCallback(async () => {
    setSyncBusy(true);
    try {
      await enqueueSyncConversations({ channelId: channel._id });
      toast.success('Conversation sync queued');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    } finally {
      setSyncBusy(false);
    }
  }, [enqueueSyncConversations, channel._id]);

  return (
    <div
      className={cn(
        'group flex size-56 flex-col rounded-lg border border-border bg-card p-3.5 transition-colors relative',
        'hover:border-foreground/20 hover:bg-muted/30',
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Icon className={cn("size-4 shrink-0", currentIconColor)} />
            <h3 className="min-w-0 flex-1 truncate text-sm font-medium text-foreground" title={channelName}>
              {channelName}
            </h3>
          </div>

          {/* Subtitle / Description / Status */}
          <div className="mt-1">
            {channel.status === 'connected' ? (
              <p className="text-[11px] leading-snug text-muted-foreground">
                {formatPrefixedRelativeAge('Connected', channel.createdAt)}
              </p>
            ) : (
              <div className="flex items-start justify-between gap-2 mt-1.5">
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {channel.status === 'pending' ? (
                    <Loader2 className="size-1.5 shrink-0 animate-spin text-amber-500" aria-hidden />
                  ) : (
                    <span className="size-1.5 shrink-0 rounded-full bg-red-500" aria-hidden />
                  )}
                  {status.label}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Details */}
        <div className="mt-auto flex items-center justify-between gap-2 w-full">
          <div className="min-w-0 flex-1">
            {channel.status === 'connected' ? (
              channel.service === 'web' ? (
                <div className="flex w-full justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 rounded-md px-2.5 text-[11px] font-medium shadow-none"
                    disabled={!agentId}
                    onClick={onShowWebDetails}
                  >
                    Setup
                  </Button>
                </div>
              ) : channel.service === 'whatsapp' ? (
                <WhatsAppSyncSummary channel={channel} />
              ) : (
                <SavedConversationStatus
                  conversationCount={
                    (channel as ChannelWithConversationCount).conversationCount ?? 0
                  }
                />
              )
            ) : channel.status === 'error' && channel.lastError ? (
              <p className="text-[11px] leading-snug text-destructive line-clamp-2" title={channel.lastError}>
                {channel.lastError}
              </p>
            ) : (
              <p className="text-[11px] leading-snug text-muted-foreground truncate">
                Setting up connection...
              </p>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground hover:text-foreground h-6 w-6 rounded-md p-0 shrink-0"
                disabled={busy || syncBusy}
                aria-label="Channel actions"
              >
                <MoreHorizontal className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[140px]">
              {canSyncConversations && (
                <DropdownMenuItem
                  onClick={() => void handleSyncConversations()}
                  disabled={syncBusy}
                >
                  <RefreshCw className={cn("size-3.5 mr-2", syncBusy && 'animate-spin')} />
                  <span>Refresh</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                variant="destructive"
                onClick={() => handleDisconnectOpenChange(true)}
              >
                <Trash2 className="size-3.5 mr-2" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Dialog open={disconnectOpen} onOpenChange={handleDisconnectOpenChange}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-semibold">Disconnect {channelName}?</DialogTitle>
            <DialogDescription>
              All conversations will be deleted and new messages will stop.
            </DialogDescription>
          </DialogHeader>
          <label
            htmlFor={`disconnect-ack-${channel._id}`}
            className={cn(
              'flex cursor-pointer items-start gap-3 rounded-lg border border-border px-3 py-3 text-sm leading-snug',
              'hover:bg-muted/40',
            )}
          >
            <input
              id={`disconnect-ack-${channel._id}`}
              type="checkbox"
              checked={acknowledgedDataLoss}
              onChange={(e) => setAcknowledgedDataLoss(e.target.checked)}
              className="mt-0.5 size-4 shrink-0 rounded border-border accent-destructive"
            />
            <span className="text-foreground">
              I understand that disconnecting this channel will permanently delete all of its conversations.
            </span>
          </label>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => handleDisconnectOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busy || !acknowledgedDataLoss}
              onClick={() => void confirmDisconnect()}
            >
              {busy ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Disconnecting…
                </>
              ) : (
                'Disconnect'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
