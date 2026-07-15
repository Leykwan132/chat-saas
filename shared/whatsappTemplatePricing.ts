export const WHATSAPP_TEMPLATE_RATES_MYR = {
  MARKETING: 0.3467,
  UTILITY: 0.07,
  AUTHENTICATION: 0.04,
} as const;

export function getExactWhatsAppTemplateRateMyr(category: string) {
  const normalizedCategory = category.trim().toUpperCase();
  if (normalizedCategory in WHATSAPP_TEMPLATE_RATES_MYR) {
    return WHATSAPP_TEMPLATE_RATES_MYR[
      normalizedCategory as keyof typeof WHATSAPP_TEMPLATE_RATES_MYR
    ];
  }
  return null;
}
