import {
  getExactWhatsAppTemplateRateMyr,
  WHATSAPP_TEMPLATE_RATES_MYR,
} from '../../shared/whatsappTemplatePricing';

export const MARKETING_RATE_MYR = WHATSAPP_TEMPLATE_RATES_MYR.MARKETING;
export const UTILITY_RATE_MYR = WHATSAPP_TEMPLATE_RATES_MYR.UTILITY;
export const AUTHENTICATION_RATE_MYR = WHATSAPP_TEMPLATE_RATES_MYR.AUTHENTICATION;
export const WHATSAPP_RATES_MYR = WHATSAPP_TEMPLATE_RATES_MYR;

export function getWhatsAppRateForCategory(category?: string): number {
  if (!category) return UTILITY_RATE_MYR;
  return getExactWhatsAppTemplateRateMyr(category) ?? UTILITY_RATE_MYR;
}
