import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useAction, useQuery } from 'convex/react';
import { ArrowLeft, Loader2, Megaphone, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import type { Doc, Id } from '../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  WHATSAPP_DEMO_NEW_TEMPLATE_BODY,
  WHATSAPP_DEMO_NEW_TEMPLATE_NAME,
  WHATSAPP_DEMO_TEMPLATE_LANGUAGE,
} from '@/lib/whatsappCloudDemo';

const MAX_BATCH = 50;
const META_PRICING_URL =
  'https://developers.facebook.com/docs/whatsapp/pricing';

type ChannelDoc = Doc<'channels'>;

type TemplateRow = {
  name: string;
  language: string;
  status: string;
  category: string;
};

function channelLabel(ch: ChannelDoc): string {
  return (
    ch.displayPhoneNumber ??
    ch.phoneNumberId ??
    ch.wabaId ??
    'WhatsApp'
  );
}

export default function AutomationsBroadcastPage() {
  const { agentId } = useParams();
  const channels = useQuery(api.channels.listForCurrentOrg, {});
  const listTemplates = useAction(api.whatsappBroadcast.listTemplates);
  const createTemplate = useAction(api.whatsappBroadcast.createTemplate);
  const sendTemplateBatch = useAction(api.whatsappBroadcast.sendTemplateBatch);
  const getEstimateUnit = useAction(api.whatsappBroadcast.getBroadcastEstimateUnitUsd);

  const whatsappReady = useMemo(() => {
    if (!channels) return [];
    return channels.filter(
      (c) =>
        c.service === 'whatsapp' &&
        c.status === 'connected' &&
        Boolean(c.wabaId?.trim()) &&
        Boolean(c.phoneNumberId?.trim()),
    );
  }, [channels]);

  const [channelId, setChannelId] = useState<Id<'channels'> | ''>('');
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateKey, setTemplateKey] = useState(''); // "name\tlanguage"
  const [selectedPhones, setSelectedPhones] = useState<Set<string>>(new Set());
  const [unitUsd, setUnitUsd] = useState(0.015);
  const [sendBusy, setSendBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [tplName, setTplName] = useState(WHATSAPP_DEMO_NEW_TEMPLATE_NAME);
  const [tplLang, setTplLang] = useState(WHATSAPP_DEMO_TEMPLATE_LANGUAGE);
  const [tplCategory, setTplCategory] = useState('UTILITY');
  const [tplBody, setTplBody] = useState(WHATSAPP_DEMO_NEW_TEMPLATE_BODY);

  useEffect(() => {
    void getEstimateUnit({}).then((r) => setUnitUsd(r.unitUsd)).catch(() => {});
  }, [getEstimateUnit]);

  useEffect(() => {
    if (!channelId && whatsappReady.length > 0) {
      setChannelId(whatsappReady[0]._id);
    }
  }, [channelId, whatsappReady]);

  const candidates = useQuery(
    api.customers.listWhatsAppBroadcastCandidates,
    channelId ? { channelId: channelId as Id<'channels'> } : 'skip',
  );

  useEffect(() => {
    if (!candidates) return;
    setSelectedPhones(new Set(candidates.map((c) => c.phone)));
  }, [candidates]);

  const loadTemplates = useCallback(async () => {
    if (!channelId) {
      setTemplates([]);
      setTemplateKey('');
      return;
    }
    setTemplatesLoading(true);
    setTemplateKey('');
    try {
      const { templates: rows } = await listTemplates({
        channelId: channelId as Id<'channels'>,
      });
      setTemplates(rows);
      const approved = rows.find((t) => t.status === 'APPROVED');
      if (approved) {
        setTemplateKey(`${approved.name}\t${approved.language}`);
      } else if (rows[0]) {
        setTemplateKey(`${rows[0].name}\t${rows[0].language}`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
      setTemplates([]);
    } finally {
      setTemplatesLoading(false);
    }
  }, [channelId, listTemplates]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  const selectedTemplate = useMemo(() => {
    if (!templateKey) return null;
    const [name, language] = templateKey.split('\t');
    if (!name || !language) return null;
    return { name, language };
  }, [templateKey]);

  const selectedCount = selectedPhones.size;
  const estimatedUsd = selectedCount * unitUsd;
  const overLimit = selectedCount > MAX_BATCH;

  const togglePhone = (phone: string) => {
    setSelectedPhones((prev) => {
      const next = new Set(prev);
      if (next.has(phone)) next.delete(phone);
      else next.add(phone);
      return next;
    });
  };

  const toggleAll = () => {
    if (!candidates?.length) return;
    if (selectedPhones.size === candidates.length) {
      setSelectedPhones(new Set());
    } else {
      setSelectedPhones(new Set(candidates.map((c) => c.phone)));
    }
  };

  const handleCreateTemplate = async () => {
    if (!channelId) return;
    const n = tplName.trim();
    const b = tplBody.trim();
    if (!n || !b) {
      toast.error('Template name and body are required.');
      return;
    }
    setCreateBusy(true);
    try {
      await createTemplate({
        channelId: channelId as Id<'channels'>,
        name: n,
        language: tplLang.trim() || WHATSAPP_DEMO_TEMPLATE_LANGUAGE,
        category: tplCategory.trim() || 'UTILITY',
        bodyText: b,
      });
      toast.success('Template submitted to Meta for review.');
      setCreateOpen(false);
      await loadTemplates();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
    } finally {
      setCreateBusy(false);
    }
  };

  const handleSend = async () => {
    if (!channelId || !selectedTemplate) {
      toast.error('Select an account and template.');
      return;
    }
    if (selectedCount === 0) {
      toast.error('Select at least one recipient.');
      return;
    }
    if (overLimit) {
      toast.error(`Select at most ${MAX_BATCH} recipients per send.`);
      return;
    }
    setSendBusy(true);
    try {
      const { okCount, failCount, results } = await sendTemplateBatch({
        channelId: channelId as Id<'channels'>,
        templateName: selectedTemplate.name,
        templateLanguage: selectedTemplate.language,
        toPhones: [...selectedPhones],
      });
      if (failCount === 0) {
        toast.success(`Sent to ${okCount} recipient(s).`);
      } else {
        toast.message(`Completed with errors: ${okCount} ok, ${failCount} failed`, {
          description: results
            .filter((r) => !r.ok)
            .slice(0, 3)
            .map((r) => `${r.phone}: ${r.error ?? 'error'}`)
            .join('\n'),
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
    } finally {
      setSendBusy(false);
    }
  };

  if (channels === undefined) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (whatsappReady.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <Button variant="ghost" size="sm" className="-ml-2 w-fit gap-1 text-muted-foreground" asChild>
          <Link to={`/dashboard/${agentId}/automations`}>
            <ArrowLeft className="size-4" />
            Back to Automations
          </Link>
        </Button>
        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
          <Megaphone className="mx-auto size-10 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold text-foreground">
            Connect WhatsApp first
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Broadcast uses your WhatsApp Business account. Connect a WhatsApp
            channel with a phone number and WABA, then return here.
          </p>
          <Button className="mt-6" asChild>
            <Link to={`/dashboard/${agentId}/channels`}>Open Channels</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 gap-1 text-muted-foreground" asChild>
          <Link to={`/dashboard/${agentId}/automations`}>
            <ArrowLeft className="size-4" />
            Back to Automations
          </Link>
        </Button>
      </div>

      <header className="border-b border-border pb-6">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Megaphone className="size-5" />
          </div>
          <div>
            <h1 className="m-0 text-3xl font-semibold tracking-tight text-foreground">
              Broadcast
            </h1>
            <p className="m-0 mt-1 text-sm text-muted-foreground">
              WhatsApp template messages
            </p>
          </div>
        </div>
      </header>

      <section
        className="rounded-xl border border-border p-5"
        style={{ background: 'var(--color-surface)' }}
      >
        <h2 className="m-0 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          1. Account
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose the WhatsApp Business number to send from.
        </p>
        <label className="mt-4 block text-xs font-medium text-muted-foreground">
          WhatsApp account
        </label>
        <select
          className="mt-1.5 h-10 w-full max-w-md rounded-lg border border-border bg-background px-3 text-sm"
          value={channelId}
          onChange={(e) => setChannelId(e.target.value as Id<'channels'> | '')}
        >
          {whatsappReady.map((ch) => (
            <option key={ch._id} value={ch._id}>
              {channelLabel(ch)}
            </option>
          ))}
        </select>
      </section>

      <section
        className="rounded-xl border border-border p-5"
        style={{ background: 'var(--color-surface)' }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="m-0 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              2. Template
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Only approved templates can reach customers outside the 24-hour
              care window. New templates must be approved by Meta.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!channelId || templatesLoading}
              onClick={() => void loadTemplates()}
            >
              {templatesLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              <span className="ml-1.5">Refresh</span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!channelId}
              onClick={() => setCreateOpen(true)}
            >
              Create template
            </Button>
          </div>
        </div>

        {templatesLoading ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading templates…
          </div>
        ) : templates.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No templates found for this account. Create one and wait for Meta
            approval.
          </p>
        ) : (
          <>
            <label className="mt-4 block text-xs font-medium text-muted-foreground">
              Template
            </label>
            <select
              className="mt-1.5 h-10 w-full max-w-xl rounded-lg border border-border bg-background px-3 text-sm"
              value={templateKey}
              onChange={(e) => setTemplateKey(e.target.value)}
            >
              {templates.map((t) => (
                <option
                  key={`${t.name}-${t.language}-${t.status}`}
                  value={`${t.name}\t${t.language}`}
                >
                  {t.name} ({t.language}) — {t.status}
                  {t.category ? ` · ${t.category}` : ''}
                </option>
              ))}
            </select>
            {selectedTemplate &&
            templates.find(
              (t) =>
                t.name === selectedTemplate.name &&
                t.language === selectedTemplate.language,
            )?.status !== 'APPROVED' ? (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-500">
                This template is not APPROVED; sends may fail until Meta approves
                it.
              </p>
            ) : null}
          </>
        )}
      </section>

      <section
        className="rounded-xl border border-border p-5"
        style={{ background: 'var(--color-surface)' }}
      >
        <h2 className="m-0 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          3. Recipients
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Customers who have an existing WhatsApp conversation on this number.
          You must have permission to message them (opt-in), per Meta policy.
        </p>
        {candidates === undefined ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading recipients…
          </div>
        ) : candidates.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No conversations yet for this WhatsApp number. When customers message
            you, they will appear here.
          </p>
        ) : (
          <div
            className="mt-4 overflow-hidden rounded-lg border border-border"
            style={{ background: 'var(--color-surface)', fontSize: '13px' }}
          >
            <table className="w-full border-collapse">
              <thead>
                <tr style={{ background: 'var(--color-surface-hover)' }}>
                  <th className="w-10 px-3 py-2.5 text-left">
                    <input
                      type="checkbox"
                      className="rounded border-border"
                      checked={
                        candidates.length > 0 &&
                        selectedPhones.size === candidates.length
                      }
                      onChange={toggleAll}
                      aria-label="Select all"
                    />
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Customer
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Phone
                  </th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((row) => (
                  <tr
                    key={row.phone}
                    className="border-t border-border transition-colors hover:bg-accent/40"
                  >
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        className="rounded border-border"
                        checked={selectedPhones.has(row.phone)}
                        onChange={() => togglePhone(row.phone)}
                        aria-label={`Select ${row.name ?? row.phone}`}
                      />
                    </td>
                    <td className="px-3 py-2.5 font-medium text-foreground">
                      {row.name?.trim() || '—'}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{row.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {candidates && candidates.length > 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">
            {selectedCount} selected · max {MAX_BATCH} per send
            {overLimit ? (
              <span className="ml-1 font-medium text-destructive">
                — reduce selection to send.
              </span>
            ) : null}
          </p>
        ) : null}
      </section>

      <section
        className="rounded-xl border border-border p-5"
        style={{ background: 'var(--color-surface)' }}
      >
        <h2 className="m-0 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          4. Estimated cost
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Indicative only. Meta bills by conversation category and region; this
          is not an invoice.{' '}
          <a
            href={META_PRICING_URL}
            target="_blank"
            rel="noreferrer"
            className="text-primary underline-offset-4 hover:underline"
          >
            WhatsApp pricing
          </a>
        </p>
        <p className="mt-4 text-2xl font-semibold tabular-nums text-foreground">
          ≈ ${estimatedUsd.toFixed(2)} USD
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {selectedCount} recipient{selectedCount === 1 ? '' : 's'} × ${unitUsd.toFixed(3)} (configurable via
          WHATSAPP_BROADCAST_ESTIMATE_USD_PER_MESSAGE on Convex)
        </p>
      </section>

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-6">
        <Button
          type="button"
          disabled={
            sendBusy ||
            !channelId ||
            !selectedTemplate ||
            selectedCount === 0 ||
            overLimit
          }
          onClick={() => void handleSend()}
          className="gap-2"
        >
          {sendBusy ? <Loader2 className="size-4 animate-spin" /> : null}
          Send broadcast
        </Button>
        <p className="text-xs text-muted-foreground">
          Sends up to {MAX_BATCH} template messages in one batch from the server.
        </p>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create message template</DialogTitle>
            <DialogDescription>
              Submits a utility-style template to Meta for review. Category and
              content must comply with WhatsApp policies.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tpl-name">Name</Label>
              <Input
                id="tpl-name"
                value={tplName}
                onChange={(e) => setTplName(e.target.value)}
                disabled={createBusy}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tpl-lang">Language</Label>
                <Input
                  id="tpl-lang"
                  value={tplLang}
                  onChange={(e) => setTplLang(e.target.value)}
                  disabled={createBusy}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tpl-cat">Category</Label>
                <Input
                  id="tpl-cat"
                  value={tplCategory}
                  onChange={(e) => setTplCategory(e.target.value)}
                  disabled={createBusy}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tpl-body">Body</Label>
              <Textarea
                id="tpl-body"
                rows={4}
                value={tplBody}
                onChange={(e) => setTplBody(e.target.value)}
                disabled={createBusy}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={createBusy}>
              Cancel
            </Button>
            <Button onClick={() => void handleCreateTemplate()} disabled={createBusy} className="gap-2">
              {createBusy ? <Loader2 className="size-4 animate-spin" /> : null}
              Submit to Meta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
