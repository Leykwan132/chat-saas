/**
 * WhatsApp Template Message pricing rates for Malaysia (MYR/RM).
 * Charges differ by template category (Marketing, Utility, Authentication).
 */
export const MARKETING_RATE_MYR = 0.3467;
export const UTILITY_RATE_MYR = 0.07;
export const AUTHENTICATION_RATE_MYR = 0.04;

export const WHATSAPP_RATES_MYR = {
  MARKETING: MARKETING_RATE_MYR,
  UTILITY: UTILITY_RATE_MYR,
  AUTHENTICATION: AUTHENTICATION_RATE_MYR,
} as const;

export function getWhatsAppRateForCategory(category?: string): number {
  if (!category) return UTILITY_RATE_MYR;
  const normalized = category.toUpperCase().trim();
  if (normalized === 'MARKETING') return MARKETING_RATE_MYR;
  if (normalized === 'UTILITY') return UTILITY_RATE_MYR;
  if (normalized === 'AUTHENTICATION') return AUTHENTICATION_RATE_MYR;
  return UTILITY_RATE_MYR; // default fallback
}
