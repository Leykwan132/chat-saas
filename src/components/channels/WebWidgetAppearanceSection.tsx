import type { WebWidgetTheme } from '../../../shared/webWidgetThemes';
import { WebWidgetBrandingSection } from '@/components/channels/WebWidgetBrandingSection';
import { WebWidgetIconUploader } from '@/components/channels/WebWidgetIconUploader';
import { WebWidgetSettingsSectionHeading } from '@/components/channels/WebWidgetSettingsSectionHeading';
import { WebWidgetTextSettingField } from '@/components/channels/WebWidgetTextSettingField';
import { WebWidgetThemePicker } from '@/components/channels/WebWidgetThemePicker';
import { Button } from '@/components/ui/button';

type WebWidgetAppearanceSectionProps = {
  agentDisplayName: string;
  savedAgentDisplayName: string;
  canSaveAppearance: boolean;
  canUseCustomIcon: boolean;
  canHideBranding: boolean;
  hidePoweredBy: boolean;
  iconUrl?: string;
  savingBranding: boolean;
  savingAppearance: boolean;
  savingTheme: boolean;
  theme: WebWidgetTheme;
  uploadingIcon: boolean;
  onAgentDisplayNameChange: (value: string) => void;
  onSaveAppearance: () => void;
  onHidePoweredByChange: (value: boolean) => void;
  onIconFileSelected: (file: File | undefined) => void;
  onIconRemove: () => void;
  onRequestUpgrade: () => void;
  onThemeChange: (theme: WebWidgetTheme) => void;
};

export function WebWidgetAppearanceSection({
  agentDisplayName,
  savedAgentDisplayName,
  canSaveAppearance,
  canUseCustomIcon,
  canHideBranding,
  hidePoweredBy,
  iconUrl,
  savingBranding,
  savingAppearance,
  savingTheme,
  theme,
  uploadingIcon,
  onAgentDisplayNameChange,
  onSaveAppearance,
  onHidePoweredByChange,
  onIconFileSelected,
  onIconRemove,
  onRequestUpgrade,
  onThemeChange,
}: WebWidgetAppearanceSectionProps) {
  return (
    <section className="space-y-4">
      <WebWidgetSettingsSectionHeading
        title="Appearance"
        description="Set the widget identity visitors see first."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="grid gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="w-full max-w-[14rem]">
              <WebWidgetTextSettingField
                id="web-widget-name"
                label="Name"
                value={agentDisplayName}
                onChange={onAgentDisplayNameChange}
                onSubmit={onSaveAppearance}
              />
            </div>
            <div className="shrink-0">
              <WebWidgetIconUploader
                compact
                canUseCustomIcon={canUseCustomIcon}
                iconUrl={iconUrl}
                name={agentDisplayName || savedAgentDisplayName}
                uploading={uploadingIcon}
                onFileSelected={onIconFileSelected}
                onRemove={onIconRemove}
              />
            </div>
          </div>
          {canSaveAppearance ? (
            <Button
              type="button"
              size="sm"
              className="w-fit"
              disabled={savingAppearance}
              onClick={onSaveAppearance}
            >
              {savingAppearance ? "Saving" : "Save appearance"}
            </Button>
          ) : null}
          <WebWidgetBrandingSection
            hidePoweredBy={hidePoweredBy}
            canHideBranding={canHideBranding}
            saving={savingBranding}
            onChange={onHidePoweredByChange}
            onRequestUpgrade={onRequestUpgrade}
          />
        </div>
        <div className="grid gap-4">
          <WebWidgetThemePicker
            value={theme}
            saving={savingTheme}
            onChange={onThemeChange}
          />
        </div>
      </div>
    </section>
  );
}
