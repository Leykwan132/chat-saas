import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router';
import { useAction, useQuery } from 'convex/react';
import {
  ArrowLeft,
  Loader2,
  Megaphone,
  Calendar,
  Layers,
  Globe,
  Activity,
  AlertCircle,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';

type TemplateRow = {
  name: string;
  language: string;
  status: string;
  category: string;
  components?: Array<{ type: string; text?: string }>;
};

export default function TemplateDetailPage() {
  const { agentId, templateName } = useParams();
  const [searchParams] = useSearchParams();
  const targetLanguage = searchParams.get('lang') || '';

  const channels = useQuery(api.channels.listForCurrentOrg, {});
  const listTemplates = useAction(api.whatsappBroadcast.listTemplates);

  const [channelId, setChannelId] = useState<Id<'channels'> | ''>('');
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(false);

  const whatsappReady = useMemo(() => {
    if (!channels) return [];
    return channels.filter(
      (c: any) =>
        c.service === 'whatsapp' &&
        c.status === 'connected' &&
        Boolean(c.wabaId?.trim()) &&
        Boolean(c.phoneNumberId?.trim()),
    );
  }, [channels]);

  useEffect(() => {
    if (!channelId && whatsappReady.length > 0) {
      setChannelId(whatsappReady[0]._id);
    }
  }, [channelId, whatsappReady]);

  const loadTemplates = useCallback(async () => {
    if (!channelId) return;
    setLoading(true);
    try {
      const { templates: rows } = await listTemplates({
        channelId: channelId as Id<'channels'>,
      });
      setTemplates(rows);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [channelId, listTemplates]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  const template = useMemo(() => {
    if (!templateName) return null;
    return (
      templates.find(
        (t) =>
          t.name === templateName &&
          (!targetLanguage || t.language === targetLanguage)
      ) ?? null
    );
  }, [templates, templateName, targetLanguage]);

  const bodyText = useMemo(() => {
    if (!template) return '';
    const bodyComp = template.components?.find((c: any) => c.type === 'BODY');
    return bodyComp?.text ?? 'No body text content available.';
  }, [template]);

  const isApproved = template?.status === 'APPROVED';

  if (channels === undefined || (loading && templates.length === 0)) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!templateName || !agentId) {
    return <Navigate to="/workspace" replace />;
  }

  if (templates.length > 0 && !template) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
        <Button variant="ghost" size="sm" className="-ml-2 w-fit gap-1 text-muted-foreground" asChild>
          <Link to={`/dashboard/${agentId}/templates`}>
            <ArrowLeft className="size-4" />
            Back to Templates
          </Link>
        </Button>
        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center animate-fade-in">
          <AlertCircle className="mx-auto size-10 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold text-foreground">
            Template not found
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            The template &quot;{templateName}&quot; ({targetLanguage}) could not be found on this account.
          </p>
          <Button className="mt-6" asChild>
            <Link to={`/dashboard/${agentId}/templates`}>Open Templates list</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 animate-fade-in pb-12 px-4 md:px-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
          asChild
        >
          <Link to={`/dashboard/${agentId}/templates`}>
            <ArrowLeft className="size-4" />
            Back to Templates
          </Link>
        </Button>
      </div>

      {template && (
        <>
          {/* HEADER SECTION */}
          <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-border pb-6">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="m-0 text-3xl font-semibold tracking-tight text-foreground leading-none">
                  {template.name}
                </h1>
                <div className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-800/40 px-2.5 py-0.5 text-xs text-neutral-600 dark:text-neutral-300 font-medium select-none">
                  <span className={`size-1.5 rounded-full shrink-0 ${isApproved ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <span>
                    {isApproved ? 'Approved' : 'In review'}
                  </span>
                </div>
              </div>
            </div>
            {isApproved && (
              <Button
                asChild
                className="h-10 px-5 gap-2 font-semibold text-sm shadow-sm hover:scale-[1.01] transition-transform active:scale-[0.99]"
              >
                <Link to={`/dashboard/${agentId}/broadcast/new`}>
                  <Megaphone className="size-4" />
                  Use in Broadcast
                </Link>
              </Button>
            )}
          </header>

          {/* LAYOUT CONTAINER */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* LEFT COLUMN: METADATA & STATIC STATS (lg:col-span-7) */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              {/* METADATA LIST CARD */}
              <div className="rounded-xl border border-border bg-card p-6 shadow-2xs">
                <h3 className="m-0 text-sm font-semibold text-foreground mb-4">
                  Template details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/10">
                    <Layers className="size-4.5 text-muted-foreground shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-muted-foreground font-medium">Category</span>
                      <span className="font-semibold text-foreground capitalize mt-0.5">
                        {template.category.toLowerCase()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/10">
                    <Globe className="size-4.5 text-muted-foreground shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-muted-foreground font-medium">Language</span>
                      <span className="font-semibold text-foreground mt-0.5">{template.language}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/10">
                    <Activity className="size-4.5 text-muted-foreground shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-muted-foreground font-medium">Approval status</span>
                      <span className="font-semibold text-foreground capitalize mt-0.5">
                        {template.status.toLowerCase()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/10">
                    <Calendar className="size-4.5 text-muted-foreground shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-muted-foreground font-medium">Last updated</span>
                      <span className="font-semibold text-foreground mt-0.5">1 Jun 2026</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* STATS ANALYTICS CARD */}
              <div className="rounded-xl border border-border bg-card p-6 shadow-2xs">
                <h3 className="m-0 text-sm font-semibold text-foreground mb-4">
                  Campaign performance
                </h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="flex flex-col gap-1 p-4 rounded-xl bg-muted/10 border border-border/80">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Sent
                    </span>
                    <div className="text-4xl font-semibold text-foreground tabular-nums tracking-tight">
                      0
                    </div>
                    <span className="text-[10px] text-muted-foreground">Total messages</span>
                  </div>
                  <div className="flex flex-col gap-1 p-4 rounded-xl bg-muted/10 border border-border/80">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Delivered
                    </span>
                    <div className="text-4xl font-semibold text-foreground tabular-nums tracking-tight">
                      0%
                    </div>
                    <span className="text-[10px] text-muted-foreground">Delivery rate</span>
                  </div>
                  <div className="flex flex-col gap-1 p-4 rounded-xl bg-muted/10 border border-border/80">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Read
                    </span>
                    <div className="text-4xl font-semibold text-foreground tabular-nums tracking-tight">
                      0%
                    </div>
                    <span className="text-[10px] text-muted-foreground">Open rate</span>
                  </div>
                </div>

                <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/10 text-2xs text-muted-foreground leading-normal flex items-start gap-2">
                  <Info className="size-3.5 text-primary shrink-0 mt-0.5" />
                  <span>
                    Template message statistics update automatically when templates are dispatched 
                    via Broadcast campaigns. Currently, there are no sent records for this template.
                  </span>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: WHATSAPP speech bubble preview (lg:col-span-5) */}
            <div className="lg:col-span-5 flex flex-col">
              <div className="rounded-xl border border-border bg-card shadow-sm flex flex-col h-full overflow-hidden min-h-[380px]">
                <div className="bg-[#075e54] text-white px-4 py-3 flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-full bg-white/20">
                    <Megaphone className="size-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block leading-tight">Broadcast Preview</span>
                    <span className="text-[10px] text-white/70 block leading-tight">WhatsApp Template Message</span>
                  </div>
                </div>

                <div
                  className="flex-1 p-4 flex flex-col justify-start bg-[#efeae2] relative"
                  style={{
                    backgroundImage: `url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'repeat',
                  }}
                >
                  <div className="max-w-[90%] bg-white rounded-lg rounded-tl-none p-3.5 shadow-xs border border-black/5 relative self-start mt-2">
                    {/* Arrow tail */}
                    <div className="absolute left-0 top-0 -translate-x-1.5 border-r-[8px] border-r-white border-b-[8px] border-b-transparent border-t-[8px] border-t-transparent" />

                    <p className="m-0 text-xs font-normal text-slate-800 whitespace-pre-wrap leading-relaxed break-words">
                      {bodyText}
                    </p>

                    <div className="text-[9px] text-slate-400 text-right mt-2 block select-none">
                      Preview · WhatsApp
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
