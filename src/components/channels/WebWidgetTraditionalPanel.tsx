import { useState } from 'react';
import { useMutation } from 'convex/react';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import type { WebWidgetMode } from '../../../shared/traditionalWebWidget';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useUpgradeModal } from '@/components/upgradeModalContext';
import { TraditionalWidgetActions } from './TraditionalWidgetActions';
import { WebWidgetBrandingSection } from './WebWidgetBrandingSection';
import { WebWidgetScriptArtifact } from './WebWidgetScriptArtifact';
import { WebWidgetTraditionalPreview } from './WebWidgetTraditionalPreview';
import { buildWebWidgetSnippet } from './webWidgetSnippet';
import { getTraditionalWidgetFormState } from './webWidgetConfigurationState';

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
  activeMode: WebWidgetMode;
  agentId: Id<'agents'> | undefined;
  publicKey: string;
  settings: TraditionalWidgetSettings;
};

export function WebWidgetTraditionalPanel({
  activeMode,
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
  const [activating, setActivating] = useState(false);
  const snippet = buildWebWidgetSnippet(publicKey);
  const draft = { label, prefillMessage, hidePoweredBy };
  const saved = {
    label: settings.label,
    prefillMessage: settings.prefillMessage,
    hidePoweredBy: settings.hidePoweredBy,
  };
  const formState = getTraditionalWidgetFormState({
    activeMode,
    busy: saving || activating,
    canPublish: settings.canActivate,
    draft,
    saved,
  });
  const labelInvalid = label.trim().length < 1 || label.trim().length > 40;
  const messageInvalid =
    prefillMessage.trim().length < 1 || prefillMessage.trim().length > 500;

  const saveChanges = async () => {
    if (!agentId || !formState.canSave) return;
    setSaving(true);
    try {
      await updateTraditionalSettings({
        agentId,
        label: label.trim(),
        prefillMessage: prefillMessage.trim(),
        hidePoweredBy,
      });
      toast.success('Traditional widget settings saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  const activateTraditional = async () => {
    if (!agentId || !formState.canActivate) return;
    setActivating(true);
    try {
      await activateMode({ agentId, mode: 'traditional' });
      toast.success('Traditional widget is now active');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setActivating(false);
    }
  };

  const copySnippet = () => {
    void navigator.clipboard
      .writeText(snippet)
      .then(() => toast.success('Installation copied'))
      .catch(() => toast.error('Could not copy installation'));
  };

  const downloadSnippet = () => {
    const url = URL.createObjectURL(new Blob([snippet], { type: 'text/html;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'kilobot-widget.html';
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success('Installation downloaded');
  };

  return (
    <div className="grid min-h-0 gap-0 overflow-y-auto lg:grid-cols-[minmax(360px,0.9fr)_1.1fr] lg:overflow-hidden">
      <div className="flex flex-col gap-6 border-b border-border px-8 pt-4 pb-8 lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-10 lg:pt-4 lg:pb-10">
        {!settings.canActivate ? (
          <p className="text-sm text-muted-foreground">
            You need to connect WhatsApp before activating Traditional.
          </p>
        ) : null}
        <FieldGroup>
          {settings.canActivate ? (
            <>
              <Field>
                <FieldLabel>WhatsApp account</FieldLabel>
                <Input value={settings.displayUsername} readOnly />
              </Field>
              <Field>
                <FieldLabel>WhatsApp number</FieldLabel>
                <Input value={settings.displayPhoneNumber} readOnly />
              </Field>
            </>
          ) : null}
          <Field data-invalid={labelInvalid}>
            <FieldLabel htmlFor="traditional-widget-label">Pill label</FieldLabel>
            <Input
              id="traditional-widget-label"
              value={label}
              maxLength={40}
              aria-invalid={labelInvalid}
              onChange={(event) => setLabel(event.target.value)}
            />
            <FieldDescription>1–40 characters</FieldDescription>
          </Field>
          <Field data-invalid={messageInvalid}>
            <FieldLabel htmlFor="traditional-widget-message">
              Prefilled WhatsApp message
            </FieldLabel>
            <Textarea
              id="traditional-widget-message"
              value={prefillMessage}
              maxLength={500}
              aria-invalid={messageInvalid}
              className="min-h-24"
              onChange={(event) => setPrefillMessage(event.target.value)}
            />
            <FieldDescription>1–500 characters</FieldDescription>
          </Field>
          <WebWidgetBrandingSection
            hidePoweredBy={hidePoweredBy}
            canHideBranding={settings.canHideBranding}
            saving={saving || activating}
            onChange={setHidePoweredBy}
            onRequestUpgrade={openUpgradeModal}
          />
          <TraditionalWidgetActions
            activating={activating}
            canActivate={formState.canActivate}
            canSave={formState.canSave}
            saving={saving}
            onActivate={() => void activateTraditional()}
            onSave={() => void saveChanges()}
          />
          {settings.canActivate ? (
            <Field>
              <FieldLabel>Installation</FieldLabel>
              <WebWidgetScriptArtifact
                code={snippet}
                onCopy={copySnippet}
                onDownload={downloadSnippet}
              />
            </Field>
          ) : null}
        </FieldGroup>
      </div>
      <div className="flex min-h-0 flex-col gap-6 px-8 pt-4 pb-8 lg:overflow-y-auto lg:px-10 lg:pt-4 lg:pb-10">
        <WebWidgetTraditionalPreview
          className="min-h-[620px] lg:min-h-0"
          label={label}
          phoneNumber={settings.displayPhoneNumber}
          prefillMessage={prefillMessage}
          poweredBy={!hidePoweredBy}
        />
      </div>
    </div>
  );
}
