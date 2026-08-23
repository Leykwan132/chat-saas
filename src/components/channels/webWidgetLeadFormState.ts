import type {
  WebWidgetCustomLeadField,
  WebWidgetLeadForm,
} from "../../../shared/webWidgetExperience";

export type LeadFieldKey = keyof WebWidgetLeadForm["fields"];

export const fieldLabels: Record<LeadFieldKey, string> = {
  name: "Name",
  email: "Email",
  phone: "Phone",
};

export function newCustomField(fields: WebWidgetCustomLeadField[]) {
  const baseId = `field_${Date.now().toString(36)}`;
  const id = fields.some((field) => field.id === baseId)
    ? `${baseId}_${fields.length + 1}`
    : baseId;
  return { id, label: "", type: "text" as const, options: [], required: true };
}

export function isCustomLeadFieldReady(field: WebWidgetCustomLeadField) {
  if (!field.label.trim()) return false;
  if (field.type === "text") return true;
  return new Set(field.options.map((option) => option.trim()).filter(Boolean)).size >= 2;
}

export function confirmCustomLeadField(
  fields: WebWidgetCustomLeadField[],
  field: WebWidgetCustomLeadField,
) {
  const index = fields.findIndex((current) => current.id === field.id);
  if (index === -1) return [...fields, field];
  return fields.map((current) => (current.id === field.id ? field : current));
}
