import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@workos-inc/authkit-react';
import { useMutation, useQuery } from 'convex/react';
import { useSearchParams } from 'react-router';
import {
  Building2,
  CheckCircle2,
  CircleAlert,
  FileText,
  FilePlus2,
  Loader2,
  Send,
  Trash2,
} from 'lucide-react';
import { SiInstagram, SiMessenger, SiWhatsapp } from 'react-icons/si';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import type { Doc, Id } from '../../convex/_generated/dataModel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ConnectWhatsAppButton } from '@/components/ConnectWhatsAppButton';
import { ConnectInstagramButton } from '@/components/ConnectInstagramButton';
import { ConnectMessengerButton } from '@/components/ConnectMessengerButton';

type ChannelDoc = Doc<'channels'>;

const WHATSAPP_GRAPH_API_VERSION = 'v25.0';
const WHATSAPP_DEMO_ACCESS_TOKEN = 'EAAONOfH9nHYBRe6bjD7HyXWaUdKHNArANgtDaJlyZBoN1yfunMfIU5ZA6MmrHleH7t8ROwjjP7X1kzVRF93KfDRcpS0H1m0jDRljdOzkJq6P653FSBoRrZAZCKMiC1CZBjZC9g9Btgw5VdBZBNxOnpIZCYn7e9ZBwTEJZBWgZBuDLH8sHDZBLdn5tk034iEAZBQ7TJYn7QrOjXvN1f1EPDvLFYgQmearNoLCG7A3vy7FDIR2JiGZBXR30L0FwBVPcZCz7md2RROkOKBrgOVuyuGLFRotpJDDOQZBiAZDZD';
const WHATSAPP_DEMO_PHONE_NUMBER_ID = '1121402084386768';
const WHATSAPP_DEMO_RECIPIENT = '60129499394';
const WHATSAPP_DEMO_TEMPLATE_NAME = 'jaspers_market_plain_text_v1';
const WHATSAPP_DEMO_TEMPLATE_LANGUAGE = 'en_US';
const WHATSAPP_DEMO_WABA_ID = '1457383175576319';
const WHATSAPP_DEMO_NEW_TEMPLATE_NAME = 'jaspers_market_demo_text_v2';
const WHATSAPP_DEMO_NEW_TEMPLATE_BODY =
  "Thank you for reaching out to Jasper's Market. We'll reply as soon as we can.";

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
  const { organizationId } = useAuth();
  const channels = useQuery(
    api.channels.listForCurrentOrg,
    organizationId ? {} : 'skip',
  );
  useMetaChannelCallbackParams();

  if (!organizationId) {
    return (
      <div className="flex w-full flex-col gap-6">
        <PageHeader />
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-20 text-center">
          <Building2 className="size-8 text-muted-foreground" />
          <h2 className="text-base font-semibold">No organization selected</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            You need to belong to an organization before you can connect a
            messaging channel. Create or join one from the Account page.
          </p>
        </div>
      </div>
    );
  }

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

      <WhatsAppCloudApiDemo channels={channels ?? []} />

      {channels !== undefined && channels.length > 0 ? (
        <section className="flex flex-col gap-4">
          <SectionTitle
            title="Connected channels"
            description="Channels currently linked to your organization."
          />
          <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card">
            {channels.map((channel) => (
              <ConnectedChannelRow key={channel._id} channel={channel} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function WhatsAppCloudApiDemo({ channels }: { channels: ChannelDoc[] }) {
  const whatsappChannel = channels.find((channel) => channel.service === 'whatsapp');
  const [busyAction, setBusyAction] = useState<
    'send' | 'templates' | 'createTemplate' | null
  >(null);
  const [result, setResult] = useState<string | null>(null);

  const runDemoRequest = useCallback(
    (action: 'send' | 'templates' | 'createTemplate') => {
      void (async () => {
        if (!WHATSAPP_DEMO_ACCESS_TOKEN.trim()) {
          const message =
            'Add a temporary WhatsApp Cloud API access token to WHATSAPP_DEMO_ACCESS_TOKEN first.';
          setResult(message);
          toast.error(message);
          return;
        }

        setBusyAction(action);
        setResult(null);

        try {
          if (action === 'send') {
            const response = await fetch(
              `https://graph.facebook.com/${WHATSAPP_GRAPH_API_VERSION}/${WHATSAPP_DEMO_PHONE_NUMBER_ID}/messages`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${WHATSAPP_DEMO_ACCESS_TOKEN}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  messaging_product: 'whatsapp',
                  to: WHATSAPP_DEMO_RECIPIENT,
                  type: 'template',
                  template: {
                    name: WHATSAPP_DEMO_TEMPLATE_NAME,
                    language: { code: WHATSAPP_DEMO_TEMPLATE_LANGUAGE },
                  },
                }),
              },
            );
            setResult(await formatGraphResponse(response));
            toast.success('Demo WhatsApp template request completed');
            return;
          }

          const wabaId = whatsappChannel?.wabaId ?? WHATSAPP_DEMO_WABA_ID;
          if ((action === 'templates' || action === 'createTemplate') && !wabaId) {
            throw new Error(
              'No WhatsApp Business Account ID found. Connect WhatsApp or add one to WHATSAPP_DEMO_WABA_ID.',
            );
          }

          if (action === 'createTemplate') {
            const response = await fetch(
              `https://graph.facebook.com/${WHATSAPP_GRAPH_API_VERSION}/${wabaId}/message_templates`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${WHATSAPP_DEMO_ACCESS_TOKEN}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  name: WHATSAPP_DEMO_NEW_TEMPLATE_NAME,
                  category: 'UTILITY',
                  language: WHATSAPP_DEMO_TEMPLATE_LANGUAGE,
                  components: [
                    {
                      type: 'BODY',
                      text: WHATSAPP_DEMO_NEW_TEMPLATE_BODY,
                    },
                  ],
                }),
              },
            );
            setResult(await formatGraphResponse(response));
            toast.success('WhatsApp message template creation request completed');
            return;
          }

          const response = await fetch(
            `https://graph.facebook.com/${WHATSAPP_GRAPH_API_VERSION}/${wabaId}/message_templates`,
            {
              headers: {
                Authorization: `Bearer ${WHATSAPP_DEMO_ACCESS_TOKEN}`,
              },
            },
          );
          setResult(await formatGraphResponse(response));
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
    [whatsappChannel?.wabaId],
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
            creating or retrieving message templates. Paste a short-lived token into
            <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">
              WHATSAPP_DEMO_ACCESS_TOKEN
            </code>
            before running it.
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

async function formatGraphResponse(response: Response) {
  const text = await response.text();
  let body: unknown = text;

  try {
    body = JSON.parse(text);
  } catch {
    // Facebook can return non-JSON errors for edge cases; keep the raw body.
  }

  const formattedBody =
    typeof body === 'string' ? body : JSON.stringify(body, null, 2);

  if (!response.ok) {
    throw new Error(`Graph API ${response.status}: ${formattedBody}`);
  }

  return formattedBody;
}

function PageHeader() {
  return (
    <header className="flex flex-col justify-between gap-4 border-b border-border pb-6 md:flex-row md:items-end">
      <div>
        <h1 className="m-0 text-2xl font-bold tracking-tight">Channels</h1>
        <p className="m-0 mt-1 text-sm text-muted-foreground">
          Connect messaging channels to your workspace.
        </p>
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

function ConnectedChannelRow({ channel }: { channel: ChannelDoc }) {
  const meta = SERVICE_META[channel.service];
  const Icon = meta.icon;
  const status = STATUS_META[channel.status];
  const disconnect = useMutation(api.channels.disconnect);
  const [busy, setBusy] = useState(false);

  const handleDisconnect = useCallback(
    (channelId: Id<'channels'>) => {
      void (async () => {
        if (
          !window.confirm(
            'Disconnect this channel? Existing conversations will be kept but new messages will not be received until you reconnect.',
          )
        ) {
          return;
        }
        setBusy(true);
        try {
          await disconnect({ channelId });
          toast.success('Channel disconnected');
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          toast.error(msg);
        } finally {
          setBusy(false);
        }
      })();
    },
    [disconnect],
  );

  return (
    <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-foreground">
          <Icon className="size-5" />
        </div>
        <div className="flex flex-col gap-0.5 min-w-0">
          <p className="truncate text-sm font-semibold">{meta.label}</p>
          <p className="truncate text-xs text-muted-foreground">
            {channelIdentifier(channel)}
          </p>
          {channel.status === 'error' && channel.lastError ? (
            <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
              <CircleAlert className="size-3.5" />
              {channel.lastError}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge tone={status.tone}>
          {channel.status === 'connected' ? (
            <CheckCircle2 className="size-3.5" />
          ) : channel.status === 'error' ? (
            <CircleAlert className="size-3.5" />
          ) : null}
          {status.label}
        </StatusBadge>
        {channel.status === 'connected' || channel.status === 'error' ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => handleDisconnect(channel._id)}
          >
            {busy ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Trash2 className="size-3.5" />
            )}
            Disconnect
          </Button>
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
