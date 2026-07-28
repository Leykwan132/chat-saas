import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { Link, useParams, useSearchParams } from 'react-router';
import { usePostHog } from '@posthog/react';
import {
  Check,
  CircleAlert,
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
import { Button } from '@/components/ui/button';
import { useManagePlan } from '@/components/billing/managePlanContext';
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

import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { AvailableChannelCard } from '@/components/channels/AvailableChannelCard';
import { WebWidgetDetailsDialog } from '@/components/channels/WebWidgetDetailsDialog';
import { WebsiteChannelCard } from '@/components/channels/WebsiteChannelCard';
import { AnimatedGridPattern } from '@/components/ui/animated-grid-pattern';
import { getWhatsAppHistoryDisplayProgress, getWhatsAppSyncStatus } from '@/lib/whatsappSyncStatus';
import { WHATSAPP_OAUTH_REDIRECT_CODE_KEY } from '@/lib/whatsappEmbeddedSignup';
import {
  getWhatsAppConnectionAttemptStatus,
  isOpenWhatsAppConnectionAttempt,
} from '@/lib/whatsappConnectionAttemptStatus';
import {
  getChannelServiceMeta,
  isSupportedChannelService,
  type SupportedChannelService,
} from '@/lib/channelServiceMeta';

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
        const message = searchParams.get('message') ?? 'Unknown error';
        toast.error(`Messenger connect failed: ${message}`);
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
  const channels = useQuery(api.channels.listForCurrentOrg, {});
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
  const { openManagePlan } = useManagePlan();
  useMetaChannelCallbackParams();

  const [webDetailsOpen, setWebDetailsOpen] = useState(false);
  const [disconnectingChannelIds, setDisconnectingChannelIds] = useState<
    Set<string>
  >(new Set());
  const [isLifecycleGuideOpen, setIsLifecycleGuideOpen] = useState(false);
  const [isCoexistenceGuideOpen, setIsCoexistenceGuideOpen] = useState(false);

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
    <div className="flex w-full flex-col gap-8">
      <header className="flex flex-col justify-between gap-4 border-b border-border pb-6 md:flex-row md:items-end">
        <div>
          <h1 className="m-0 text-3xl font-semibold tracking-tight text-foreground">Channels</h1>
        </div>
      </header>

      {/* Guides section styled exactly like BroadcastPage */}
      <section className="flex flex-col gap-4 animate-fade-in">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Guides</h2>
        <div className="flex flex-wrap items-end gap-6 max-w-[920px]">
          <BookCard
            tag="Channels"
            title="How channels work"
            onClick={() => setIsLifecycleGuideOpen(true)}
          />

          <BookCard
            tag="WhatsApp"
            title="Mobile coexistence"
            onClick={() => setIsCoexistenceGuideOpen(true)}
          />
        </div>
      </section>

      <section className="flex flex-col gap-4 animate-fade-in">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Available channels</h2>
          </div>
          <Separator className="mt-3" />
        </div>

        <div className="flex flex-wrap gap-2 mt-2">
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
                onLimitReached={openManagePlan}
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

      {/* Guide Dialogs */}
      <ChannelLifecycleGuideDialog
        open={isLifecycleGuideOpen}
        onOpenChange={setIsLifecycleGuideOpen}
      />

      <WhatsAppCoexistenceGuideDialog
        open={isCoexistenceGuideOpen}
        onOpenChange={setIsCoexistenceGuideOpen}
      />
    </div>
  );
}

function WhatsAppReadyStatus({ label }: { label: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5">
      <span className="inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-800">
        <Check className="size-2.5 text-emerald-100" strokeWidth={2.5} aria-hidden />
      </span>
      <span className="truncate text-[11px] font-medium text-foreground">{label}</span>
    </span>
  );
}

