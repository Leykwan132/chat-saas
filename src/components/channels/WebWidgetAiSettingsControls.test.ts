import { expect, test } from "vitest";
import appearanceSource from "./WebWidgetAppearanceSection.tsx?raw";
import brandingSource from "./WebWidgetBrandingSection.tsx?raw";
import controlsSource from "./WebWidgetAiSettingsControls.tsx?raw";
import customLeadFieldSource from "./WebWidgetCustomLeadFieldRow.tsx?raw";
import leadFormSource from "./WebWidgetLeadFormSection.tsx?raw";
import settingsPanelSource from "./WebWidgetSettingsPanel.tsx?raw";
import suggestionsSource from "./WebWidgetSuggestionsSection.tsx?raw";
import themeSource from "./WebWidgetThemePicker.tsx?raw";

test("AI-powered settings use prominent plain sections instead of nested cards", () => {
  expect(controlsSource).toContain('className="divide-y divide-border"');
  expect(controlsSource).not.toContain("<FieldGroup>");

  for (const source of [
    appearanceSource,
    leadFormSource,
    suggestionsSource,
  ]) {
    expect(source).toContain("WebWidgetSettingsSectionHeading");
  }

  expect(brandingSource).not.toContain("rounded-lg border border-border bg-card");
});

test("AI-powered appearance keeps branding in the left column without helper copy", () => {
  expect(appearanceSource).toContain("WebWidgetThemePicker");
  expect(appearanceSource).toContain("WebWidgetBrandingSection");
  expect(appearanceSource).not.toContain("web-widget-placeholder");
  expect(controlsSource).not.toContain("<WebWidgetThemePicker");
  expect(controlsSource).not.toContain("<WebWidgetBrandingSection");
  expect(themeSource).toContain("h-9");
  expect(themeSource).not.toContain("min-h-[104px]");
  expect(controlsSource).toContain("lg:sticky lg:top-0");
  expect(appearanceSource).not.toContain("border-t border-border");
  expect(brandingSource).not.toContain("border-t border-border");
  expect(appearanceSource).toContain('className="grid gap-6 lg:grid-cols-2"');
  expect(appearanceSource).toContain('label="Name"');
  expect(appearanceSource).toContain('max-w-[14rem]');
  expect(appearanceSource).toContain(
    'className="grid gap-4">\n          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">',
  );
  expect(appearanceSource.indexOf("Save appearance")).toBeLessThan(
    appearanceSource.indexOf("<WebWidgetBrandingSection"),
  );
  expect(brandingSource).not.toContain(
    "Hide Powered by Kilobot in the website widget.",
  );
  expect(brandingSource).toContain('className="flex items-center gap-3"');
  expect(brandingSource).not.toContain("justify-between");
  expect(appearanceSource).toContain("Save appearance");
});

test("AI-powered visitor forms configure standard and custom details", () => {
  expect(leadFormSource).toContain(
    '<Badge className="bg-emerald-600 text-white hover:bg-emerald-600">',
  );
  expect(leadFormSource).not.toContain("What should we collect?");
  expect(leadFormSource).toContain("Add field");
  expect(customLeadFieldSource).toContain("Dropdown options");
  expect(leadFormSource).toContain("rounded-lg border border-border");
  expect(leadFormSource).not.toContain("Selected fields are required.");
  expect(leadFormSource).not.toContain("web-widget-form-heading");
  expect(leadFormSource).not.toContain("web-widget-form-description");
  expect(leadFormSource).not.toContain("web-widget-form-submit");
  expect(leadFormSource).not.toContain("Visible");
  expect(leadFormSource).toContain("Required");
  expect(leadFormSource).toContain("Optional");
  expect(leadFormSource).toContain(
    'configuration.required ? "Required" : "Optional"',
  );
  expect(leadFormSource).toContain('className="size-4 text-destructive"');
  expect(leadFormSource).toContain(
    'aria-label={`Remove ${fieldLabels[field]}`}',
  );
  expect(leadFormSource).toContain(
    'className="divide-y divide-border px-4"',
  );
  expect(leadFormSource).toContain(
    'className="flex items-center justify-between gap-3 py-3 text-sm text-foreground"',
  );
  expect(leadFormSource).not.toContain("sm:grid-cols-3");
  expect(leadFormSource).toContain("{canSave ? (");
  expect(leadFormSource).not.toContain("disabled={!canSave || saving}");
});

test("AI-powered visitor-form save state resets after a successful save", () => {
  expect(settingsPanelSource).toContain("const [savedLeadForm, setSavedLeadForm]");
  expect(settingsPanelSource).toContain("setSavedLeadForm(leadForm)");
});

test("AI-powered appearance save state resets after a successful save", () => {
  expect(settingsPanelSource).toContain(
    "const [savedAgentDisplayName, setSavedAgentDisplayName]",
  );
  expect(settingsPanelSource).toContain(
    "setSavedAgentDisplayName(normalizedAgentName)",
  );
});

test("AI-powered settings place Visitor form below Suggestions", () => {
  expect(controlsSource.indexOf("<WebWidgetSuggestionsSection")).toBeLessThan(
    controlsSource.indexOf("<WebWidgetLeadFormSection"),
  );
});

test("AI-powered suggestions omit the optional badge", () => {
  expect(suggestionsSource).not.toContain('<Badge variant="secondary">Optional</Badge>');
  expect(suggestionsSource).toContain("{canSave ? (");
  expect(suggestionsSource).not.toContain("disabled={!canSave || saving}");
});
