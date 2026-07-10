import { findUnknownTemplateParameters } from "../shared/whatsappTemplateParameters";

function requireTemplateValue(values: Record<string, string>, key: string) {
  const value = values[key]?.trim();
  if (!value) {
    throw new Error(`Missing value for WhatsApp template parameter @${key}.`);
  }
  return value;
}

export function renderWhatsAppTemplateBodyText(
  bodyText: string,
  values: Record<string, string>,
) {
  const unknown = findUnknownTemplateParameters(bodyText);
  if (unknown.length > 0) {
    throw new Error(`Unknown WhatsApp template parameter: ${unknown.join(", ")}`);
  }
  return bodyText
    .replace(
      /(^|[^A-Za-z0-9_])@([a-z][a-z0-9_]*)\b|\{\{([a-z][a-z0-9_]*)\}\}/g,
      (match, prefix: string | undefined, atKey: string | undefined, braceKey: string | undefined) => {
        const key = atKey ?? braceKey;
        if (!key) return match;
        const value = requireTemplateValue(values, key);
        return atKey ? `${prefix ?? ""}${value}` : value;
      },
    )
    .trim();
}
