import type { WebWidgetSuggestions } from "../../../shared/webWidgetSuggestions";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { shouldShowSuggestionsConfiguration } from "./webWidgetConfigurationState";
import { WebWidgetSettingsSectionHeading } from "./WebWidgetSettingsSectionHeading";

type WebWidgetSuggestionsSectionProps = {
  suggestions: WebWidgetSuggestions;
  enabled: boolean;
  canSave: boolean;
  saving: boolean;
  onChange: (suggestions: WebWidgetSuggestions) => void;
  onEnabledChange: (enabled: boolean) => void;
  onSave: () => void;
};

export function WebWidgetSuggestionsSection({
  suggestions,
  enabled,
  canSave,
  saving,
  onChange,
  onEnabledChange,
  onSave,
}: WebWidgetSuggestionsSectionProps) {
  const updateSuggestion = (index: number, value: string) => {
    const next = [...suggestions] as WebWidgetSuggestions;
    next[index] = value;
    onChange(next);
  };

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <WebWidgetSettingsSectionHeading
          title="Suggestions"
          description="Show up to three quick ways for a new visitor to start a chat."
        />
        <Switch
          checked={enabled}
          disabled={saving}
          aria-label="Enable suggestions"
          onCheckedChange={onEnabledChange}
        />
      </div>
      {shouldShowSuggestionsConfiguration(enabled) ? (
        <>
          <div className="grid gap-3">
            {suggestions.map((suggestion, index) => (
              <Field key={index}>
                <FieldLabel htmlFor={`web-widget-suggestion-${index + 1}`}>
                  Suggestion {index + 1}
                </FieldLabel>
                <Input
                  id={`web-widget-suggestion-${index + 1}`}
                  value={suggestion}
                  maxLength={80}
                  onChange={(event) =>
                    updateSuggestion(index, event.currentTarget.value)
                  }
                />
              </Field>
            ))}
          </div>
          <Field orientation="horizontal" className="justify-between">
            <FieldDescription>
              Leave a field empty to hide that button.
            </FieldDescription>
            {canSave ? (
              <Button type="button" size="sm" disabled={saving} onClick={onSave}>
                {saving ? "Saving" : "Save suggestions"}
              </Button>
            ) : null}
          </Field>
        </>
      ) : canSave ? (
        <div className="flex justify-end">
          <Button type="button" size="sm" disabled={saving} onClick={onSave}>
            {saving ? "Saving" : "Save suggestions"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
