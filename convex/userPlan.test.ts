/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import stripeSchema from "../node_modules/@convex-dev/stripe/dist/component/schema.js";

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

test("new user documents do not persist deprecated billing fields", async () => {
  const t = initTest();
  const workosUserId = "user_without_legacy_billing_fields";

  const storedUser = await t.run(async (ctx) => {
    const { ensureUserAccount } = await import("./teamHelpers");
    const userId = await ensureUserAccount(ctx, {
      workosUserId,
      email: "no-legacy-billing@example.com",
    });
    return await ctx.db.get(userId);
  });

  expect(storedUser).not.toHaveProperty("plan");
  expect(storedUser).not.toHaveProperty("credits");
  expect(storedUser).not.toHaveProperty("purchasedCredits");
  expect(storedUser).not.toHaveProperty("purchasedCreditsGranted");
  expect(storedUser).not.toHaveProperty("creditsPeriodMonthKey");

  const currentUser = await t
    .withIdentity({ subject: workosUserId })
    .query(api.users.currentUser, {});

  expect(currentUser?.plan).toBe("free");
});

test("users schema rejects deprecated billing fields", async () => {
  const t = initTest();

  await expect(
    t.run(async (ctx) => {
      const insertUser = ctx.db.insert as unknown as (
        tableName: "users",
        value: Record<string, unknown>,
      ) => Promise<unknown>;

      await insertUser("users", {
        workosUserId: "user_legacy_billing_fields",
        email: "legacy-billing-fields@example.com",
        credits: 10,
        purchasedCredits: 5,
        purchasedCreditsGranted: 5,
        creditsPeriodMonthKey: "2026-07",
        plan: "growth",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }),
  ).rejects.toThrow();
});

test("schema accepts current user fields", async () => {
  const t = initTest();

  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      workosUserId: "user_current_billing_fields",
      email: "current-billing-fields@example.com",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  const storedUser = await t.run(async (ctx) => {
    return await ctx.db.get(userId);
  });

  expect(storedUser?.workosUserId).toBe("user_current_billing_fields");
});
