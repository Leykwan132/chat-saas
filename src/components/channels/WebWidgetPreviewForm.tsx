import type { FormEvent } from "react";
import {
  DEFAULT_WEB_WIDGET_LEAD_FORM,
  getWebWidgetCustomLeadFieldInputType,
  type WebWidgetLeadForm,
} from "../../../shared/webWidgetExperience";
import { WebWidgetLeadFormSelect } from "@/components/channels/WebWidgetLeadFormSelect";
import { cn } from "@/lib/utils";

type WebWidgetPreviewFormProps = {
  borderClassName: string;
  leadForm: WebWidgetLeadForm;
  subduedTextClassName: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function WebWidgetPreviewForm({
  borderClassName,
  leadForm,
  subduedTextClassName,
  onSubmit,
}: WebWidgetPreviewFormProps) {
  return (
    <form
      className="flex h-full min-h-0 flex-col overflow-y-auto px-5 pb-5 pt-7 font-sans"
      onSubmit={onSubmit}
    >
      <h3 className="font-sans text-lg font-medium">
        {DEFAULT_WEB_WIDGET_LEAD_FORM.heading}
      </h3>
      <p className={cn("mt-1 font-sans text-sm leading-6", subduedTextClassName)}>
        {DEFAULT_WEB_WIDGET_LEAD_FORM.description}
      </p>
      <div className="mt-5 grid gap-3">
        {(Object.keys(leadForm.fields) as (keyof WebWidgetLeadForm["fields"])[])
          .filter((field) => leadForm.fields[field].visible)
          .map((field) => (
            <label key={field} className="grid gap-1.5 text-sm capitalize">
              <span>
                {field}
                {leadForm.fields[field].required ? (
                  <span className="ml-0.5 text-destructive" aria-hidden="true">
                    *
                  </span>
                ) : null}
              </span>
              <input
                required={leadForm.fields[field].required}
                type={
                  field === "email"
                    ? "email"
                    : field === "phone"
                      ? "tel"
                      : "text"
                }
                className={cn(
                  "h-10 rounded-lg border bg-transparent px-3 text-sm outline-none",
                  borderClassName,
                )}
              />
            </label>
          ))}
        {leadForm.customFields.map((field) => (
          <label key={field.id} className="grid gap-1.5 text-sm">
            <span>
              {field.label}
              {field.required ? (
                <span className="ml-0.5 text-destructive" aria-hidden="true">
                  *
                </span>
              ) : null}
            </span>
            {field.type === "select" ? (
              <WebWidgetLeadFormSelect
                defaultValue=""
                options={field.options}
                required={field.required}
                className={cn(
                  "border bg-transparent",
                  borderClassName,
                )}
              />
            ) : (
              <input
                required={field.required}
                type={getWebWidgetCustomLeadFieldInputType(field.type)}
                className={cn(
                  "h-10 rounded-lg border bg-transparent px-3 text-sm outline-none",
                  borderClassName,
                )}
              />
            )}
          </label>
        ))}
      </div>
      <button
        type="submit"
        className="mt-8 rounded-full bg-blue-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-600"
      >
        {DEFAULT_WEB_WIDGET_LEAD_FORM.submitLabel}
      </button>
    </form>
  );
}
