import { Loader2 } from 'lucide-react';
import { WebWidgetIconUploader } from '@/components/channels/WebWidgetIconUploader';
import { WebWidgetTextSettingField } from '@/components/channels/WebWidgetTextSettingField';
import { Button } from '@/components/ui/button';

type WebWidgetAppearanceSectionProps = {
  agentDisplayName: string;
  savedAgentDisplayName: string;
  placeholderText: string;
  savedPlaceholder: string;
  canUseCustomIcon: boolean;
  iconUrl?: string;
  savingAppearance: boolean;
  uploadingIcon: boolean;
  onAgentDisplayNameChange: (value: string) => void;
  onPlaceholderChange: (value: string) => void;
  onSaveAppearance: () => void;
  onIconFileSelected: (file: File | undefined) => void;
};

export function WebWidgetAppearanceSection({
  agentDisplayName,
  savedAgentDisplayName,
  placeholderText,
  savedPlaceholder,
  canUseCustomIcon,
  iconUrl,
  savingAppearance,
  uploadingIcon,
  onAgentDisplayNameChange,
  onPlaceholderChange,
  onSaveAppearance,
  onIconFileSelected,
}: WebWidgetAppearanceSectionProps) {
  const normalizedAgentName = agentDisplayName.trim();
  const normalizedPlaceholder = placeholderText.trim();
  const canSaveAppearance =
    Boolean(normalizedAgentName) &&
    Boolean(normalizedPlaceholder) &&
    (normalizedAgentName !== savedAgentDisplayName ||
      normalizedPlaceholder !== savedPlaceholder);

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-foreground">
            Appearance
          </h3>
          <p className="text-sm text-muted-foreground">
            Set the widget identity visitors see first.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={savingAppearance || !canSaveAppearance}
          onClick={onSaveAppearance}
        >
          {savingAppearance ? (
            <Loader2 data-icon="inline-start" className="animate-spin" />
          ) : null}
          Save
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="grid gap-4">
          <WebWidgetTextSettingField
            id="web-widget-name"
            label="Agent name"
            value={agentDisplayName}
            onChange={onAgentDisplayNameChange}
            onSubmit={onSaveAppearance}
          />
          <WebWidgetTextSettingField
            id="web-widget-placeholder"
            label="Placeholder"
            value={placeholderText}
            placeholder={savedPlaceholder}
            onChange={onPlaceholderChange}
            onSubmit={onSaveAppearance}
          />
        </div>
        <div className="sm:justify-self-end">
          <WebWidgetIconUploader
            compact
            canUseCustomIcon={canUseCustomIcon}
            iconUrl={iconUrl}
            name={agentDisplayName || savedAgentDisplayName}
            uploading={uploadingIcon}
            onFileSelected={onIconFileSelected}
          />
        </div>
      </div>
    </section>
  );
}
