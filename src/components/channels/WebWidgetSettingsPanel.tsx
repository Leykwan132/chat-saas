import { useCallback, useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  isWebWidgetLeadFormValid,
  type WebWidgetLeadForm,
} from "../../../shared/webWidgetExperience";
import type { WebWidgetLayout } from "../../../shared/webWidgetLayouts";
import type { WebWidgetSuggestions } from "../../../shared/webWidgetSuggestions";
import type { WebWidgetTheme } from "../../../shared/webWidgetThemes";
import { useUpgradeModal } from "@/components/upgradeModalContext";
import { WebWidgetAiSettingsControls } from "@/components/channels/WebWidgetAiSettingsControls";
import { buildWebWidgetSnippet } from "@/components/channels/webWidgetSnippet";
import { useWebWidgetIconActions } from "@/components/channels/useWebWidgetIconActions";
import type { TraditionalWidgetSettings } from "./WebWidgetTraditionalPanel";

export type WebWidgetSettings = {
  channelId: Id<"channels">;
  publicKey: string;
  enabled: boolean;
  agentDisplayName: string;
  suggestions: WebWidgetSuggestions;
  suggestionsEnabled: boolean;
  layout: WebWidgetLayout;
  theme: WebWidgetTheme;
  leadForm: WebWidgetLeadForm;
  iconUrl?: string;
  poweredBy: boolean;
  hidePoweredBy: boolean;
  canHideBranding: boolean;
  canUseCustomIcon: boolean;
  traditional: TraditionalWidgetSettings;
};

type WebWidgetSettingsPanelProps = {
  agentId: Id<"agents"> | undefined;
  settings: WebWidgetSettings;
  updateSettings: ReturnType<
    typeof useMutation<typeof api.webWidget.updateSettings>
  >;
  generateIconUploadUrl: ReturnType<
    typeof useMutation<typeof api.webWidget.generateIconUploadUrl>
  >;
  saveIcon: ReturnType<typeof useMutation<typeof api.webWidget.saveIcon>>;
  removeIcon: ReturnType<typeof useMutation<typeof api.webWidget.removeIcon>>;
};

