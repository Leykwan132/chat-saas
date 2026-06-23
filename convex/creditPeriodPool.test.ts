/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import workpoolSchema from "../node_modules/@convex-dev/workpool/dist/component/schema.js";
import stripeSchema from "../node_modules/@convex-dev/stripe/dist/component/schema.js";

import { ensureFirstCreditPeriod } from "./creditPeriodPool";

const modules = import.meta.glob("./**/*.ts");

test("Admin Quota Reset Flow", async () => {
  const t = convexTest(schema, modules);

  // Register Stripe component
  t.registerComponent("stripe", stripeSchema, {
    "public": () => import("../node_modules/@convex-dev/stripe/dist/component/public.js"),
    "private": () => import("../node_modules/@convex-dev/stripe/dist/component/private.js"),
    "_generated/server": () => import("../node_modules/@convex-dev/stripe/dist/component/_generated/server.js"),
  });

  // Register the creditPeriodWorkpool component
  t.registerComponent("creditPeriodWorkpool", workpoolSchema, {
    "complete": () => import("../node_modules/@convex-dev/workpool/dist/component/complete.js"),
    "config": () => import("../node_modules/@convex-dev/workpool/dist/component/config.js"),
    "crons": () => import("../node_modules/@convex-dev/workpool/dist/component/crons.js"),
    "danger": () => import("../node_modules/@convex-dev/workpool/dist/component/danger.js"),
    "kick": () => import("../node_modules/@convex-dev/workpool/dist/component/kick.js"),
    "lib": () => import("../node_modules/@convex-dev/workpool/dist/component/lib.js"),
    "logging": () => import("../node_modules/@convex-dev/workpool/dist/component/logging.js"),
    "loop": () => import("../node_modules/@convex-dev/workpool/dist/component/loop.js"),
    "recovery": () => import("../node_modules/@convex-dev/workpool/dist/component/recovery.js"),
    "stats": () => import("../node_modules/@convex-dev/workpool/dist/component/stats.js"),
    "worker": () => import("../node_modules/@convex-dev/workpool/dist/component/worker.js"),
    "_generated/server": () => import("../node_modules/@convex-dev/workpool/dist/component/_generated/server.js"),
  });

  const workosUserId = "workos-user-admin-test";

  // Create a user in the database
  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      workosUserId,
      email: "admin-test@example.com",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  // Ensure first credit period exists
  await t.run(async (ctx) => {
    await ensureFirstCreditPeriod(ctx, userId);
  });

  // Check the initial period has 500 granted and 0 used credits (default free plan)
  const initialSnapshot = await t.run(async (ctx) => {
    return await ctx.db
      .query("userCreditPeriods")
      .withIndex("by_userId_and_periodStart", (q) => q.eq("userId", userId))
      .unique();
  });
  expect(initialSnapshot).not.toBeNull();
  expect(initialSnapshot?.grantedCredits).toBe(100);
  expect(initialSnapshot?.usedCredits).toBe(0);

  // Simulate spending some credits (e.g. 30 used credits)
  await t.run(async (ctx) => {
    const period = await ctx.db
      .query("userCreditPeriods")
      .withIndex("by_userId_and_periodStart", (q) => q.eq("userId", userId))
      .unique();
    await ctx.db.patch(period!._id, {
      usedCredits: 30,
      updatedAt: Date.now(),
    });
  });

  // Check that spent credits are reflected
  const spentSnapshot = await t.run(async (ctx) => {
    return await ctx.db
      .query("userCreditPeriods")
      .withIndex("by_userId_and_periodStart", (q) => q.eq("userId", userId))
      .unique();
  });
  expect(spentSnapshot?.usedCredits).toBe(30);

  // Trigger admin manual reset
  await t.mutation(internal.creditPeriodPool.resetUserQuotaAdmin, { userId });

  // Verify that the credits are reset back to 0 used and 100 granted
  const resetSnapshot = await t.run(async (ctx) => {
    return await ctx.db
      .query("userCreditPeriods")
      .withIndex("by_userId_and_periodStart", (q) => q.eq("userId", userId))
      .unique();
  });
  expect(resetSnapshot?.usedCredits).toBe(0);
  expect(resetSnapshot?.grantedCredits).toBe(100);

  // Verify an admin_reset or monthly_reset credit log was added
  const logs = await t.run(async (ctx) => {
    return await ctx.db
      .query("creditLogs")
      .withIndex("by_userId_and_createdAt", (q) => q.eq("userId", userId))
      .collect();
  });
  const resetLog = logs.find((l) => l.label === "Admin reset");
  expect(resetLog).toBeDefined();
  expect(resetLog?.eventType).toBe("monthly_reset");
  expect(resetLog?.amount).toBe(30); // reset restored 30 credits
});

