import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { useAction, useQuery } from 'convex/react';
import { ArrowLeft, FileText, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  WHATSAPP_DEMO_NEW_TEMPLATE_BODY,
  WHATSAPP_DEMO_NEW_TEMPLATE_NAME,
  WHATSAPP_DEMO_TEMPLATE_LANGUAGE,
} from '@/lib/whatsappCloudDemo';

type TemplateRow = {
  name: string;
  language: string;
  status: string;
  category: string;
};

function channelLabel(displayPhoneNumber?: string, phoneNumberId?: string, wabaId?: string) {
  return displayPhoneNumber ?? phoneNumberId ?? wabaId ?? 'WhatsApp';
}

export default function ChannelWhatsAppTemplatesPage() {
  const { agentId, channelId } = useParams();
  const channels = useQuery(api.channels.listForCurrentOrg, {});
  const listTemplates = useAction(api.whatsappBroadcast.listTemplates);
  const createTemplate = useAction(api.whatsappBroadcast.createTemplate);

  const [rows, setRows] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [name, setName] = useState(WHATSAPP_DEMO_NEW_TEMPLATE_NAME);
  const [language, setLanguage] = useState(WHATSAPP_DEMO_TEMPLATE_LANGUAGE);
  const [category, setCategory] = useState('UTILITY');
  const [bodyText, setBodyText] = useState(WHATSAPP_DEMO_NEW_TEMPLATE_BODY);
  const [rawExpanded, setRawExpanded] = useState(false);

  const channel = channels?.find((c) => c._id === (channelId as Id<'channels'> | undefined));

  const load = useCallback(async () => {
    if (!channelId) return;
    setLoading(true);
    try {
      const { templates } = await listTemplates({
        channelId: channelId as Id<'channels'>,
      });
      setRows(templates);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [channelId, listTemplates]);

  useEffect(() => {
    if (!channel || channel.service !== 'whatsapp') return;
    if (channel.status !== 'connected') return;
    if (!channel.wabaId?.trim() || !channel.phoneNumberId?.trim()) return;
    void load();
  }, [channel, load]);

  if (channels === undefined) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!agentId || !channelId) {
    return <Navigate to="/workspace" replace />;
  }

  if (!channel || channel.service !== 'whatsapp') {
    return <Navigate to={`/dashboard/${agentId}/channels`} replace />;
  }

  if (channel.status !== 'connected') {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <BackLink agentId={agentId} />
        <p className="text-sm text-muted-foreground">
          This WhatsApp channel is not connected yet. Finish setup on Channels,
          then open Message templates again.
        </p>
        <Button asChild variant="outline" className="w-fit">
          <Link to={`/dashboard/${agentId}/channels`}>Back to Channels</Link>
        </Button>
      </div>
    );
  }

  if (!channel.wabaId?.trim() || !channel.phoneNumberId?.trim()) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <BackLink agentId={agentId} />
        <p className="text-sm text-muted-foreground">
          This channel is missing WhatsApp Business Account or phone number
          details. Try reconnecting from Channels.
        </p>
        <Button asChild variant="outline" className="w-fit">
          <Link to={`/dashboard/${agentId}/channels`}>Back to Channels</Link>
        </Button>
      </div>
    );
  }

  const handleCreate = async () => {
    const trimmedName = name.trim();
    const trimmedBody = bodyText.trim();
    if (!trimmedName || !trimmedBody) {
      toast.error('Template name and body are required.');
      return;
    }
    setCreateBusy(true);
    try {
      await createTemplate({
        channelId: channelId as Id<'channels'>,
        name: trimmedName,
        language: language.trim() || WHATSAPP_DEMO_TEMPLATE_LANGUAGE,
        category: category.trim() || 'UTILITY',
        bodyText: trimmedBody,
      });
      toast.success('Template submitted to Meta for review.');
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
    } finally {
      setCreateBusy(false);
    }
  };

  const label = channelLabel(
    channel.displayPhoneNumber,
    channel.phoneNumberId,
    channel.wabaId,
  );

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 gap-1 text-muted-foreground" asChild>
          <Link to={`/dashboard/${agentId}/channels`}>
            <ArrowLeft className="size-4" />
            Back to Channels
          </Link>
        </Button>
      </div>

      <header className="flex flex-col gap-2 border-b border-border pb-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <FileText className="size-5" />
          <span className="text-xs font-medium uppercase tracking-wide">
            WhatsApp · Message templates
          </span>
        </div>
        <h1 className="m-0 text-3xl font-semibold tracking-tight">{label}</h1>
        <p className="m-0 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Create and list templates for this WhatsApp Business Account. Graph API
          calls run on Convex using this channel&apos;s credentials (or the demo
          token when using the demo channel)—nothing is stored in the browser.
        </p>
        <p className="m-0 text-xs text-muted-foreground">
          WABA:{' '}
          <code className="rounded bg-muted px-1 py-0.5">{channel.wabaId}</code>
        </p>
      </header>

      <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        If list or create fails with a missing-token error, set{' '}
        <code className="rounded bg-background px-1 py-0.5 text-xs">
          WHATSAPP_DEMO_ACCESS_TOKEN
        </code>{' '}
        on Convex for the demo channel, or reconnect a production WhatsApp
        channel in Channels.
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => {
            void load().then(() => toast.success('Templates refreshed'));
          }}
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          <span className="ml-1.5">Refresh list</span>
        </Button>
      </div>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="m-0 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Templates on this account
        </h2>
        {loading && rows.length === 0 ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading…
          </div>
        ) : rows.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No templates returned. Create one below or check Meta Business
            Manager.
          </p>
        ) : (
          <div
            className="mt-4 overflow-hidden rounded-lg border border-border"
            style={{ background: 'var(--color-surface)', fontSize: '13px' }}
          >
            <table className="w-full border-collapse">
              <thead>
                <tr style={{ background: 'var(--color-surface-hover)' }}>
                  {['Name', 'Language', 'Status', 'Category'].map((h) => (
                    <th
                      key={h}
                      className="border-b border-border px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={`${r.name}-${r.language}-${i}`}
                    className="border-b border-border last:border-b-0"
                  >
                    <td className="px-4 py-2.5 font-medium text-foreground">{r.name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{r.language}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{r.status}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{r.category || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {rows.length > 0 ? (
          <div className="mt-3">
            <button
              type="button"
              className="text-xs font-medium text-primary underline-offset-4 hover:underline"
              onClick={() => setRawExpanded((e) => !e)}
            >
              {rawExpanded ? 'Hide' : 'Show'} raw JSON
            </button>
            {rawExpanded ? (
              <pre className="mt-2 max-h-72 overflow-auto rounded-lg border border-border bg-muted/30 p-3 text-xs leading-relaxed">
                {JSON.stringify(rows, null, 2)}
              </pre>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="flex flex-col gap-5 rounded-xl border border-border bg-card p-6">
        <h2 className="m-0 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Create template
        </h2>
        <div className="grid gap-2">
          <Label htmlFor="tpl-name">Template name</Label>
          <Input
            id="tpl-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="snake_case name"
            autoComplete="off"
            disabled={createBusy}
          />
        </div>
        <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
          <div className="grid gap-2">
            <Label htmlFor="tpl-lang">Language</Label>
            <Input
              id="tpl-lang"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              placeholder="en_US"
              disabled={createBusy}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tpl-cat">Category</Label>
            <Input
              id="tpl-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="UTILITY"
              disabled={createBusy}
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="tpl-body">Body text</Label>
          <Textarea
            id="tpl-body"
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            rows={5}
            className="resize-y"
            disabled={createBusy}
          />
        </div>
        <Button type="button" onClick={() => void handleCreate()} disabled={createBusy} className="w-fit gap-2">
          {createBusy ? <Loader2 className="size-4 animate-spin" /> : null}
          Create template
        </Button>
      </section>
    </div>
  );
}

function BackLink({ agentId }: { agentId: string }) {
  return (
    <Button variant="ghost" size="sm" className="-ml-2 w-fit gap-1 text-muted-foreground" asChild>
      <Link to={`/dashboard/${agentId}/channels`}>
        <ArrowLeft className="size-4" />
        Back to Channels
      </Link>
    </Button>
  );
}