export function WebWidgetSettingsPanel({
  agentId,
  settings,
  updateSettings,
  generateIconUploadUrl,
  saveIcon,
  removeIcon,
}: WebWidgetSettingsPanelProps) {
  const { openUpgradeModal } = useUpgradeModal();
  const [agentDisplayName, setAgentDisplayName] = useState(
    settings.agentDisplayName,
  );
  const [savedAgentDisplayName, setSavedAgentDisplayName] = useState(
    settings.agentDisplayName,
  );
  const [suggestions, setSuggestions] = useState(settings.suggestions);
  const [suggestionsEnabled, setSuggestionsEnabled] = useState(
    settings.suggestionsEnabled,
  );
  const [savedSuggestions, setSavedSuggestions] = useState(settings.suggestions);
  const [savedSuggestionsEnabled, setSavedSuggestionsEnabled] = useState(
    settings.suggestionsEnabled,
  );
  const [leadForm, setLeadForm] = useState(settings.leadForm);
  const [savedLeadForm, setSavedLeadForm] = useState(settings.leadForm);
  const [theme, setTheme] = useState(settings.theme);
  const [hidePoweredBy, setHidePoweredBy] = useState(settings.hidePoweredBy);
  const [savingAppearance, setSavingAppearance] = useState(false);
  const [savingSuggestions, setSavingSuggestions] = useState(false);
  const [savingLeadForm, setSavingLeadForm] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);
  const [savingBranding, setSavingBranding] = useState(false);
  const snippet = buildWebWidgetSnippet(settings.publicKey, "ai_powered");
  const normalizedAgentName = agentDisplayName.trim();
  const appearanceDirty = normalizedAgentName !== savedAgentDisplayName;
  const normalizedSuggestions = suggestions.map((suggestion) => suggestion.trim()) as WebWidgetSuggestions;
  const suggestionsDirty =
    suggestionsEnabled !== savedSuggestionsEnabled ||
    JSON.stringify(normalizedSuggestions) !== JSON.stringify(savedSuggestions);
  const leadFormDirty =
    JSON.stringify(leadForm) !== JSON.stringify(savedLeadForm);
  const leadFormValid = isWebWidgetLeadFormValid(leadForm);
  const { clearIcon, uploadingIcon, uploadIcon } = useWebWidgetIconActions({
    agentId,
    canUseCustomIcon: settings.canUseCustomIcon,
    generateIconUploadUrl,
    removeIcon,
    saveIcon,
  });

  const saveAppearance = useCallback(() => {
    if (!agentId) return;
    if (
      savingAppearance ||
      !normalizedAgentName ||
      !appearanceDirty
    )
      return;
    setSavingAppearance(true);
    void updateSettings({
      agentId,
      agentDisplayName: normalizedAgentName,
    })
      .then(() => {
        setSavedAgentDisplayName(normalizedAgentName);
        toast.success("Web widget appearance updated");
      })
      .catch((error) =>
        toast.error(error instanceof Error ? error.message : String(error)),
      )
      .finally(() => setSavingAppearance(false));
  }, [
    agentId,
    appearanceDirty,
    normalizedAgentName,
    savingAppearance,
    updateSettings,
  ]);

  const saveLeadForm = useCallback(() => {
    if (!agentId || savingLeadForm || !leadFormDirty || !leadFormValid) return;
    setSavingLeadForm(true);
    void updateSettings({ agentId, leadForm })
      .then(() => {
        setSavedLeadForm(leadForm);
        toast.success("Visitor form updated");
      })
      .catch((error) =>
        toast.error(error instanceof Error ? error.message : String(error)),
      )
      .finally(() => setSavingLeadForm(false));
  }, [
    agentId,
    leadFormDirty,
    leadFormValid,
    leadForm,
    savingLeadForm,
    updateSettings,
  ]);

  const saveSuggestions = useCallback(() => {
    if (!agentId || savingSuggestions || !suggestionsDirty) return;
    setSavingSuggestions(true);
    void updateSettings({
      agentId,
      suggestions: normalizedSuggestions,
      suggestionsEnabled,
    })
      .then(() => {
        setSavedSuggestions(normalizedSuggestions);
        setSavedSuggestionsEnabled(suggestionsEnabled);
        toast.success("Widget suggestions updated");
      })
      .catch((error) =>
        toast.error(error instanceof Error ? error.message : String(error)),
      )
      .finally(() => setSavingSuggestions(false));
  }, [
    agentId,
    normalizedSuggestions,
    savingSuggestions,
    suggestionsDirty,
    suggestionsEnabled,
    updateSettings,
  ]);

  const saveTheme = useCallback(
    (nextTheme: WebWidgetTheme) => {
      if (!agentId || nextTheme === theme || savingTheme) return;
      setTheme(nextTheme);
      setSavingTheme(true);
      void updateSettings({ agentId, theme: nextTheme })
        .then(() => toast.success("Widget theme updated"))
        .catch((error) => {
          setTheme(settings.theme);
          toast.error(error instanceof Error ? error.message : String(error));
        })
        .finally(() => setSavingTheme(false));
    },
    [agentId, savingTheme, settings.theme, theme, updateSettings],
  );

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
      void updateSettings({ agentId, hidePoweredBy: nextHidePoweredBy })
        .then(() =>
          toast.success(
            nextHidePoweredBy
              ? "Powered by branding removed"
              : "Powered by branding shown",
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

  const copySnippet = useCallback(() => {
    void navigator.clipboard
      .writeText(snippet)
      .then(() => toast.success("Installation copied"))
      .catch(() => toast.error("Could not copy installation"));
  }, [snippet]);

  const downloadSnippet = useCallback(() => {
    const blob = new Blob([snippet], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "kilobot-widget.html";
    anchor.click();
    URL.revokeObjectURL(url);
  }, [snippet]);

  return (
    <WebWidgetAiSettingsControls
      agentDisplayName={agentDisplayName}
      canHideBranding={settings.canHideBranding}
      canSaveAppearance={appearanceDirty && Boolean(normalizedAgentName)}
      canSaveLeadForm={leadFormDirty && leadFormValid}
      canUseCustomIcon={settings.canUseCustomIcon}
      hidePoweredBy={hidePoweredBy}
      iconUrl={settings.iconUrl}
      leadForm={leadForm}
      suggestions={suggestions}
      suggestionsEnabled={suggestionsEnabled}
      savedAgentDisplayName={settings.agentDisplayName}
      savedSuggestions={savedSuggestions}
      savedSuggestionsEnabled={savedSuggestionsEnabled}
      savingBranding={savingBranding}
      savingAppearance={savingAppearance}
      savingLeadForm={savingLeadForm}
      savingSuggestions={savingSuggestions}
      savingTheme={savingTheme}
      snippet={snippet}
      theme={theme}
      uploadingIcon={uploadingIcon}
      onAgentDisplayNameChange={setAgentDisplayName}
      onCopySnippet={copySnippet}
      onDownloadSnippet={downloadSnippet}
      onHidePoweredByChange={saveBranding}
      onIconFileSelected={uploadIcon}
      onIconRemove={clearIcon}
      onLeadFormChange={setLeadForm}
      onLeadFormSave={saveLeadForm}
      onSuggestionsChange={setSuggestions}
      onSuggestionsEnabledChange={setSuggestionsEnabled}
      onSuggestionsSave={saveSuggestions}
      onRequestUpgrade={openUpgradeModal}
      onSaveAppearance={saveAppearance}
      onThemeChange={saveTheme}
    />
  );
}