test("Batch Admin Quota Reset Flow", async () => {
  const t = convexTest(schema, modules);

  // Register components
  t.registerComponent("stripe", stripeSchema, {
    "public": () => import("../node_modules/@convex-dev/stripe/dist/component/public.js"),
    "private": () => import("../node_modules/@convex-dev/stripe/dist/component/private.js"),
    "_generated/server": () => import("../node_modules/@convex-dev/stripe/dist/component/_generated/server.js"),
  });
  t.registerComponent("creditPeriodWorkpool", workpoolSchema, {
    "complete": () => import("../node_modules/@convex-dev/workpool/dist/component/complete.js"),
    "config": () => import("../node_modules/@convex-dev/workpool/dist/component/config.js"),
    "crons": () => import("../node_modules/@convex-dev/workpool/dist/component/crons.js"),
    "danger": () => import("../node_modules/@convex-dev/workpool/dist/component/danger.js"),
    "kick": () => import("../node_modules/@convex-dev/workpool/dist/component/kick.js"),
    "lib": () => import("../node_modules/@convex-dev/workpool/dist/component/lib.js"),
    "logging": () => import("../node_modules/@convex-dev/workpool/dist/component/logging.js"),
    "loop": () => import("../node_modules/@convex-dev/workpool/dist/component/loop.js"),
    "recovery": () => import("../node_modules/@convex-dev/workpool/dist/component/recovery.js"),
    "stats": () => import("../node_modules/@convex-dev/workpool/dist/component/stats.js"),
    "worker": () => import("../node_modules/@convex-dev/workpool/dist/component/worker.js"),
    "_generated/server": () => import("../node_modules/@convex-dev/workpool/dist/component/_generated/server.js"),
  });

  // Create two users
  const { user1, user2 } = await t.run(async (ctx) => {
    const user1 = await ctx.db.insert("users", {
      workosUserId: "workos-user-batch-1",
      email: "batch-1@example.com",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const user2 = await ctx.db.insert("users", {
      workosUserId: "workos-user-batch-2",
      email: "batch-2@example.com",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { user1, user2 };
  });

  // Ensure first credit period exists for both
  await t.run(async (ctx) => {
    await ensureFirstCreditPeriod(ctx, user1);
    await ensureFirstCreditPeriod(ctx, user2);
  });

  // Simulate spending some credits for both
  await t.run(async (ctx) => {
    const period1 = await ctx.db
      .query("userCreditPeriods")
      .withIndex("by_userId_and_periodStart", (q) => q.eq("userId", user1))
      .unique();
    await ctx.db.patch(period1!._id, {
      usedCredits: 40,
      updatedAt: Date.now(),
    });

    const period2 = await ctx.db
      .query("userCreditPeriods")
      .withIndex("by_userId_and_periodStart", (q) => q.eq("userId", user2))
      .unique();
    await ctx.db.patch(period2!._id, {
      usedCredits: 60,
      updatedAt: Date.now(),
    });
  });

  // Trigger batch reset
  await t.mutation(internal.creditPeriodPool.resetAllUsersQuotaAdmin, {});

  // Verify that the credits are reset back to 0 used
  const p1 = await t.run(async (ctx) => {
    return await ctx.db
      .query("userCreditPeriods")
      .withIndex("by_userId_and_periodStart", (q) => q.eq("userId", user1))
      .unique();
  });
  const p2 = await t.run(async (ctx) => {
    return await ctx.db
      .query("userCreditPeriods")
      .withIndex("by_userId_and_periodStart", (q) => q.eq("userId", user2))
      .unique();
  });

  expect(p1?.usedCredits).toBe(0);
  expect(p2?.usedCredits).toBe(0);
});
