import { WebWidgetIconUploader } from '@/components/channels/WebWidgetIconUploader';
import { WebWidgetTextSettingField } from '@/components/channels/WebWidgetTextSettingField';

type WebWidgetAppearanceSectionProps = {
  agentDisplayName: string;
  savedAgentDisplayName: string;
  placeholderText: string;
  savedPlaceholder: string;
  canUseCustomIcon: boolean;
  iconUrl?: string;
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
  uploadingIcon,
  onAgentDisplayNameChange,
  onPlaceholderChange,
  onSaveAppearance,
  onIconFileSelected,
}: WebWidgetAppearanceSectionProps) {
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
