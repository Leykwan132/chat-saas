/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import stripeSchema from "../node_modules/@convex-dev/stripe/dist/component/schema.js";
import { EXTRA_CREDITS_PACKS } from "../shared/extraCreditsCatalog";

const modules = import.meta.glob("./**/*.ts");
const stripeModules = {
  public: () => import("../node_modules/@convex-dev/stripe/dist/component/public.js"),
  private: () => import("../node_modules/@convex-dev/stripe/dist/component/private.js"),
  "_generated/server": () => import("../node_modules/@convex-dev/stripe/dist/component/_generated/server.js"),
};

function initTest() {
  const t = convexTest(schema, modules);
  t.registerComponent("stripe", stripeSchema, stripeModules);
  return t;
}

test("Stripe top-up processing grants each configured credit package", async () => {
  for (const pack of EXTRA_CREDITS_PACKS) {
    const t = initTest();
    const workosUserId = `user_topup_${pack.id}`;
    const paymentIntentId = `pi_${pack.id}`;

    const userId = await t.run(async (ctx) => {
      const now = Date.now();
      return await ctx.db.insert("users", {
        workosUserId,
        email: `${workosUserId}@example.com`,
        createdAt: now,
        updatedAt: now,
      });
    });

    const result = await t.mutation(internal.stripe.handlePaymentIntentSucceededInternal, {
      stripePaymentIntentId: paymentIntentId,
      orgId: workosUserId,
      creditsToGrant: pack.credits,
    });

    expect(result).toEqual({ success: true, alreadyProcessed: false });

    const state = await t.run(async (ctx) => {
      const topUps = await ctx.db
        .query("topUpEntries")
        .withIndex("by_userId_and_createdAt", (q) => q.eq("userId", userId))
        .collect();
      const logs = await ctx.db
        .query("creditLogs")
        .withIndex("by_userId_and_eventType_and_createdAt", (q) =>
          q.eq("userId", userId).eq("eventType", "top_up"),
        )
        .collect();
      const processed = await ctx.db
        .query("processedStripePayments")
        .withIndex("by_stripePaymentIntentId", (q) =>
          q.eq("stripePaymentIntentId", paymentIntentId),
        )
        .unique();
      return { topUps, logs, processed };
    });

    expect(state.topUps).toHaveLength(1);
    expect(state.topUps[0]).toMatchObject({
      userId,
      source: "purchase",
      grantedCredits: pack.credits,
      usedCredits: 0,
      stripePaymentIntentId: paymentIntentId,
    });
    expect(state.logs).toHaveLength(1);
    expect(state.logs[0]).toMatchObject({
      userId,
      eventType: "top_up",
      amount: pack.credits,
      purchasedCreditsBefore: 0,
      purchasedCreditsAfter: pack.credits,
      stripePaymentIntentId: paymentIntentId,
      creditCost: pack.credits,
    });
    expect(state.processed).toMatchObject({
      stripePaymentIntentId: paymentIntentId,
      orgId: workosUserId,
      creditsGranted: pack.credits,
    });

    const purchaseHistory = await t
      .withIdentity({ subject: workosUserId })
      .query(api.billingAddOns.listAddOnPurchaseHistory, {});

    expect(purchaseHistory).toHaveLength(1);
    expect(purchaseHistory[0]).toMatchObject({
      credits: pack.credits,
      priceRm: pack.priceRm,
      stripePaymentIntentId: paymentIntentId,
    });
  }
});

test("Stripe top-up processing is idempotent for duplicate webhooks", async () => {
  const t = initTest();
  const workosUserId = "user_topup_duplicate";
  const paymentIntentId = "pi_duplicate_topup";

  const userId = await t.run(async (ctx) => {
    const now = Date.now();
    return await ctx.db.insert("users", {
      workosUserId,
      email: "duplicate-topup@example.com",
      createdAt: now,
      updatedAt: now,
    });
  });

  const firstResult = await t.mutation(internal.stripe.handlePaymentIntentSucceededInternal, {
    stripePaymentIntentId: paymentIntentId,
    orgId: workosUserId,
    creditsToGrant: 5000,
  });
  const secondResult = await t.mutation(internal.stripe.handlePaymentIntentSucceededInternal, {
    stripePaymentIntentId: paymentIntentId,
    orgId: workosUserId,
    creditsToGrant: 5000,
  });

  expect(firstResult).toEqual({ success: true, alreadyProcessed: false });
  expect(secondResult).toEqual({ success: true, alreadyProcessed: true });

  const counts = await t.run(async (ctx) => {
    const topUps = await ctx.db
      .query("topUpEntries")
      .withIndex("by_userId_and_createdAt", (q) => q.eq("userId", userId))
      .collect();
    const logs = await ctx.db
      .query("creditLogs")
      .withIndex("by_userId_and_eventType_and_createdAt", (q) =>
        q.eq("userId", userId).eq("eventType", "top_up"),
      )
      .collect();
    const processed = await ctx.db
      .query("processedStripePayments")
      .withIndex("by_stripePaymentIntentId", (q) =>
        q.eq("stripePaymentIntentId", paymentIntentId),
      )
      .collect();
    return { topUps: topUps.length, logs: logs.length, processed: processed.length };
  });

  expect(counts).toEqual({ topUps: 1, logs: 1, processed: 1 });
});
