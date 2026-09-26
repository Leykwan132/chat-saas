import { afterEach, expect, test } from "vitest";
import {
  createWhatsAppPricingSnapshot,
  type MetaWhatsAppPricing,
} from "./whatsappPricing";

const originalServicePriceMyr = process.env.WHATSAPP_SERVICE_MESSAGE_PRICE_MYR;

afterEach(() => {
  if (originalServicePriceMyr === undefined) {
    delete process.env.WHATSAPP_SERVICE_MESSAGE_PRICE_MYR;
  } else {
    process.env.WHATSAPP_SERVICE_MESSAGE_PRICE_MYR = originalServicePriceMyr;
  }
});

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

test("records Meta free service pricing without a local rate", () => {
  delete process.env.WHATSAPP_SERVICE_MESSAGE_PRICE_MYR;

  expect(createWhatsAppPricingSnapshot(freeServicePricing, 1_790_438_560_000)).toEqual({
    ...freeServicePricing,
    recordedAt: 1_790_438_560_000,
  });
});

test("snapshots the exact configured MYR rate for billed service pricing", () => {
  process.env.WHATSAPP_SERVICE_MESSAGE_PRICE_MYR = "0.00321";

  expect(createWhatsAppPricingSnapshot(billedServicePricing, 1_790_438_560_000)).toEqual({
    ...billedServicePricing,
    servicePriceMyr: "0.00321",
    recordedAt: 1_790_438_560_000,
  });
});

test("rejects a missing or non-decimal rate for billed service pricing", () => {
  delete process.env.WHATSAPP_SERVICE_MESSAGE_PRICE_MYR;
  expect(() => createWhatsAppPricingSnapshot(billedServicePricing, 1)).toThrow(
    "WHATSAPP_SERVICE_MESSAGE_PRICE_MYR",
  );

  process.env.WHATSAPP_SERVICE_MESSAGE_PRICE_MYR = "RM0.00321";
  expect(() => createWhatsAppPricingSnapshot(billedServicePricing, 1)).toThrow(
    "WHATSAPP_SERVICE_MESSAGE_PRICE_MYR",
  );
});

test("does not attach a service rate to another Meta category", () => {
  process.env.WHATSAPP_SERVICE_MESSAGE_PRICE_MYR = "0.00321";
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
