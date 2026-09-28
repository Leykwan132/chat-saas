import { expect, test } from "vitest";
import {
  createWhatsAppPricingSnapshot,
  type MetaWhatsAppPricing,
} from "./whatsappPricing";

const freeServicePricing: MetaWhatsAppPricing = {
  billable: false,
  pricingModel: "PMP",
  type: "free_customer_service",
  category: "service",
};

const billedServicePricing: MetaWhatsAppPricing = {
  billable: true,
  pricingModel: "PMP",
  type: "regular",
  category: "service",
};

test("records Meta service pricing without a local rate", () => {
  expect(createWhatsAppPricingSnapshot(freeServicePricing, 1_790_438_560_000)).toEqual({
    ...freeServicePricing,
    recordedAt: 1_790_438_560_000,
  });

  expect(createWhatsAppPricingSnapshot(billedServicePricing, 1_790_438_560_000)).toEqual({
    ...billedServicePricing,
    recordedAt: 1_790_438_560_000,
  });
});

test("preserves complete Meta pricing for another category", () => {
  const pricing: MetaWhatsAppPricing = {
    billable: true,
    pricingModel: "PMP",
    type: "regular",
    category: "utility",
  };

  expect(createWhatsAppPricingSnapshot(pricing, 1)).toEqual({
    ...pricing,
    recordedAt: 1,
  });
});
