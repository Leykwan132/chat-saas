import { useState } from 'react';
import { useMutation } from 'convex/react';
import { Link } from 'react-router';
import { SiWhatsapp } from 'react-icons/si';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useUpgradeModal } from '@/components/upgradeModalContext';
import { WebWidgetBrandingSection } from './WebWidgetBrandingSection';
import { WebWidgetScriptArtifact } from './WebWidgetScriptArtifact';
import { buildWebWidgetSnippet } from './webWidgetSnippet';
import { WebWidgetTraditionalPreview } from './WebWidgetTraditionalPreview';

export type TraditionalWidgetSettings = {
  label: string;
  prefillMessage: string;
  poweredBy: boolean;
  hidePoweredBy: boolean;
  canHideBranding: boolean;
  displayUsername?: string;
  displayPhoneNumber?: string;
  canActivate: boolean;
};

type WebWidgetTraditionalPanelProps = {
  agentId: Id<'agents'> | undefined;
  publicKey: string;
  settings: TraditionalWidgetSettings;
};

export function WebWidgetTraditionalPanel({
  agentId,
  publicKey,
  settings,
}: WebWidgetTraditionalPanelProps) {
  const { openUpgradeModal } = useUpgradeModal();
  const updateTraditionalSettings = useMutation(api.webWidget.updateTraditionalSettings);
  const activateMode = useMutation(api.webWidget.activateMode);
  const [label, setLabel] = useState(settings.label);
  const [prefillMessage, setPrefillMessage] = useState(settings.prefillMessage);
  const [hidePoweredBy, setHidePoweredBy] = useState(settings.hidePoweredBy);
  const [saving, setSaving] = useState(false);
  const snippet = buildWebWidgetSnippet(publicKey);
  const valid = label.trim().length >= 1 && label.trim().length <= 40 && prefillMessage.trim().length >= 1 && prefillMessage.trim().length <= 500;

  const publishTraditional = async () => {
    if (!agentId || !settings.canActivate || !valid) {
      throw new Error('Complete the Traditional widget settings before installing it.');
    }
    await updateTraditionalSettings({
      agentId,
      label: label.trim(),
      prefillMessage: prefillMessage.trim(),
      hidePoweredBy,
    });
    await activateMode({ agentId, mode: 'traditional' });
  };

  const install = (action: () => Promise<void>, successMessage: string) => {
    if (saving) return;
    setSaving(true);
    void Promise.all([publishTraditional(), action()])
      .then(() => toast.success(successMessage))
      .catch((error) => toast.error(error instanceof Error ? error.message : String(error)))
      .finally(() => setSaving(false));
  };

  return (
    <div className="grid min-h-0 gap-0 overflow-y-auto lg:grid-cols-[minmax(360px,0.9fr)_1.1fr] lg:overflow-hidden">
      <div className="flex flex-col gap-6 border-b border-border px-8 pt-4 pb-8 lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-10 lg:pt-4 lg:pb-10">
        {!settings.canActivate ? <Alert className="border-[#25D366]/30 bg-[#25D366]/5"><SiWhatsapp className="size-5 text-[#25D366]" /><AlertTitle>Connect WhatsApp to activate Traditional</AlertTitle><AlertDescription>Traditional opens WhatsApp directly. Connect an account with a name and phone number to activate it.</AlertDescription><AlertAction className="static col-start-2 row-start-3 mt-3 w-fit"><Button asChild size="sm"><Link to={`/dashboard/${agentId}/channels`}><SiWhatsapp data-icon="inline-start" />Connect Channel</Link></Button></AlertAction></Alert> : null}
        <FieldGroup>
          {settings.canActivate ? <><Field><FieldLabel>WhatsApp account</FieldLabel><Input value={settings.displayUsername} readOnly /></Field><Field><FieldLabel>WhatsApp number</FieldLabel><Input value={settings.displayPhoneNumber} readOnly /></Field></> : null}
          <Field><FieldLabel>Pill label</FieldLabel><Input value={label} maxLength={40} onChange={(event) => setLabel(event.target.value)} /><p className="text-xs text-muted-foreground">1–40 characters</p></Field>
          <Field><FieldLabel>Prefilled WhatsApp message</FieldLabel><textarea value={prefillMessage} maxLength={500} className="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" onChange={(event) => setPrefillMessage(event.target.value)} /><p className="text-xs text-muted-foreground">1–500 characters</p></Field>
          <WebWidgetBrandingSection hidePoweredBy={hidePoweredBy} canHideBranding={settings.canHideBranding} saving={saving} onChange={setHidePoweredBy} onRequestUpgrade={openUpgradeModal} />
          {settings.canActivate ? <Field><FieldLabel>Installation</FieldLabel><WebWidgetScriptArtifact code={snippet} onCopy={() => install(() => navigator.clipboard.writeText(snippet), 'Traditional installation copied')} onDownload={() => install(async () => { const url = URL.createObjectURL(new Blob([snippet], { type: 'text/html;charset=utf-8' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'kilobot-widget.html'; anchor.click(); URL.revokeObjectURL(url); }, 'Traditional installation downloaded')} /></Field> : null}
        </FieldGroup>
      </div>
      <div className="flex min-h-0 flex-col gap-6 px-8 pt-4 pb-8 lg:overflow-y-auto lg:px-10 lg:pt-4 lg:pb-10"><WebWidgetTraditionalPreview className="min-h-[620px] lg:min-h-0" label={label} phoneNumber={settings.displayPhoneNumber} prefillMessage={prefillMessage} poweredBy={!hidePoweredBy} /></div>
    </div>
  );
}
