import { useCallback, useState } from 'react';
import { useParams } from 'react-router';
import { useAction, useQuery } from 'convex/react';
import { FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  WHATSAPP_DEMO_NEW_TEMPLATE_BODY,
  WHATSAPP_DEMO_NEW_TEMPLATE_NAME,
  WHATSAPP_DEMO_TEMPLATE_LANGUAGE,
  WHATSAPP_DEMO_WABA_ID,
} from '@/lib/whatsappCloudDemo';

export default function WhatsappDemoTemplatePage() {
  const { agentId } = useParams();
  const channels = useQuery(api.channels.listForCurrentOrg, {});
  const whatsappChannel = channels?.find((c) => c.service === 'whatsapp');
  const wabaId = whatsappChannel?.wabaId ?? WHATSAPP_DEMO_WABA_ID;

  const createDemoMessageTemplate = useAction(
    api.whatsappDemo.createDemoMessageTemplate,
  );
  const listDemoMessageTemplates = useAction(
    api.whatsappDemo.listDemoMessageTemplates,
  );

  const [name, setName] = useState(WHATSAPP_DEMO_NEW_TEMPLATE_NAME);
  const [language, setLanguage] = useState(WHATSAPP_DEMO_TEMPLATE_LANGUAGE);
  const [bodyText, setBodyText] = useState(WHATSAPP_DEMO_NEW_TEMPLATE_BODY);
  const [category, setCategory] = useState('UTILITY');
  const [busy, setBusy] = useState<'create' | 'list' | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const runCreate = useCallback(async () => {
    const trimmedName = name.trim();
    const trimmedBody = bodyText.trim();
    if (!trimmedName || !trimmedBody) {
      toast.error('Template name and body are required.');
      return;
    }
    setBusy('create');
    setResult(null);
    try {
      const { result: out } = await createDemoMessageTemplate({
        name: trimmedName,
        language: language.trim() || WHATSAPP_DEMO_TEMPLATE_LANGUAGE,
        category: category.trim() || 'UTILITY',
        bodyText: trimmedBody,
        wabaId,
      });
      setResult(out);
      toast.success('Template creation request completed');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setResult(msg);
      toast.error(msg);
    } finally {
      setBusy(null);
    }
  }, [
    createDemoMessageTemplate,
    wabaId,
    name,
    language,
    bodyText,
    category,
  ]);

  const runList = useCallback(async () => {
    setBusy('list');
    setResult(null);
    try {
      const { result: out } = await listDemoMessageTemplates({ wabaId });
      setResult(out);
      toast.success('Templates loaded');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setResult(msg);
      toast.error(msg);
    } finally {
      setBusy(null);
    }
  }, [listDemoMessageTemplates, wabaId]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <header className="flex flex-col gap-2 border-b border-border pb-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <FileText className="size-5" />
          <span className="text-xs font-medium uppercase tracking-wide">
            WhatsApp demo
          </span>
        </div>
        <h1 className="m-0 text-2xl font-bold tracking-tight">Message templates</h1>
        <p className="m-0 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Create or list templates on your WhatsApp Business Account. Graph API
          calls run on Convex using{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            WHATSAPP_DEMO_ACCESS_TOKEN
          </code>
          — nothing is stored in the browser.
        </p>
        <p className="m-0 text-xs text-muted-foreground">
          WABA used: <code className="rounded bg-muted px-1 py-0.5">{wabaId}</code>
          {agentId ? (
            <>
              {' '}
              · Agent: <code className="rounded bg-muted px-1 py-0.5">{agentId}</code>
            </>
          ) : null}
        </p>
      </header>

      <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        If actions fail with a missing-token error, set{' '}
        <code className="rounded bg-background px-1 py-0.5 text-xs">
          WHATSAPP_DEMO_ACCESS_TOKEN
        </code>{' '}
        in the Convex dashboard for this deployment.
      </div>

      <div className="flex flex-col gap-5 rounded-xl border border-border bg-card p-6">
        <div className="grid gap-2">
          <Label htmlFor="tpl-name">Template name</Label>
          <Input
            id="tpl-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="snake_case name"
            autoComplete="off"
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
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tpl-cat">Category</Label>
            <Input
              id="tpl-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="UTILITY"
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
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => void runCreate()} disabled={busy !== null}>
            {busy === 'create' ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : null}
            Create template
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void runList()}
            disabled={busy !== null}
          >
            {busy === 'list' ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : null}
            List templates
          </Button>
        </div>
      </div>

      {result ? (
        <pre className="max-h-[28rem] overflow-auto rounded-lg border border-border bg-muted/30 p-4 text-xs leading-relaxed">
          {result}
        </pre>
      ) : null}
    </div>
  );
}
