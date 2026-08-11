/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { beforeAll, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import stripeSchema from "../node_modules/@convex-dev/stripe/dist/component/schema.js";

const modules = import.meta.glob("./**/*.ts");

beforeAll(() => {
  process.env.STRIPE_PRICE_STARTER_MONTHLY = "price_starter_monthly";
  process.env.STRIPE_PRICE_STARTER_ANNUAL = "price_starter_annual";
  process.env.STRIPE_PRICE_GROWTH_MONTHLY = "price_growth_monthly";
  process.env.STRIPE_PRICE_GROWTH_ANNUAL = "price_growth_annual";
  process.env.STRIPE_PRICE_BUSINESS_MONTHLY = "price_business_monthly";
  process.env.STRIPE_PRICE_BUSINESS_ANNUAL = "price_business_annual";
  process.env.STRIPE_PRICE_EXTRA_CREDITS_2000 = "price_extra_credits_2000";
  process.env.STRIPE_PRICE_EXTRA_CREDITS_5000 = "price_extra_credits_5000";
  process.env.STRIPE_PRICE_EXTRA_CREDITS_15000 = "price_extra_credits_15000";
});

const stripeModules = {
  public: () => import("../node_modules/@convex-dev/stripe/dist/component/public.js"),
  private: () => import("../node_modules/@convex-dev/stripe/dist/component/private.js"),
  "_generated/server": () =>
    import("../node_modules/@convex-dev/stripe/dist/component/_generated/server.js"),
};

test("public config and AI messages use the requested snippet mode", async () => {
  const t = convexTest(schema, modules);
  t.registerComponent("stripe", stripeSchema, stripeModules);
  const publicKey = "pub_widget_modes";

  await t.run(async (ctx) => {
    const now = Date.now();
    const agentId = await ctx.db.insert("agents", {
      name: "Site Agent",
      provider: "openrouter",
      model: "deepseek/deepseek-v4-flash",
      systemPrompt: "Answer website visitors.",
      templateKey: "blank",
      fileSize: 0,
      userId: "user_widget_modes",
      orgId: "",
      createdAt: now,
      updatedAt: now,
    });
    const webChannelId = await ctx.db.insert("channels", {
      orgId: "",
      service: "web",
      status: "connected",
      connectedByUserId: "user_widget_modes",
      defaultAgentId: agentId,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("channels", {
      orgId: "",
      service: "whatsapp",
      phoneNumberId: "phone-widget-modes",
      displayPhoneNumber: "+1 555 012 3456",
      displayUsername: "Kilobot Support",
      accessToken: "token-widget-modes",
      status: "connected",
      connectedByUserId: "user_widget_modes",
      defaultAgentId: agentId,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("webWidgetSettings", {
      channelId: webChannelId,
      agentId,
      orgId: "",
      connectedByUserId: "user_widget_modes",
      publicKey,
      enabled: true,
      agentDisplayName: "Site Agent",
      layout: "input_bar",
      theme: "light",
      mode: "traditional",
      createdAt: now,
      updatedAt: now,
    });
  });

  const aiConfig = await t.query(api.webWidget.publicGetConfig, {
    publicKey,
    mode: "ai_powered",
  });
  const traditionalConfig = await t.query(api.webWidget.publicGetConfig, {
    publicKey,
    mode: "traditional",
  });
  const legacyConfig = await t.query(api.webWidget.publicGetConfig, { publicKey });
  const messages = await t.query(api.webWidget.publicListMessages, {
    publicKey,
    visitorId: "visitor-mode-test",
  });

  expect(aiConfig.mode).toBe("ai_powered");
  expect(traditionalConfig.mode).toBe("traditional");
  expect(legacyConfig.mode).toBe("ai_powered");
  expect(messages).toEqual([]);
});
