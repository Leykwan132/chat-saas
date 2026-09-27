export type MetaWhatsAppPricing = {
  billable: boolean;
  pricingModel: string;
  type: string;
  category: string;
};

export type WhatsAppPricingSnapshot = MetaWhatsAppPricing & {
  recordedAt: number;
};

export function createWhatsAppPricingSnapshot(
  pricing: MetaWhatsAppPricing,
  recordedAt: number,
): WhatsAppPricingSnapshot {
  return {
    ...pricing,
    recordedAt,
  };
}
