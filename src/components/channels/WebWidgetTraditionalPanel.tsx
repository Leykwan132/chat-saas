import { useState } from 'react';
import { useMutation } from 'convex/react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useUpgradeModal } from '@/components/upgradeModalContext';
import { WebWidgetBrandingSection } from './WebWidgetBrandingSection';
import { WebWidgetScriptArtifact } from './WebWidgetScriptArtifact';
import { buildWebWidgetSnippet } from './webWidgetSnippet';
import { TraditionalWhatsAppIcon } from './TraditionalWhatsAppIcon';
import { WebWidgetTraditionalPreview } from './WebWidgetTraditionalPreview';

export type TraditionalWidgetSettings = {
  label: string;
  prefillMessage: string;
  mainColor: string;
  foregroundColor: string;
  iconUrl?: string;
  poweredBy: boolean;
  hidePoweredBy: boolean;
  canHideBranding: boolean;
  canUseCustomIcon: boolean;
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
  const generateIconUploadUrl = useMutation(api.webWidget.generateIconUploadUrl);
  const saveTraditionalIcon = useMutation(api.webWidget.saveTraditionalIcon);
  const removeTraditionalIcon = useMutation(api.webWidget.removeTraditionalIcon);
  const [label, setLabel] = useState(settings.label);
  const [prefillMessage, setPrefillMessage] = useState(settings.prefillMessage);
  const [mainColor, setMainColor] = useState(settings.mainColor);
  const [hidePoweredBy, setHidePoweredBy] = useState(settings.hidePoweredBy);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const snippet = buildWebWidgetSnippet(publicKey);
  const valid = label.trim().length >= 1 && label.trim().length <= 40 && prefillMessage.trim().length >= 1 && prefillMessage.trim().length <= 500 && /^#[0-9A-Fa-f]{6}$/.test(mainColor);

  const publishTraditional = async () => {
    if (!agentId || !settings.canActivate || !valid) {
      throw new Error('Complete the Traditional widget settings before installing it.');
    }
    await updateTraditionalSettings({
      agentId,
      label: label.trim(),
      prefillMessage: prefillMessage.trim(),
      mainColor,
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

  const uploadIcon = (file: File | undefined) => {
    if (!file || !agentId) return;
    if (!settings.canUseCustomIcon) {
      openUpgradeModal();
      return;
    }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 1_000_000) {
      toast.error('Use a PNG, JPEG, or WebP icon under 1 MB.');
      return;
    }
    setUploading(true);
    void (async () => {
      const uploadUrl = await generateIconUploadUrl({ agentId });
      const response = await fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': file.type }, body: file });
      if (!response.ok) throw new Error('Icon upload failed');
      const { storageId } = await response.json() as { storageId: Id<'_storage'> };
      await saveTraditionalIcon({ agentId, storageId });
    })()
      .then(() => toast.success('Traditional icon updated'))
      .catch((error) => toast.error(error instanceof Error ? error.message : String(error)))
      .finally(() => setUploading(false));
  };

  return (
    <div className="grid min-h-0 gap-0 overflow-y-auto lg:grid-cols-[minmax(360px,0.9fr)_1.1fr] lg:overflow-hidden">
      <div className="flex flex-col gap-6 border-b border-border px-8 pt-4 pb-8 lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-10 lg:pt-4 lg:pb-10">
        {!settings.canActivate ? <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">Connect a WhatsApp channel with an account name and phone number before activating Traditional.</div> : null}
        <FieldGroup>
          {settings.canActivate ? <><Field><FieldLabel>WhatsApp account</FieldLabel><Input value={settings.displayUsername} readOnly /></Field><Field><FieldLabel>WhatsApp number</FieldLabel><Input value={settings.displayPhoneNumber} readOnly /></Field></> : null}
          <Field><FieldLabel>Pill label</FieldLabel><Input value={label} maxLength={40} onChange={(event) => setLabel(event.target.value)} /><p className="text-xs text-muted-foreground">1–40 characters</p></Field>
          <Field><FieldLabel>Prefilled WhatsApp message</FieldLabel><textarea value={prefillMessage} maxLength={500} className="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" onChange={(event) => setPrefillMessage(event.target.value)} /><p className="text-xs text-muted-foreground">1–500 characters</p></Field>
          <div className="grid gap-6 sm:grid-cols-2"><Field><FieldLabel>Main color</FieldLabel><div className="flex gap-2"><Input value={mainColor} pattern="#[0-9A-Fa-f]{6}" onChange={(event) => setMainColor(event.target.value)} /><input aria-label="Traditional main color picker" type="color" value={/^#[0-9A-Fa-f]{6}$/.test(mainColor) ? mainColor : '#25D366'} className="size-10 shrink-0 rounded border border-input p-1" onChange={(event) => setMainColor(event.target.value.toUpperCase())} /></div></Field><Field><FieldLabel>Icon</FieldLabel><div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-full bg-muted">{settings.iconUrl ? <img className="size-8 object-contain" src={settings.iconUrl} alt="" /> : <TraditionalWhatsAppIcon />}</div><Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => document.getElementById('traditional-widget-icon')?.click()}><ImagePlus className="size-4" />{uploading ? 'Uploading' : 'Upload'}</Button>{settings.iconUrl ? <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove Traditional icon" onClick={() => agentId && void removeTraditionalIcon({ agentId })}><Trash2 className="size-4" /></Button> : null}<input id="traditional-widget-icon" className="hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => uploadIcon(event.target.files?.[0])} /></div></Field></div>
          <WebWidgetBrandingSection hidePoweredBy={hidePoweredBy} canHideBranding={settings.canHideBranding} saving={saving} onChange={setHidePoweredBy} onRequestUpgrade={openUpgradeModal} />
          {settings.canActivate ? <Field><FieldLabel>Installation</FieldLabel><WebWidgetScriptArtifact code={snippet} onCopy={() => install(() => navigator.clipboard.writeText(snippet), 'Traditional installation copied')} onDownload={() => install(async () => { const url = URL.createObjectURL(new Blob([snippet], { type: 'text/html;charset=utf-8' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'kilobot-widget.html'; anchor.click(); URL.revokeObjectURL(url); }, 'Traditional installation downloaded')} /></Field> : null}
        </FieldGroup>
      </div>
      <div className="flex min-h-0 flex-col gap-6 px-8 pt-4 pb-8 lg:overflow-y-auto lg:px-10 lg:pt-4 lg:pb-10"><WebWidgetTraditionalPreview className="min-h-[620px] lg:min-h-0" iconUrl={settings.iconUrl} label={label} mainColor={mainColor} phoneNumber={settings.displayPhoneNumber} prefillMessage={prefillMessage} poweredBy={!hidePoweredBy} /></div>
    </div>
  );
}
