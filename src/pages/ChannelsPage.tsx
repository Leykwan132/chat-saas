import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { Link, useParams, useSearchParams } from 'react-router';
import {
  Check,
  CircleAlert,
  FileText,
  FilePlus2,
  Loader2,
  RefreshCw,
  Send,
  Trash2,
} from 'lucide-react';
import { SiInstagram, SiMessenger, SiWhatsapp } from 'react-icons/si';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import type { Doc, Id } from '../../convex/_generated/dataModel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { Separator } from '@/components/ui/separator';
import { ConnectWhatsAppButton } from '@/components/ConnectWhatsAppButton';
import { ConnectInstagramButton } from '@/components/ConnectInstagramButton';
import { ConnectMessengerButton } from '@/components/ConnectMessengerButton';
import {
  WHATSAPP_DEMO_NEW_TEMPLATE_BODY,
  WHATSAPP_DEMO_NEW_TEMPLATE_NAME,
  WHATSAPP_DEMO_RECIPIENT,
  WHATSAPP_DEMO_TEMPLATE_LANGUAGE,
  WHATSAPP_DEMO_TEMPLATE_NAME,
  WHATSAPP_DEMO_WABA_ID,
} from '@/lib/whatsappCloudDemo';

type ChannelDoc = Doc<'channels'>;

/** Toggle the WhatsApp Cloud API quick demo section on the Channels page. */
const SHOW_WHATSAPP_CLOUD_API_QUICK_DEMO = false;

const SERVICE_META: Record<
  ChannelDoc['service'],
  { label: string; icon: React.ElementType; description: string }
