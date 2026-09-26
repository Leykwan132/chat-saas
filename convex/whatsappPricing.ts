export type MetaWhatsAppPricing = {
  billable: boolean;
  pricingModel: string;
  type: string;
  category: string;
};

export type WhatsAppPricingSnapshot = MetaWhatsAppPricing & {
  servicePriceMyr?: string;
  recordedAt: number;
};

function servicePriceMyr(): string {
  const value = process.env.WHATSAPP_SERVICE_MESSAGE_PRICE_MYR?.trim();
  if (!value || !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) {
    throw new Error("WHATSAPP_SERVICE_MESSAGE_PRICE_MYR must be a decimal MYR rate");
  }
  return value;
}

export function createWhatsAppPricingSnapshot(
  pricing: MetaWhatsAppPricing,
  recordedAt: number,
): WhatsAppPricingSnapshot {
  return {
    ...pricing,
    ...(pricing.billable && pricing.category === "service"
      ? { servicePriceMyr: servicePriceMyr() }
      : {}),
    recordedAt,
  };
}
