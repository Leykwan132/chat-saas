import { useCallback, useState } from 'react';
import { useMutation } from 'convex/react';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import type { WebWidgetLayout } from '../../../shared/webWidgetLayouts';
import type { WebWidgetTheme } from '../../../shared/webWidgetThemes';
import { DEFAULT_WEB_WIDGET_THEME } from '../../../shared/webWidgetThemes';
import { useUpgradeModal } from '@/components/upgradeModalContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { WebWidgetAppearanceSection } from '@/components/channels/WebWidgetAppearanceSection';
import { WebWidgetBrandingSection } from '@/components/channels/WebWidgetBrandingSection';
import { WebWidgetLayoutPicker } from '@/components/channels/WebWidgetLayoutPicker';
import { WebWidgetPreview } from '@/components/channels/WebWidgetPreview';
import { WebWidgetScriptArtifact } from '@/components/channels/WebWidgetScriptArtifact';
import { buildWebWidgetSnippet } from '@/components/channels/webWidgetSnippet';
import {
  Field,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import type { TraditionalWidgetSettings } from './WebWidgetTraditionalPanel';
import { getWebWidgetPreviewState } from './webWidgetConfigurationState';

export type WebWidgetSettings = {
  channelId: Id<'channels'>;
  publicKey: string;
  enabled: boolean;
  agentDisplayName: string;
  placeholder: string;
  layout: WebWidgetLayout;
  theme: WebWidgetTheme;
  iconUrl?: string;
  poweredBy: boolean;
  hidePoweredBy: boolean;
  canHideBranding: boolean;
  canUseCustomIcon: boolean;
  activeMode: 'ai_powered' | 'traditional';
  traditional: TraditionalWidgetSettings;
};

type WebWidgetSettingsPanelProps = {
  agentId: Id<'agents'> | undefined;
  settings: WebWidgetSettings;
  updateSettings: ReturnType<typeof useMutation<typeof api.webWidget.updateSettings>>;
  generateIconUploadUrl: ReturnType<typeof useMutation<typeof api.webWidget.generateIconUploadUrl>>;
  saveIcon: ReturnType<typeof useMutation<typeof api.webWidget.saveIcon>>;
};

export function WebWidgetSettingsPanel({
  agentId,
  settings,
  updateSettings,
  generateIconUploadUrl,
  saveIcon,
}: WebWidgetSettingsPanelProps) {
  const { openUpgradeModal } = useUpgradeModal();
  const [agentDisplayName, setAgentDisplayName] = useState(settings.agentDisplayName);
  const [placeholderText, setPlaceholderText] = useState(settings.placeholder);
  const [placementLayout, setPlacementLayout] = useState(settings.layout);
  const [hidePoweredBy, setHidePoweredBy] = useState(settings.hidePoweredBy);
  const [savingAppearance, setSavingAppearance] = useState(false);
  const [savingPlacement, setSavingPlacement] = useState(false);
  const [savingBranding, setSavingBranding] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [activatingMode, setActivatingMode] = useState(false);
  const activateMode = useMutation(api.webWidget.activateMode);
  const snippet = buildWebWidgetSnippet(settings.publicKey);
  const normalizedAgentName = agentDisplayName.trim();
  const normalizedPlaceholder = placeholderText.trim();
  const previewPoweredBy = !(settings.canHideBranding && hidePoweredBy);
  const previewState = getWebWidgetPreviewState(settings.activeMode);

  const activateAiMode = useCallback(() => {
    if (!agentId || previewState.enabled || activatingMode) return;
    setActivatingMode(true);
    void activateMode({ agentId, mode: 'ai_powered' })
      .then(() => toast.success('AI-powered widget is now active'))
      .catch((error) => toast.error(error instanceof Error ? error.message : String(error)))
      .finally(() => setActivatingMode(false));
  }, [activateMode, activatingMode, agentId, previewState.enabled]);

  const saveAppearance = useCallback(() => {
    if (!agentId) return;
    const nameChanged = normalizedAgentName !== settings.agentDisplayName;
    const placeholderChanged = normalizedPlaceholder !== settings.placeholder;
    if (
      savingAppearance ||
      !normalizedAgentName ||
      !normalizedPlaceholder ||
      (!nameChanged && !placeholderChanged)
    ) {
      return;
    }
    setSavingAppearance(true);
    void updateSettings({
      agentId,
      ...(nameChanged ? { agentDisplayName: normalizedAgentName } : {}),
      ...(placeholderChanged ? { placeholder: normalizedPlaceholder } : {}),
    })
      .then(() => toast.success('Web widget appearance updated'))
      .catch((error) => toast.error(error instanceof Error ? error.message : String(error)))
      .finally(() => setSavingAppearance(false));
  }, [
    agentId,
    normalizedAgentName,
    normalizedPlaceholder,
    savingAppearance,
    settings.agentDisplayName,
    settings.placeholder,
    updateSettings,
  ]);

  const saveBranding = useCallback(
    (nextHidePoweredBy: boolean) => {
      if (!agentId) return;
      if (nextHidePoweredBy && !settings.canHideBranding) {
        openUpgradeModal();
        return;
      }
      setHidePoweredBy(nextHidePoweredBy);
      if (nextHidePoweredBy === settings.hidePoweredBy) return;
      setSavingBranding(true);
      void updateSettings({
        agentId,
        hidePoweredBy: nextHidePoweredBy,
      })
        .then(() =>
          toast.success(
            nextHidePoweredBy
              ? 'Powered by branding removed'
              : 'Powered by branding shown',
          ),
        )
        .catch((error) => {
          setHidePoweredBy(settings.hidePoweredBy);
          toast.error(error instanceof Error ? error.message : String(error));
        })
        .finally(() => setSavingBranding(false));
    },
    [
      agentId,
      openUpgradeModal,
      settings.canHideBranding,
      settings.hidePoweredBy,
      updateSettings,
    ],
  );

  const savePlacement = useCallback(
    (nextLayout: WebWidgetLayout) => {
      if (!agentId || nextLayout === placementLayout || savingPlacement) return;
      setPlacementLayout(nextLayout);
      setSavingPlacement(true);
      void updateSettings({
        agentId,
        layout: nextLayout,
      })
        .then(() => toast.success('Web widget placement updated'))
        .catch((error) => {
          setPlacementLayout(settings.layout);
          toast.error(error instanceof Error ? error.message : String(error));
        })
        .finally(() => setSavingPlacement(false));
    },
    [
      agentId,
      placementLayout,
      savingPlacement,
      settings.layout,
      updateSettings,
    ],
  );

  const copySnippet = useCallback(() => {
    void navigator.clipboard
      .writeText(snippet)
      .then(() => toast.success('Installation copied'))
      .catch(() => toast.error('Could not copy installation'));
  }, [snippet]);

  const downloadSnippet = useCallback(() => {
    const blob = new Blob([snippet], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'kilobot-widget.html';
    anchor.click();
    URL.revokeObjectURL(url);
  }, [snippet]);

  const uploadIcon = useCallback(
    (file: File | undefined) => {
      if (!file || !agentId || !settings.canUseCustomIcon) return;
      setUploadingIcon(true);
      void (async () => {
        const uploadUrl = await generateIconUploadUrl({ agentId });
        const response = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': file.type || 'application/octet-stream' },
          body: file,
        });
        if (!response.ok) {
          throw new Error('Icon upload failed');
        }
        const { storageId } = (await response.json()) as { storageId: Id<'_storage'> };
        await saveIcon({ agentId, storageId });
        toast.success('Icon updated');
      })()
        .catch((error) => toast.error(error instanceof Error ? error.message : String(error)))
        .finally(() => setUploadingIcon(false));
    },
    [agentId, generateIconUploadUrl, saveIcon, settings.canUseCustomIcon],
  );

  return (
    <>
      <div className="grid min-h-0 gap-0 overflow-y-auto lg:grid-cols-[minmax(360px,0.9fr)_1.1fr] lg:overflow-hidden">
        <div className="flex flex-col gap-6 border-b border-border px-8 pt-4 pb-8 lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-10 lg:pt-4 lg:pb-10">
          <FieldGroup>
            {previewState.inactiveMessage ? (
              <Alert>
                <AlertTitle>Traditional widget is active</AlertTitle>
                <AlertDescription>{previewState.inactiveMessage}</AlertDescription>
                <Button
                  type="button"
                  size="sm"
                  className="mt-3 w-fit"
                  disabled={activatingMode}
                  onClick={activateAiMode}
                >
                  {activatingMode ? <Spinner data-icon="inline-start" /> : null}
                  {activatingMode ? 'Activating…' : 'Set as active'}
                </Button>
              </Alert>
            ) : null}
            <WebWidgetAppearanceSection
              agentDisplayName={agentDisplayName}
              savedAgentDisplayName={settings.agentDisplayName}
              placeholderText={placeholderText}
              savedPlaceholder={settings.placeholder}
              canUseCustomIcon={settings.canUseCustomIcon}
              iconUrl={settings.iconUrl}
              uploadingIcon={uploadingIcon}
              onAgentDisplayNameChange={setAgentDisplayName}
              onPlaceholderChange={setPlaceholderText}
              onSaveAppearance={saveAppearance}
              onIconFileSelected={uploadIcon}
            />

            <WebWidgetLayoutPicker
              value={placementLayout}
              saving={savingPlacement}
              onChange={savePlacement}
            />

            <WebWidgetBrandingSection
              hidePoweredBy={hidePoweredBy}
              canHideBranding={settings.canHideBranding}
              saving={savingBranding}
              onChange={saveBranding}
              onRequestUpgrade={openUpgradeModal}
            />

            <Field>
              <FieldLabel>Installation</FieldLabel>
              <WebWidgetScriptArtifact
                code={snippet}
                onCopy={copySnippet}
                onDownload={downloadSnippet}
              />
            </Field>
          </FieldGroup>
        </div>

        <div className="flex min-h-0 flex-col gap-6 px-8 pt-4 pb-8 lg:overflow-y-auto lg:px-10 lg:pt-4 lg:pb-10">
          <WebWidgetPreview
            className="min-h-[620px] lg:min-h-0"
            agentName={agentDisplayName || settings.agentDisplayName}
            enabled={previewState.enabled}
            placeholder={placeholderText.trim() || settings.placeholder}
            iconUrl={settings.iconUrl}
            layout={placementLayout}
            theme={DEFAULT_WEB_WIDGET_THEME}
            poweredBy={previewPoweredBy}
            publicKey={settings.publicKey}
          />
        </div>
      </div>
    </>
  );
}