> = {
  whatsapp: {
    label: 'WhatsApp',
    icon: SiWhatsapp,
    description:
      'Connect your WhatsApp Business number to receive and reply to customer chats.',
  },
  instagram: {
    label: 'Instagram',
    icon: SiInstagram,
    description: 'Reply to Instagram DMs from the same inbox.',
  },
  messenger: {
    label: 'Messenger',
    icon: SiMessenger,
    description: 'Connect Facebook Page Messenger conversations.',
  },
};

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
function useMetaChannelCallbackParams() {
  const [searchParams, setSearchParams] = useSearchParams();
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    const instagram = searchParams.get('instagram');
    const messenger = searchParams.get('messenger');

    if (instagram === 'connected' || instagram === 'error') {
      const key = `instagram:${instagram}`;
      if (handledRef.current === key) return;
      handledRef.current = key;
      if (instagram === 'connected') {
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
  const ensureDefaultAgentId = useMutation(api.channels.ensureDefaultAgentId);
  useMetaChannelCallbackParams();

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

  useEffect(() => {
    if (!channels) return;
    setDisconnectingChannelIds((prev) => {
      const next = new Set(prev);
      for (const id of prev) {
        const ch = channels.find((c: ChannelDoc) => (c._id as string) === id);
        if (!ch || ch.status === 'disconnected') next.delete(id);
      }
      return next;
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
      <PageHeader />

      <section className="flex flex-col gap-4">
        <SectionTitle
          title="Available channels"
          description="Pick a channel to connect to your workspace."
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <AvailableChannelCard
            service="whatsapp"
            cta={<ConnectWhatsAppButton />}
          />
          <AvailableChannelCard
            service="instagram"
            cta={<ConnectInstagramButton />}
          />
          <AvailableChannelCard
            service="messenger"
            cta={<ConnectMessengerButton />}
          />
        </div>
      </section>

      {SHOW_WHATSAPP_CLOUD_API_QUICK_DEMO ? (
        <WhatsAppCloudApiDemo channels={channels ?? []} />
      ) : null}

      {channels !== undefined && connectedChannelsList.length > 0 ? (
        <section className="flex flex-col gap-4">
          <SectionTitle
            title="Connected channels"
            description="Channels currently linked to your workspace."
          />
          <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card">
            {connectedChannelsList.map((channel: ChannelDoc) => (
              <ConnectedChannelRow
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
              />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function WhatsAppCloudApiDemo({ channels }: { channels: ChannelDoc[] }) {
  const whatsappChannel = channels.find((channel) => channel.service === 'whatsapp');
  const sendDemoTemplate = useAction(api.whatsappDemo.sendDemoTemplateMessage);
  const listDemoTemplates = useAction(api.whatsappDemo.listDemoMessageTemplates);
  const createDemoTemplate = useAction(api.whatsappDemo.createDemoMessageTemplate);
  const [busyAction, setBusyAction] = useState<
    'send' | 'templates' | 'createTemplate' | null
  >(null);
  const [result, setResult] = useState<string | null>(null);

  const runDemoRequest = useCallback(
    (action: 'send' | 'templates' | 'createTemplate') => {
      void (async () => {
        setBusyAction(action);
        setResult(null);

        try {
          if (action === 'send') {
            const { result: out } = await sendDemoTemplate({});
            setResult(out);
            toast.success('Demo WhatsApp template request completed');
            return;
          }

          const wabaId = whatsappChannel?.wabaId ?? WHATSAPP_DEMO_WABA_ID;
          if ((action === 'templates' || action === 'createTemplate') && !wabaId) {
            throw new Error(
              'No WhatsApp Business Account ID found. Connect WhatsApp or use the demo WABA id.',
            );
          }

          if (action === 'createTemplate') {
            const { result: out } = await createDemoTemplate({
              name: WHATSAPP_DEMO_NEW_TEMPLATE_NAME,
              language: WHATSAPP_DEMO_TEMPLATE_LANGUAGE,
              category: 'UTILITY',
              bodyText: WHATSAPP_DEMO_NEW_TEMPLATE_BODY,
              wabaId,
            });
            setResult(out);
            toast.success('WhatsApp message template creation request completed');
            return;
          }

          const { result: out } = await listDemoTemplates({ wabaId });
          setResult(out);
          toast.success('WhatsApp message templates request completed');
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          setResult(message);
          toast.error(message);
        } finally {
          setBusyAction(null);
        }
      })();
    },
    [
      whatsappChannel?.wabaId,
      sendDemoTemplate,
      listDemoTemplates,
      createDemoTemplate,
    ],
  );

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-dashed border-border bg-muted/20 p-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            WhatsApp Cloud API quick demo
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Temporary test helper for sending the sample template message and
            creating or retrieving message templates. Calls run on Convex using{' '}
            <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">
              WHATSAPP_DEMO_ACCESS_TOKEN
            </code>{' '}
            (never sent to the browser).
          </p>
        </div>
        <Badge variant="outline" className="w-fit">
          Demo only
        </Badge>
      </div>

      <div className="grid gap-3 text-sm md:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="font-medium">Send template message</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Sends {WHATSAPP_DEMO_TEMPLATE_NAME} to {WHATSAPP_DEMO_RECIPIENT}.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="font-medium">Create message template</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Creates {WHATSAPP_DEMO_NEW_TEMPLATE_NAME} on the selected WABA.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="font-medium">Retrieve message templates</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Uses the connected WhatsApp WABA ID, or WHATSAPP_DEMO_WABA_ID if set.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() => runDemoRequest('send')}
          disabled={busyAction !== null}
        >
          {busyAction === 'send' ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
          Send sample message
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => runDemoRequest('createTemplate')}
          disabled={busyAction !== null}
        >
          {busyAction === 'createTemplate' ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <FilePlus2 className="size-4" />
          )}
          Create demo template
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => runDemoRequest('templates')}
          disabled={busyAction !== null}
        >
          {busyAction === 'templates' ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <FileText className="size-4" />
          )}
          Retrieve templates
        </Button>
      </div>

      {result ? (
        <pre className="max-h-72 overflow-auto rounded-lg border border-border bg-background p-3 text-xs text-foreground">
          {result}
        </pre>
      ) : null}
    </section>
  );
}

function PageHeader() {
  return (
    <header className="flex flex-col justify-between gap-4 border-b border-border pb-6 md:flex-row md:items-end">
      <div>
        <h1 className="m-0 text-4xl font-semibold tracking-tight text-foreground">Channels</h1>
      </div>
    </header>
  );
}

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <Separator className="mt-3" />
    </div>
  );
}

function AvailableChannelCard({
  service,
  cta,
  comingSoon = false,
}: {
  service: ChannelDoc['service'];
  cta?: React.ReactNode;
  comingSoon?: boolean;
}) {
  const meta = SERVICE_META[service];
  const Icon = meta.icon;
  return (
    <div className="flex h-full flex-col gap-4 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-foreground">
          <Icon className="size-5" />
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-semibold">{meta.label}</p>
          {comingSoon ? (
            <Badge variant="outline" className="w-fit text-[10px]">
              Coming soon
            </Badge>
          ) : null}
        </div>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {meta.description}
      </p>
      <div className="mt-auto flex w-full justify-end">
        {comingSoon ? (
          <Button type="button" variant="outline" disabled>
            Coming soon
          </Button>
        ) : (
          cta
        )}
      </div>
    </div>
  );
}

function formatConnectedSince(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function ConnectedChannelRow({
  agentId,
  channel,
  onDisconnectBegin,
  onDisconnectUndone,
}: {
  agentId?: string;
  channel: ChannelDoc;
  onDisconnectBegin: () => void;
  onDisconnectUndone: () => void;
}) {
  const meta = SERVICE_META[channel.service];
  const Icon = meta.icon;
  const status = STATUS_META[channel.status];
  const disconnect = useMutation(api.channels.disconnect);
  const enqueueSyncConversations = useAction(
    api.channels.enqueueSyncConversations,
  );
  const [busy, setBusy] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);

  const channelName = channelIdentifier(channel);

  const confirmDisconnect = useCallback(async () => {
    onDisconnectBegin();
    setBusy(true);
    try {
      await disconnect({ channelId: channel._id });
      toast.success('Channel disconnected');
      setDisconnectOpen(false);
    } catch (err) {
      onDisconnectUndone();
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }, [disconnect, channel._id, onDisconnectBegin, onDisconnectUndone]);

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

  const canOpenTemplates =
    Boolean(agentId) &&
    channel.service === 'whatsapp' &&
    channel.status === 'connected' &&
    Boolean(channel.wabaId?.trim());

  const templatesTo =
    canOpenTemplates && agentId
      ? `/dashboard/${agentId}/channels/${channel._id}/templates`
      : null;

  const mainBlock = (
    <>
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
        <Icon className="size-5" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="min-w-0 truncate text-base font-semibold tracking-tight text-foreground">
            {channelName}
          </p>
          {channel.status === 'connected' ? (
            <span
              className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white dark:bg-emerald-600"
              title="Connected"
              aria-label="Connected"
            >
              <Check className="size-2 stroke-[2.75]" aria-hidden />
            </span>
          ) : null}
        </div>
        {channel.status === 'connected' ? (
          <p className="text-xs text-muted-foreground">
            Connected since {formatConnectedSince(channel.createdAt)}
            {templatesTo ? (
              <span className="text-muted-foreground"> · </span>
            ) : null}
            {templatesTo ? (
              <span className="text-xs text-muted-foreground">
                Click the row to manage message templates
              </span>
            ) : null}
          </p>
        ) : null}
        {channel.status === 'error' && channel.lastError ? (
          <p className="flex items-start gap-1.5 text-xs text-destructive">
            <CircleAlert className="mt-0.5 size-3.5 shrink-0" />
            <span>{channel.lastError}</span>
          </p>
        ) : null}
      </div>
    </>
  );

  return (
    <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex min-w-0 gap-3">
          {templatesTo ? (
            <Link
              to={templatesTo}
              className="flex min-w-0 flex-1 items-start gap-3 rounded-lg outline-none ring-offset-background transition-colors hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {mainBlock}
            </Link>
          ) : (
            <div className="flex min-w-0 flex-1 gap-3">{mainBlock}</div>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center justify-end gap-2 self-start sm:pt-0.5">
        {channel.status !== 'connected' ? (
          <StatusBadge tone={status.tone}>
            {channel.status === 'pending' ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : channel.status === 'error' ? (
              <CircleAlert className="size-3.5" />
            ) : null}
            {status.label}
          </StatusBadge>
        ) : null}
        {channel.status === 'connected' || channel.status === 'error' ? (
          <>
            {canSyncConversations ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-foreground"
                disabled={busy || syncBusy}
                onClick={() => void handleSyncConversations()}
                aria-label={`Sync conversations for ${channelName}`}
                title="Sync conversations"
              >
                <RefreshCw
                  className={`size-4 ${syncBusy ? 'animate-spin' : ''}`}
                />
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-destructive"
              disabled={busy || syncBusy}
              onClick={() => setDisconnectOpen(true)}
              aria-label={`Disconnect ${channelName}`}
            >
              <Trash2 className="size-4" />
            </Button>
            <Dialog open={disconnectOpen} onOpenChange={setDisconnectOpen}>
              <DialogContent showCloseButton={false}>
                <DialogHeader>
                  <DialogTitle className="text-lg sm:text-xl font-semibold">Disconnect {channelName}?</DialogTitle>
                  <DialogDescription>
                    Disconnecting {channelName} ({meta.label}) will stop new messages from arriving.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={() => setDisconnectOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={busy}
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
          </>
        ) : null}
      </div>
    </li>
  );
}

function StatusBadge({
  tone,
  children,
}: {
  tone: 'success' | 'warning' | 'muted' | 'danger';
  children: React.ReactNode;
}) {
  const cls =
    tone === 'success'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
      : tone === 'warning'
        ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
        : tone === 'danger'
          ? 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
          : 'border-border bg-muted text-muted-foreground';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}
    >
      {children}
    </span>
  );
}
