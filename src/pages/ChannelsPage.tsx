import { useCallback, useState } from 'react';
import { useAuth } from '@workos-inc/authkit-react';
import { useMutation, useQuery } from 'convex/react';
import {
  Building2,
  CheckCircle2,
  CircleAlert,
  Loader2,
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

type ChannelDoc = Doc<'channels'>;

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

export default function ChannelsPage() {
  const { organizationId } = useAuth();
  const channels = useQuery(
    api.channels.listForCurrentOrg,
    organizationId ? {} : 'skip',
  );

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
          <AvailableChannelCard service="instagram" comingSoon />
          <AvailableChannelCard service="messenger" comingSoon />
        </div>
      </section>

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
            {channel.displayPhoneNumber ??
              channel.phoneNumberId ??
              channel.wabaId ??
              'No identifier yet'}
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
