import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router';
import { useAction, useQuery } from 'convex/react';
import {
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import type { Doc } from '../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { TemplateDetailDetailsTab } from '@/components/templates/TemplateDetailDetailsTab';
import { TemplateDetailPageSkeleton } from '@/components/templates/TemplateDetailPageSkeleton';
import type {
  TemplateDetailComponentInput,
  TemplateDetailUpdateComponent,
} from '@/components/templates/templateDetailEditorHelpers';

type TemplateRow = {
  name: string;
  language: string;
  category: string;
  components?: TemplateDetailComponentInput[];
};

function TemplateAnalyticsPanel() {
  return (
    <section className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12">
      <div className="grid grid-cols-1 gap-4 text-center sm:grid-cols-3 lg:col-span-7">
        <div className="flex flex-col gap-1 rounded-xl border border-border/80 bg-muted/10 p-4">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Sent
          </span>
          <div className="text-4xl font-semibold text-foreground tabular-nums tracking-tight">
            0
          </div>
          <span className="text-[10px] text-muted-foreground">Total messages</span>
        </div>
        <div className="flex flex-col gap-1 rounded-xl border border-border/80 bg-muted/10 p-4">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Delivered
          </span>
          <div className="text-4xl font-semibold text-foreground tabular-nums tracking-tight">
            0%
          </div>
          <span className="text-[10px] text-muted-foreground">Delivery rate</span>
        </div>
        <div className="flex flex-col gap-1 rounded-xl border border-border/80 bg-muted/10 p-4">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Read
          </span>
          <div className="text-4xl font-semibold text-foreground tabular-nums tracking-tight">
            0%
          </div>
          <span className="text-[10px] text-muted-foreground">Open rate</span>
        </div>
      </div>
    </section>
  );
}

export default function TemplateDetailPage() {
  const { agentId, templateName } = useParams();
  const [searchParams] = useSearchParams();
  const targetLanguage = searchParams.get('lang') || '';

  const channels = useQuery(api.channels.listForCurrentOrg, {});
  const listTemplates = useAction(api.whatsappBroadcast.listTemplates);
  const updateTemplateComponents = useAction(
    api.whatsappTemplateUpdate.updateTemplateComponents,
  );

  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingChanges, setSavingChanges] = useState(false);

  const whatsappReady = useMemo(() => {
    if (!channels) return [];
    return channels.filter(
      (c: Doc<'channels'>) =>
        c.service === 'whatsapp' &&
        c.status === 'connected' &&
        Boolean(c.wabaId?.trim()) &&
        Boolean(c.phoneNumberId?.trim()),
    );
  }, [channels]);

  const activeChannelId = whatsappReady[0]?._id ?? null;

  useEffect(() => {
    if (!activeChannelId) return;
    let cancelled = false;

    async function loadTemplatesForChannel() {
      await Promise.resolve();
      if (cancelled) return;
      setLoading(true);
      try {
        const { templates: rows } = await listTemplates({
          channelId: activeChannelId,
        });
        if (!cancelled) setTemplates(rows);
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : String(e);
          toast.error(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadTemplatesForChannel();

    return () => {
      cancelled = true;
    };
  }, [activeChannelId, listTemplates]);

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

  const handleSaveTemplateChanges = async (
    components: TemplateDetailUpdateComponent[],
  ) => {
    if (!activeChannelId || !template) {
      throw new Error('No active WhatsApp channel connected.');
    }
    setSavingChanges(true);
    try {
      await updateTemplateComponents({
        channelId: activeChannelId,
        templateName: template.name,
        templateLanguage: template.language,
        category: template.category,
        components,
      });
      const { templates: rows } = await listTemplates({ channelId: activeChannelId });
      setTemplates(rows);
      toast.success('Template updated in Meta.');
    } finally {
      setSavingChanges(false);
    }
  };

  if (channels === undefined || (loading && templates.length === 0)) {
    return <TemplateDetailPageSkeleton />;
  }

  if (!templateName || !agentId) {
    return <Navigate to="/workspace" replace />;
  }

  if (templates.length > 0 && !template) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
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
            The template &quot;{templateName}&quot; could not be found on this account.
          </p>
          <Button className="mt-6" asChild>
            <Link to={`/dashboard/${agentId}/templates`}>Open Templates list</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 animate-fade-in pb-12">
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
          <header className="border-b border-border pb-6">
            <h1 className="m-0 text-3xl font-semibold leading-none tracking-tight text-foreground">
              {template.name}
            </h1>
          </header>

          <TemplateAnalyticsPanel />

          <TemplateDetailDetailsTab
            key={`${template.name}-${template.language}-${JSON.stringify(
              template.components ?? [],
            )}`}
            templateName={template.name}
            category={template.category}
            components={template.components}
            loading={loading}
            saving={savingChanges}
            onSave={handleSaveTemplateChanges}
          />
        </>
      )}
    </div>
  );
}
