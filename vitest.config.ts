import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "edge-runtime",
    env: {
      STRIPE_PRICE_FREE_MONTHLY: "mock_free_mo",
      STRIPE_PRICE_FREE_ANNUAL: "mock_free_yr",
      STRIPE_PRICE_STARTER_MONTHLY: "mock_std_mo",
      STRIPE_PRICE_STARTER_ANNUAL: "mock_std_yr",
      STRIPE_PRICE_GROWTH_MONTHLY: "mock_pro_mo",
      STRIPE_PRICE_GROWTH_ANNUAL: "mock_pro_yr",
      STRIPE_PRICE_BUSINESS_MONTHLY: "mock_ultra_mo",
      STRIPE_PRICE_BUSINESS_ANNUAL: "mock_ultra_yr",
      STRIPE_PRICE_EXTRA_CREDITS_2000: "mock_extra_2000",
      STRIPE_PRICE_EXTRA_CREDITS_5000: "mock_extra_5000",
      STRIPE_PRICE_EXTRA_CREDITS_15000: "mock_extra_15000",
      SKIP_MESSAGE_TEMPLATE_SEND: "true",
      WHATSAPP_BROADCAST_ESTIMATE_MYR_PER_MESSAGE: "0.35",
    },
  },
});