function PendingWhatsAppConnectionCard({
  attempt,
  channel,
  onCancel,
}: {
  attempt: WhatsAppConnectionAttemptDoc;
  channel: ChannelDoc | undefined;
  onCancel: () => void | Promise<void>;
}) {
  const status = getWhatsAppConnectionAttemptStatus(attempt, channel);
  const [cancelling, setCancelling] = useState(false);
  const label =
    channel?.displayPhoneNumber ??
    attempt.phoneNumberId ??
    attempt.wabaId ??
    'WhatsApp';

  return (
    <div
      className={cn(
        'flex size-56 flex-col rounded-lg border border-dashed border-amber-500/40 bg-amber-500/5 p-3.5',
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
          <div className="mt-2 flex items-start gap-2">
            {status.showCheck ? (
              <WhatsAppReadyStatus label={status.label} />
            ) : status.spinning ? (
              <>
                <Loader2
                  className="mt-0.5 size-3.5 shrink-0 animate-spin text-amber-600 dark:text-amber-400"
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="text-[11px] font-medium leading-snug text-foreground">
                    {status.label}
                  </p>
                </div>
              </>
            ) : (
              <>
                <CircleAlert
                  className="mt-0.5 size-3.5 shrink-0 text-destructive"
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="text-[11px] font-medium leading-snug text-foreground">
                    {status.label}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3 h-7 w-full text-xs"
          disabled={cancelling}
          onClick={() => {
            setCancelling(true);
            void Promise.resolve(onCancel()).finally(() => setCancelling(false));
          }}
        >
          {cancelling ? (
            <>
              <Loader2 className="size-3 animate-spin" />
              Cancelling…
            </>
          ) : (
            'Cancel connection'
          )}
        </Button>
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
  const whatsappSyncStatus =
    channel.service === 'whatsapp' ? getWhatsAppSyncStatus(channel) : null;
  const isSyncing =
    channel.service === 'whatsapp' &&
    (channel.historySyncStatus === 'requested' ||
      channel.historySyncStatus === 'syncing' ||
      channel.contactSyncStatus === 'requested' ||
      channel.contactSyncStatus === 'syncing');

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
              ) : whatsappSyncStatus ? (
                <div className="text-[11px] leading-snug space-y-1.5 w-full">
                  {whatsappSyncStatus.showCheck ? (
                    <WhatsAppReadyStatus label={whatsappSyncStatus.label} />
                  ) : (
                    <p className="font-medium text-foreground truncate">
                      {whatsappSyncStatus.label}
                    </p>
                  )}
                  {isSyncing && (
                    <Progress
                      value={getWhatsAppHistoryDisplayProgress(channel)}
                      className={cn(
                        "h-1.5 w-full",
                        (channel.contactSyncStatus === 'requested' || channel.contactSyncStatus === 'syncing') &&
                          channel.historySyncStatus !== 'syncing' &&
                          "animate-pulse bg-emerald-500/10"
                      )}
                    />
                  )}
                  {!isSyncing && whatsappSyncStatus.detail ? (
                    <p className="text-muted-foreground line-clamp-2">
                      {whatsappSyncStatus.detail}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="text-[11px] leading-snug text-muted-foreground font-medium truncate">
                  {(channel as ChannelWithConversationCount).conversationCount ?? 0} conversations saved
                </p>
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

// ──────────────────────────────────────────────────────────────────────────
// Guides Helper Components (BookCard & Guide Dialogs)
// ──────────────────────────────────────────────────────────────────────────

interface BookCardProps {
  tag: string;
  title: React.ReactNode;
  onClick?: () => void;
  to?: string;
  disabled?: boolean;
  isDark?: boolean;
}

function BookCard({ tag, title, onClick, to, disabled, isDark }: BookCardProps) {
  const cardContent = (
    <>
      {/* Book Body (Inside Pages/Back) */}
      <div className="absolute inset-0 rounded-r-[14px] rounded-l-sm bg-white dark:bg-[#1a1a1a] border border-neutral-200/80 dark:border-neutral-800/80 shadow-inner z-0 transition-transform duration-500 ease-out group-hover:translate-x-1.5" />

      {/* Front Cover */}
      <div 
        style={{ transformOrigin: 'left center', transformStyle: 'preserve-3d' }}
        className={`absolute inset-0 rounded-r-[14px] rounded-l-sm border pl-[25px] pr-3.5 py-3.5 flex flex-col justify-between transition-transform duration-500 ease-out group-hover:[transform:rotateY(-24deg)] z-20 shadow-md group-hover:shadow-lg origin-left ${
          isDark 
            ? 'bg-neutral-950 dark:bg-black border-neutral-900 text-white' 
            : 'bg-[#fafafa] dark:bg-[#202020] border-neutral-200/80 dark:border-neutral-800/80 text-neutral-800 dark:text-neutral-100'
        }`}
      >
        <div className="flex flex-col gap-2">
          {/* App Logo */}
          <img 
            src="/icon.svg" 
            className={`size-5 shrink-0 ${isDark ? 'invert' : 'dark:invert'}`} 
            alt="App Logo" 
          />
          <span className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[9px] font-semibold border ${
            isDark 
              ? 'bg-neutral-900 text-neutral-400 border-neutral-800/50' 
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border-neutral-200/30 dark:border-neutral-700/30'
          }`}>
            {tag}
          </span>
        </div>
        <h3 className={`text-xs font-semibold tracking-tight leading-tight ${isDark ? 'text-white' : 'text-neutral-850 dark:text-neutral-100'}`}>
          {title}
        </h3>

        {/* Binder / spine crease */}
        <div className={`absolute left-0 top-0 bottom-0 w-[17px] rounded-l-sm bg-gradient-to-r pointer-events-none ${
          isDark 
            ? 'from-white/[0.04] via-transparent to-black/[0.3]' 
            : 'from-black/[0.08] via-transparent to-black/[0.12] dark:from-white/[0.03] dark:to-black/[0.2]'
        }`} />
        <div className={`absolute left-[17px] top-0 bottom-0 w-[1px] pointer-events-none ${
          isDark ? 'bg-neutral-800/80' : 'bg-neutral-300/60 dark:bg-neutral-800/60'
        }`} />
        <div className={`absolute left-[18px] top-0 bottom-0 w-[1px] pointer-events-none ${
          isDark ? 'bg-white/[0.02]' : 'bg-white/50 dark:bg-white/[0.02]'
        }`} />
      </div>
    </>
  );

  if (to) {
    return (
      <Link 
        to={to} 
        className={`group relative select-none w-[125px] h-[162px] [perspective:1000px] block ${disabled ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
      >
        {cardContent}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group relative select-none w-[125px] h-[162px] [perspective:1000px] text-left block ${disabled ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
    >
      {cardContent}
    </button>
  );
}

interface ChannelLifecycleGuideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ChannelLifecycleGuideDialog({ open, onOpenChange }: ChannelLifecycleGuideDialogProps) {
  const points = [
    'Secure Token Exchange: Long-lived platform credentials are encrypted and stored safely.',
    'Webhook Handlers: Real-time subscriptions deliver customer messages instantly to our servers.',
    'AI Auto-Response: Inbound messages trigger agent prompt processing to reply instantly.',
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,640px)] flex-col gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-[880px]">
        <DialogTitle className="sr-only">How channels work</DialogTitle>
        <div className="w-full flex flex-col h-[min(440px,calc(90vh-5.5rem))] min-h-[400px]">
          <div className="flex h-full w-full flex-col overflow-hidden md:flex-row md:items-stretch">
            <div className="flex min-h-0 flex-1 flex-col justify-center gap-4 overflow-y-auto px-6 py-6 sm:px-10 md:overflow-visible md:py-10">
              <div className="flex flex-col gap-2.5">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  How channels work
                </h2>
                <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                  Our system establishes a direct, real-time integration with Meta platforms (WhatsApp, Instagram, and Messenger) to power your workspace inbox.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Under the hood
                </h3>
                <ul className="flex flex-col gap-2.5">
                  {points.map((point, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2.5 text-sm leading-snug text-foreground/90"
                    >
                      <Check
                        className="mt-0.5 size-4 shrink-0 text-emerald-500"
                        strokeWidth={2.5}
                      />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="relative h-[min(240px,38vh)] shrink-0 overflow-hidden border-t border-border/40 bg-muted/15 md:h-full md:border-t-0 md:border-l md:w-[48%] flex items-center justify-center">
              <div className="pointer-events-none absolute inset-0 size-full">
                <AnimatedGridPattern
                  width={40}
                  height={40}
                  maxOpacity={0.18}
                  numSquares={72}
                  className="size-full opacity-40 dark:opacity-20"
                />
              </div>
              <div className="relative z-10 flex size-full items-center justify-center p-6 md:p-8">
                <svg className="w-full h-auto max-w-[220px]" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="15" y="20" width="35" height="35" rx="8" fill="#e8f5e9" className="dark:fill-emerald-950/20" />
                  <path d="M32.5 30 V45 M25 37.5 H40" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
                  
                  <rect x="150" y="20" width="35" height="35" rx="8" fill="#e3f2fd" className="dark:fill-blue-950/20" />
                  <path d="M167.5 30 V45 M160 37.5 H175" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
                  
                  <rect x="82.5" y="125" width="35" height="35" rx="8" fill="#fdf2f8" className="dark:fill-pink-950/20" />
                  <circle cx="100" cy="142.5" r="8" stroke="#ec4899" strokeWidth="2.5" />
                  
                  <path d="M58 37.5 H142" stroke="currentColor" className="text-border" strokeWidth="2" strokeDasharray="4 4" />
                  <path d="M142 37.5 L135 33.5 M142 37.5 L135 41.5" stroke="currentColor" className="text-border" strokeWidth="2" />
                  
                  <path d="M167.5 63 V142.5 H125" stroke="currentColor" className="text-border" strokeWidth="2" strokeDasharray="4 4" />
                  <path d="M125 142.5 L132 138.5 M125 142.5 L132 146.5" stroke="currentColor" className="text-border" strokeWidth="2" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-4 border-t border-border/40 px-6 py-4 sm:px-8">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="min-w-[4.5rem] font-semibold"
            onClick={() => onOpenChange(false)}
          >
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface WhatsAppCoexistenceGuideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function WhatsAppCoexistenceGuideDialog({ open, onOpenChange }: WhatsAppCoexistenceGuideDialogProps) {
  const points = [
    'Cloud-Hosted Number: Once registered, Meta virtualizes your number in their cloud infrastructure.',
    'Mobile App Disconnection: The standard WhatsApp & WhatsApp Business mobile applications are disabled for this number.',
    'Reverting back: You can easily restore mobile use by deleting the number from Meta WhatsApp Manager first.',
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,640px)] flex-col gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-[880px]">
        <DialogTitle className="sr-only">Mobile app coexistence</DialogTitle>
        <div className="w-full flex flex-col h-[min(440px,calc(90vh-5.5rem))] min-h-[400px]">
          <div className="flex h-full w-full flex-col overflow-hidden md:flex-row md:items-stretch">
            <div className="flex min-h-0 flex-1 flex-col justify-center gap-4 overflow-y-auto px-6 py-6 sm:px-10 md:overflow-visible md:py-10">
              <div className="flex flex-col gap-2.5">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  Mobile app coexistence
                </h2>
                <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                  Because Meta virtualizes your phone number for Cloud API operations, standard mobile messaging apps cannot run in parallel.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Key rules
                </h3>
                <ul className="flex flex-col gap-2.5">
                  {points.map((point, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2.5 text-sm leading-snug text-foreground/90"
                    >
                      <CircleAlert
                        className="mt-0.5 size-4 shrink-0 text-amber-500"
                        strokeWidth={2.5}
                      />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="relative h-[min(240px,38vh)] shrink-0 overflow-hidden border-t border-border/40 bg-muted/15 md:h-full md:border-t-0 md:border-l md:w-[48%]">
              <div className="pointer-events-none absolute inset-0 size-full">
                <AnimatedGridPattern
                  width={40}
                  height={40}
                  maxOpacity={0.18}
                  numSquares={72}
                  className="size-full opacity-40 dark:opacity-20"
                />
              </div>
              <div className="relative z-10 flex size-full items-center justify-center p-6 md:p-8">
                <div className="w-full">
                  <div className="flex size-full max-h-full w-full items-center justify-center">
                    <img
                      src="/restricted.png"
                      alt="WhatsApp Cloud API hosting active status screenshot"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-4 border-t border-border/40 px-6 py-4 sm:px-8">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="min-w-[4.5rem] font-semibold"
            onClick={() => onOpenChange(false)}
          >
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
