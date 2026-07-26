/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "./schema";
import stripeSchema from "../node_modules/@convex-dev/stripe/dist/component/schema.js";
import workpoolSchema from "../node_modules/@convex-dev/workpool/dist/component/schema.js";

const modules = import.meta.glob("./**/*.ts");
const workpoolModules = {
  complete: () =>
    import("../node_modules/@convex-dev/workpool/dist/component/complete.js"),
  config: () =>
    import("../node_modules/@convex-dev/workpool/dist/component/config.js"),
  crons: () =>
    import("../node_modules/@convex-dev/workpool/dist/component/crons.js"),
  danger: () =>
    import("../node_modules/@convex-dev/workpool/dist/component/danger.js"),
  kick: () =>
    import("../node_modules/@convex-dev/workpool/dist/component/kick.js"),
  lib: () => import("../node_modules/@convex-dev/workpool/dist/component/lib.js"),
  logging: () =>
    import("../node_modules/@convex-dev/workpool/dist/component/logging.js"),
  loop: () =>
    import("../node_modules/@convex-dev/workpool/dist/component/loop.js"),
  recovery: () =>
    import("../node_modules/@convex-dev/workpool/dist/component/recovery.js"),
  stats: () =>
    import("../node_modules/@convex-dev/workpool/dist/component/stats.js"),
  worker: () =>
    import("../node_modules/@convex-dev/workpool/dist/component/worker.js"),
  "_generated/server": () =>
    import("../node_modules/@convex-dev/workpool/dist/component/_generated/server.js"),
};

function initTest() {
  const t = convexTest(schema, modules);
  t.registerComponent("stripe", stripeSchema, {
    public: () =>
      import("../node_modules/@convex-dev/stripe/dist/component/public.js"),
    private: () =>
      import("../node_modules/@convex-dev/stripe/dist/component/private.js"),
    "_generated/server": () =>
      import("../node_modules/@convex-dev/stripe/dist/component/_generated/server.js"),
  });
  t.registerComponent("creditPeriodWorkpool", workpoolSchema, workpoolModules);
  return t;
}

test("deductions remain FIFO across sources and can partially spend referrals", async () => {
  const t = initTest();
  const result = await t.run(async (ctx) => {
    const { ensureFirstCreditPeriod } = await import("./creditPeriodPool");
    const { deductFromUserQuota } = await import("./creditEntries");
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      workosUserId: "fifo-user",
      email: "fifo@example.com",
      createdAt: now,
      updatedAt: now,
    });
    await ensureFirstCreditPeriod(ctx, userId);
    const period = await ctx.db
      .query("userCreditPeriods")
      .withIndex("by_userId_and_periodStart", (q) => q.eq("userId", userId))
      .order("desc")
      .first();
    if (!period) {
      throw new Error("Credit period missing");
    }
    await ctx.db.patch(period._id, {
      usedCredits: period.grantedCredits,
    });
    const purchaseId = await ctx.db.insert("topUpEntries", {
      userId,
      source: "purchase",
      grantedCredits: 800,
      usedCredits: 0,
      createdAt: now + 1,
      updatedAt: now + 1,
    });
    const referralId = await ctx.db.insert("topUpEntries", {
      userId,
      source: "referral",
      grantedCredits: 1000,
      usedCredits: 0,
      createdAt: now + 2,
      updatedAt: now + 2,
    });

    const deduction = await deductFromUserQuota(ctx, userId, 1200);
    return {
      deduction,
      purchase: await ctx.db.get(purchaseId),
      referral: await ctx.db.get(referralId),
    };
  });

  expect(result.deduction.monthlyDeducted).toBe(0);
  expect(result.deduction.topUpDeducted).toBe(1200);
  expect(result.purchase?.usedCredits).toBe(800);
  expect(result.referral?.usedCredits).toBe(400);
});
