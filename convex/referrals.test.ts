/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { beforeEach, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import stripeSchema from "../node_modules/@convex-dev/stripe/dist/component/schema.js";
import workpoolSchema from "../node_modules/@convex-dev/workpool/dist/component/schema.js";

const modules = import.meta.glob("./**/*.ts");
const stripeModules = {
  public: () => import("../node_modules/@convex-dev/stripe/dist/component/public.js"),
  private: () => import("../node_modules/@convex-dev/stripe/dist/component/private.js"),
  "_generated/server": () =>
    import("../node_modules/@convex-dev/stripe/dist/component/_generated/server.js"),
};
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
  t.registerComponent("stripe", stripeSchema, stripeModules);
  t.registerComponent("creditPeriodWorkpool", workpoolSchema, workpoolModules);
  return t;
}

async function createUser(
  t: ReturnType<typeof initTest>,
  workosUserId: string,
  email: string,
) {
  return await t.run(async (ctx) => {
    const { ensureUserAccount } = await import("./teamHelpers");
    return await ensureUserAccount(ctx, { workosUserId, email });
  });
}

beforeEach(() => {
  process.env.REFERRAL_REWARD_CREDITS = "1000";
  process.env.REFERRAL_MAX_SUCCESSFUL_REFERRALS = "10";
});

test("new accounts receive one stable referral code and program overview", async () => {
  const t = initTest();
  await createUser(t, "referrer", "referrer@example.com");

  const first = await t
    .withIdentity({ subject: "referrer" })
    .query(api.referrals.getMyOverview, {});
  const second = await t
    .withIdentity({ subject: "referrer" })
    .query(api.referrals.getMyOverview, {});

  expect(first).toMatchObject({
    successfulReferralCount: 0,
    maxSuccessfulReferrals: 10,
    rewardCredits: 1000,
    historicalCreditsEarned: 0,
    remainingSlots: 10,
    remainingPotentialCredits: 10000,
    isCapped: false,
  });
  expect(first.code).toMatch(/^KILO-[A-HJ-NP-Z2-9]{8}$/);
  expect(second.code).toBe(first.code);
});

test("onboarding atomically grants referral credits to both accounts", async () => {
  const t = initTest();
  const referrerUserId = await createUser(
    t,
    "referrer",
    "referrer@example.com",
  );
  const referredUserId = await createUser(
    t,
    "referred",
    "newperson@example.com",
  );
  const referrer = t.withIdentity({ subject: "referrer" });
  const referred = t.withIdentity({ subject: "referred" });
  const overview = await referrer.query(api.referrals.getMyOverview, {});

  expect(
    await referred.query(api.referrals.validateCode, { code: overview.code }),
  ).toEqual({
    status: "valid",
    rewardCredits: 1000,
    maxSuccessfulReferrals: 10,
  });

  const completion = await referred.mutation(api.users.completeOnboarding, {
    role: "Founder",
    useCase: ["Support"],
    channels: ["Web Widget/API"],
    referralCode: overview.code,
  });

  expect(completion).toEqual({
    success: true,
    referralRewardCredits: 1000,
  });

  const state = await t.run(async (ctx) => {
    const referrerEntries = await ctx.db
      .query("topUpEntries")
      .withIndex("by_userId_and_createdAt", (q) =>
        q.eq("userId", referrerUserId),
      )
      .collect();
    const referredEntries = await ctx.db
      .query("topUpEntries")
      .withIndex("by_userId_and_createdAt", (q) =>
        q.eq("userId", referredUserId),
      )
      .collect();
    const redemptions = await ctx.db
      .query("referralRedemptions")
      .withIndex("by_referredUserId", (q) =>
        q.eq("referredUserId", referredUserId),
      )
      .collect();
    return { referrerEntries, referredEntries, redemptions };
  });

  expect(state.referrerEntries).toHaveLength(1);
  expect(state.referrerEntries[0]).toMatchObject({
    source: "referral",
    grantedCredits: 1000,
    usedCredits: 0,
    label: "Referral reward",
  });
  expect(state.referredEntries).toHaveLength(1);
  expect(state.referredEntries[0]).toMatchObject({
    source: "referral",
    grantedCredits: 1000,
    usedCredits: 0,
    label: "Referral reward",
  });
  expect(state.redemptions).toHaveLength(1);
  expect(state.redemptions[0]).toMatchObject({
    referrerUserId,
    referredUserId,
    rewardCredits: 1000,
  });

  const updatedOverview = await referrer.query(api.referrals.getMyOverview, {});
  expect(updatedOverview).toMatchObject({
    successfulReferralCount: 1,
    historicalCreditsEarned: 1000,
    remainingSlots: 9,
    remainingPotentialCredits: 9000,
  });

  const history = await referrer.query(api.referrals.listMyReferralHistory, {
    paginationOpts: { cursor: null, numItems: 10 },
  });
  expect(history.page).toEqual([
    {
      redemptionId: expect.any(String),
      maskedEmail: "n***@example.com",
      completedAt: expect.any(Number),
      rewardCredits: 1000,
    },
  ]);
});

test("onboarding retries do not duplicate a committed referral", async () => {
  const t = initTest();
  await createUser(t, "referrer", "referrer@example.com");
  await createUser(t, "referred", "referred@example.com");
  const overview = await t
    .withIdentity({ subject: "referrer" })
    .query(api.referrals.getMyOverview, {});
  const referred = t.withIdentity({ subject: "referred" });
  const args = {
    role: "Founder",
    useCase: ["Support"],
    channels: ["Web Widget/API"],
    referralCode: overview.code,
  };

  const first = await referred.mutation(api.users.completeOnboarding, args);
  const second = await referred.mutation(api.users.completeOnboarding, args);

  expect(first.referralRewardCredits).toBe(1000);
  expect(second.referralRewardCredits).toBe(1000);

  const redemptionCount = await t.run(async (ctx) => {
    const referredUser = await ctx.db
      .query("users")
      .withIndex("by_workosUserId", (q) => q.eq("workosUserId", "referred"))
      .unique();
    if (!referredUser) {
      throw new Error("Referred user missing");
    }
    return (
      await ctx.db
        .query("referralRedemptions")
        .withIndex("by_referredUserId", (q) =>
          q.eq("referredUserId", referredUser._id),
        )
        .collect()
    ).length;
  });
  expect(redemptionCount).toBe(1);
});

test("self-owned and capped codes are rejected before onboarding", async () => {
  process.env.REFERRAL_MAX_SUCCESSFUL_REFERRALS = "1";
  const t = initTest();
  await createUser(t, "referrer", "referrer@example.com");
  await createUser(t, "first", "first@example.com");
  await createUser(t, "second", "second@example.com");
  const referrer = t.withIdentity({ subject: "referrer" });
  const overview = await referrer.query(api.referrals.getMyOverview, {});

  expect(
    await referrer.query(api.referrals.validateCode, { code: overview.code }),
  ).toEqual({ status: "self_referral" });

  await t.withIdentity({ subject: "first" }).mutation(
    api.users.completeOnboarding,
    {
      role: "Founder",
      useCase: ["Support"],
      channels: ["Web Widget/API"],
      referralCode: overview.code,
    },
  );

  expect(
    await t
      .withIdentity({ subject: "second" })
      .query(api.referrals.validateCode, { code: overview.code }),
  ).toEqual({ status: "limit_reached" });
});
