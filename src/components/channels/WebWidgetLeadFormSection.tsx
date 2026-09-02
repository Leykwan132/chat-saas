import type {
  WebWidgetCustomLeadField,
  WebWidgetLeadForm,
} from "../../../shared/webWidgetExperience";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { shouldShowVisitorFormConfiguration } from "./webWidgetConfigurationState";
import { WebWidgetCustomLeadFieldRow } from "./WebWidgetCustomLeadFieldRow";
import {
  confirmCustomLeadField,
  fieldLabels,
  newCustomField,
  type LeadFieldKey,
} from "./webWidgetLeadFormState";
import { WebWidgetSettingsSectionHeading } from "./WebWidgetSettingsSectionHeading";

type WebWidgetLeadFormSectionProps = {
  leadForm: WebWidgetLeadForm;
  canSave: boolean;
  saving: boolean;
  onChange: (leadForm: WebWidgetLeadForm) => void;
  onSave: () => void;
};

export function WebWidgetLeadFormSection({
  leadForm,
  canSave,
  saving,
  onChange,
  onSave,
}: WebWidgetLeadFormSectionProps) {
  const [customFieldDrafts, setCustomFieldDrafts] = useState<
    Record<string, WebWidgetCustomLeadField>
  >({});

  const updateFieldRequirement = (field: LeadFieldKey, required: boolean) => {
    onChange({
      ...leadForm,
      fields: {
        ...leadForm.fields,
        [field]: { visible: true, required },
      },
    });
  };

  const removeField = (field: LeadFieldKey) => {
    onChange({
      ...leadForm,
      fields: {
        ...leadForm.fields,
        [field]: { visible: false, required: false },
      },
    });
  };

  const updateCustomField = (
    fieldId: string,
    update: (field: WebWidgetCustomLeadField) => WebWidgetCustomLeadField,
  ) => {
    onChange({
      ...leadForm,
      customFields: leadForm.customFields.map((field) =>
        field.id === fieldId ? update(field) : field,
      ),
    });
  };

  const updateCustomFieldDraft = (
    fieldId: string,
    update: (field: WebWidgetCustomLeadField) => WebWidgetCustomLeadField,
  ) => {
    setCustomFieldDrafts((current) => ({
      ...current,
      [fieldId]: update(current[fieldId]),
    }));
  };

  const confirmCustomField = (fieldId: string) => {
    const field = customFieldDrafts[fieldId];
    if (field === undefined) return;
    onChange({
      ...leadForm,
      customFields: confirmCustomLeadField(leadForm.customFields, field),
    });
    setCustomFieldDrafts((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([currentFieldId]) => currentFieldId !== fieldId),
      ),
    );
  };

  const editCustomField = (fieldId: string) => {
    const field = leadForm.customFields.find((current) => current.id === fieldId);
    if (field === undefined) return;
    setCustomFieldDrafts((current) => ({ ...current, [fieldId]: field }));
  };

  const removeCustomField = (fieldId: string) => {
    if (leadForm.customFields.some((field) => field.id === fieldId)) {
      onChange({
        ...leadForm,
        customFields: leadForm.customFields.filter((field) => field.id !== fieldId),
      });
    }
    setCustomFieldDrafts((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([currentFieldId]) => currentFieldId !== fieldId),
      ),
    );
  };

  const addCustomField = () => {
    const field = newCustomField([
      ...leadForm.customFields,
      ...Object.values(customFieldDrafts),
    ]);
    setCustomFieldDrafts((current) => ({ ...current, [field.id]: field }));
  };

  const customFields = [
    ...leadForm.customFields.map((field) => customFieldDrafts[field.id] ?? field),
    ...Object.values(customFieldDrafts).filter(
      (field) => !leadForm.customFields.some((current) => current.id === field.id),
    ),
  ];

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <WebWidgetSettingsSectionHeading
          title="Visitor form"
          description="Collect contact details before a new visitor begins chatting."
          badge={
            <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
              Recommended
            </Badge>
          }
        />
        <Switch
          checked={leadForm.enabled}
          disabled={saving}
          aria-label="Enable visitor form"
          onCheckedChange={(enabled) => onChange({ ...leadForm, enabled })}
        />
      </div>
      {shouldShowVisitorFormConfiguration(leadForm.enabled) ? (
        <>
          <div className="rounded-lg border border-border">
            <div className="divide-y divide-border px-4">
              {(Object.keys(fieldLabels) as LeadFieldKey[])
                .filter((field) => leadForm.fields[field].visible)
                .map((field) => {
                  const configuration = leadForm.fields[field];
                  return (
                  <div
                    key={field}
                    className="flex items-center justify-between gap-3 py-3 text-sm text-foreground"
                  >
                    <span>{fieldLabels[field]}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {configuration.required ? "Required" : "Optional"}
                      </span>
                      <Switch
                        checked={configuration.required}
                        disabled={saving}
                        aria-label={`Require ${fieldLabels[field]}`}
                        onCheckedChange={(required) =>
                          updateFieldRequirement(field, required)
                        }
                      />
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        disabled={saving}
                        aria-label={`Remove ${fieldLabels[field]}`}
                        onClick={() => removeField(field)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  );
                })}
              {customFields.map((field) => (
                <WebWidgetCustomLeadFieldRow
                  key={field.id}
                  field={field}
                  editing={customFieldDrafts[field.id] !== undefined}
                  saving={saving}
                  onChange={(update) =>
                    customFieldDrafts[field.id] === undefined
                      ? updateCustomField(field.id, update)
                      : updateCustomFieldDraft(field.id, update)
                  }
                  onConfirm={() => confirmCustomField(field.id)}
                  onEdit={() => editCustomField(field.id)}
                  onRemove={() => removeCustomField(field.id)}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={saving}
              onClick={addCustomField}
            >
              <Plus className="size-4" />
              Add field
            </Button>
            {canSave ? (
              <Button type="button" size="sm" disabled={saving} onClick={onSave}>
                {saving ? "Saving" : "Save form"}
              </Button>
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  );
}
