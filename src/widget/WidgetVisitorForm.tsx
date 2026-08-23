import type { FormEvent } from "react";
import { getWebWidgetCustomLeadFieldInputType } from "../../shared/webWidgetExperience";
import { WebWidgetLeadFormSelect } from "../components/channels/WebWidgetLeadFormSelect";
import type { WidgetConfig, WidgetVisitorProfile } from "./types";

type WidgetVisitorFormProps = {
  leadForm: WidgetConfig["leadForm"];
  profile: WidgetVisitorProfile;
  onChange: (profile: WidgetVisitorProfile) => void;
  onSubmit: () => void;
};

const standardFields = ["name", "email", "phone"] as const;

export function WidgetVisitorForm({
  leadForm,
  profile,
  onChange,
  onSubmit,
}: WidgetVisitorFormProps) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <section className="panel visitor-form">
      <h1 className="visitor-form-title">{leadForm.heading}</h1>
      <p className="visitor-form-description">{leadForm.description}</p>
      <form onSubmit={submit}>
        {standardFields
          .filter((field) => leadForm.fields[field].visible)
          .map((field) => (
            <label key={field}>
              <span>
                {field}
                {leadForm.fields[field].required ? (
                  <span className="required-marker" aria-hidden="true">
                    *
                  </span>
                ) : null}
              </span>
              <input
                value={profile[field]}
                required={leadForm.fields[field].required}
                type={field === "email" ? "email" : field === "phone" ? "tel" : "text"}
                onChange={(event) =>
                  onChange({ ...profile, [field]: event.target.value })
                }
              />
            </label>
          ))}
        {leadForm.customFields.map((field) => (
          <label key={field.id}>
            <span>
              {field.label}
              {field.required ? (
                <span className="required-marker" aria-hidden="true">
                  *
                </span>
              ) : null}
            </span>
            {field.type === "select" ? (
              <WebWidgetLeadFormSelect
                id={`widget-lead-field-${field.id}`}
                name={field.id}
                options={field.options}
                value={profile.customFields[field.id] ?? ""}
                required={field.required}
                onValueChange={(value) =>
                  onChange({
                    ...profile,
                    customFields: {
                      ...profile.customFields,
                      [field.id]: value,
                    },
                  })
                }
              />
            ) : (
              <input
                value={profile.customFields[field.id] ?? ""}
                required={field.required}
                type={getWebWidgetCustomLeadFieldInputType(field.type)}
                onChange={(event) =>
                  onChange({
                    ...profile,
                    customFields: {
                      ...profile.customFields,
                      [field.id]: event.target.value,
                    },
                  })
                }
              />
            )}
          </label>
        ))}
        <button>{leadForm.submitLabel}</button>
      </form>
    </section>
  );
}
