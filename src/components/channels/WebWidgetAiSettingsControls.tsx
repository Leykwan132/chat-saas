import type {
  WebWidgetLeadForm,
} from "../../../shared/webWidgetExperience";
import type { WebWidgetSuggestions } from "../../../shared/webWidgetSuggestions";
import type { WebWidgetTheme } from "../../../shared/webWidgetThemes";
import { WebWidgetAppearanceSection } from "@/components/channels/WebWidgetAppearanceSection";
import { WebWidgetLeadFormSection } from "@/components/channels/WebWidgetLeadFormSection";
import { WebWidgetPreview } from "@/components/channels/WebWidgetPreview";
import { WebWidgetScriptArtifact } from "@/components/channels/WebWidgetScriptArtifact";
import { WebWidgetSettingsSectionHeading } from "@/components/channels/WebWidgetSettingsSectionHeading";
import { WebWidgetSuggestionsSection } from "@/components/channels/WebWidgetSuggestionsSection";

type WebWidgetAiSettingsControlsProps = {
  agentDisplayName: string;
  canHideBranding: boolean;
  canSaveAppearance: boolean;
  canSaveLeadForm: boolean;
  canUseCustomIcon: boolean;
  hidePoweredBy: boolean;
  iconUrl?: string;
  leadForm: WebWidgetLeadForm;
  suggestions: WebWidgetSuggestions;
  suggestionsEnabled: boolean;
  savedAgentDisplayName: string;
  savedSuggestions: WebWidgetSuggestions;
  savedSuggestionsEnabled: boolean;
  savingBranding: boolean;
  savingAppearance: boolean;
  savingLeadForm: boolean;
  savingSuggestions: boolean;
  savingTheme: boolean;
  snippet: string;
  theme: WebWidgetTheme;
  uploadingIcon: boolean;
  onAgentDisplayNameChange: (value: string) => void;
  onCopySnippet: () => void;
  onDownloadSnippet: () => void;
  onHidePoweredByChange: (value: boolean) => void;
  onIconFileSelected: (file: File | undefined) => void;
  onIconRemove: () => void;
  onLeadFormChange: (value: WebWidgetLeadForm) => void;
  onLeadFormSave: () => void;
  onSuggestionsChange: (value: WebWidgetSuggestions) => void;
  onSuggestionsEnabledChange: (value: boolean) => void;
  onSuggestionsSave: () => void;
  onRequestUpgrade: () => void;
  onSaveAppearance: () => void;
  onThemeChange: (theme: WebWidgetTheme) => void;
};

export function WebWidgetAiSettingsControls({
  agentDisplayName,
  canHideBranding,
  canSaveAppearance,
  canSaveLeadForm,
  canUseCustomIcon,
  hidePoweredBy,
  iconUrl,
  leadForm,
  suggestions,
  suggestionsEnabled,
  savedAgentDisplayName,
  savedSuggestions,
  savedSuggestionsEnabled,
  savingBranding,
  savingAppearance,
  savingLeadForm,
  savingSuggestions,
  savingTheme,
  snippet,
  theme,
  uploadingIcon,
  onAgentDisplayNameChange,
  onCopySnippet,
  onDownloadSnippet,
  onHidePoweredByChange,
  onIconFileSelected,
  onIconRemove,
  onLeadFormChange,
  onLeadFormSave,
  onSuggestionsChange,
  onSuggestionsEnabledChange,
  onSuggestionsSave,
  onRequestUpgrade,
  onSaveAppearance,
  onThemeChange,
}: WebWidgetAiSettingsControlsProps) {
  return (
    <div className="grid min-h-0 gap-0 overflow-y-auto lg:grid-cols-[minmax(360px,0.9fr)_1.1fr] lg:overflow-hidden">
      <div className="flex flex-col gap-6 border-b border-border px-8 pt-4 pb-8 lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-10 lg:pt-4 lg:pb-10">
        <div className="divide-y divide-border">
          <div className="py-7 first:pt-0">
            <WebWidgetAppearanceSection
              agentDisplayName={agentDisplayName}
              savedAgentDisplayName={savedAgentDisplayName}
              canSaveAppearance={canSaveAppearance}
              canUseCustomIcon={canUseCustomIcon}
              canHideBranding={canHideBranding}
              hidePoweredBy={hidePoweredBy}
              iconUrl={iconUrl}
              savingBranding={savingBranding}
              savingAppearance={savingAppearance}
              savingTheme={savingTheme}
              theme={theme}
              uploadingIcon={uploadingIcon}
              onAgentDisplayNameChange={onAgentDisplayNameChange}
              onSaveAppearance={onSaveAppearance}
              onHidePoweredByChange={onHidePoweredByChange}
              onIconFileSelected={onIconFileSelected}
              onIconRemove={onIconRemove}
              onRequestUpgrade={onRequestUpgrade}
              onThemeChange={onThemeChange}
            />
          </div>
          <div className="py-7">
            <WebWidgetSuggestionsSection
              suggestions={suggestions}
              enabled={suggestionsEnabled}
              canSave={
                suggestionsEnabled !== savedSuggestionsEnabled ||
                JSON.stringify(suggestions.map((suggestion) => suggestion.trim())) !==
                  JSON.stringify(savedSuggestions)
              }
              saving={savingSuggestions}
              onChange={onSuggestionsChange}
              onEnabledChange={onSuggestionsEnabledChange}
              onSave={onSuggestionsSave}
            />
          </div>
          <div className="py-7">
            <WebWidgetLeadFormSection
              leadForm={leadForm}
              canSave={canSaveLeadForm}
              saving={savingLeadForm}
              onChange={onLeadFormChange}
              onSave={onLeadFormSave}
            />
          </div>
          <section className="space-y-4 pt-7">
            <WebWidgetSettingsSectionHeading
              title="Installation"
              description="Add the widget to your website."
            />
            <WebWidgetScriptArtifact
              code={snippet}
              onCopy={onCopySnippet}
              onDownload={onDownloadSnippet}
            />
          </section>
        </div>
      </div>
      <div className="flex min-h-0 flex-col gap-6 px-8 pt-4 pb-8 lg:overflow-y-auto lg:px-10 lg:pt-4 lg:pb-10">
        <WebWidgetPreview
          className="min-h-[620px] lg:sticky lg:top-0 lg:min-h-0"
          agentName={agentDisplayName || savedAgentDisplayName}
          iconUrl={iconUrl}
          leadForm={leadForm}
          suggestions={suggestions}
          suggestionsEnabled={suggestionsEnabled}
          poweredBy={!canHideBranding || !hidePoweredBy}
          theme={theme}
        />
      </div>
    </div>
  );
}
