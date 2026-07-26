/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { beforeEach, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import stripeSchema from "../node_modules/@convex-dev/stripe/dist/component/schema.js";
import workpoolSchema from "../node_modules/@convex-dev/workpool/dist/component/schema.js";

const modules = import.meta.glob("./**/*.ts");
const stripeModules = {
  public: () =>
    import("../node_modules/@convex-dev/stripe/dist/component/public.js"),
  private: () =>
    import("../node_modules/@convex-dev/stripe/dist/component/private.js"),
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
) {
  await t.run(async (ctx) => {
    const { ensureUserAccount } = await import("./teamHelpers");
    await ensureUserAccount(ctx, {
      workosUserId,
      email: `${workosUserId}@example.com`,
    });
  });
}

function onboardingArgs(referralCode: string) {
  return {
    role: "Founder",
    useCase: ["Support"],
    channels: ["Web Widget/API"],
    referralCode,
  };
}

beforeEach(() => {
  process.env.REFERRAL_REWARD_CREDITS = "1000";
  process.env.REFERRAL_MAX_SUCCESSFUL_REFERRALS = "10";
});

test("configuration changes apply only to future referral awards", async () => {
  const t = initTest();
  await createUser(t, "referrer");
  await createUser(t, "first");
  await createUser(t, "second");
  const referrer = t.withIdentity({ subject: "referrer" });
  const { code } = await referrer.query(api.referrals.getMyOverview, {});

  await t
    .withIdentity({ subject: "first" })
    .mutation(api.users.completeOnboarding, onboardingArgs(code));
  process.env.REFERRAL_REWARD_CREDITS = "2500";
  await t
    .withIdentity({ subject: "second" })
    .mutation(api.users.completeOnboarding, onboardingArgs(code));

  const history = await referrer.query(api.referrals.listMyReferralHistory, {
    paginationOpts: { cursor: null, numItems: 10 },
  });
  const overview = await referrer.query(api.referrals.getMyOverview, {});

  expect(history.page.map((item) => item.rewardCredits).sort()).toEqual([
    1000, 2500,
  ]);
  expect(overview.historicalCreditsEarned).toBe(3500);
  expect(overview.rewardCredits).toBe(2500);
});

test("invalid final validation rolls back onboarding and all awards", async () => {
  const t = initTest();
  await createUser(t, "referred");

  await expect(
    t
      .withIdentity({ subject: "referred" })
      .mutation(
        api.users.completeOnboarding,
        onboardingArgs("KILO-ABCDEFGH"),
      ),
  ).rejects.toThrow();

  const state = await t.run(async (ctx) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_workosUserId", (q) => q.eq("workosUserId", "referred"))
      .unique();
    const redemptions = await ctx.db.query("referralRedemptions").collect();
    const entries = await ctx.db.query("topUpEntries").collect();
    return { onboarded: user?.onboarded, redemptions, entries };
  });

  expect(state.onboarded).not.toBe(true);
  expect(state.redemptions).toHaveLength(0);
  expect(state.entries).toHaveLength(0);
});

test("concurrent redemptions cannot exceed the configured cap", async () => {
  process.env.REFERRAL_MAX_SUCCESSFUL_REFERRALS = "1";
  const t = initTest();
  await createUser(t, "referrer");
  await createUser(t, "first");
  await createUser(t, "second");
  const { code } = await t
    .withIdentity({ subject: "referrer" })
    .query(api.referrals.getMyOverview, {});

  const outcomes = await Promise.allSettled([
    t
      .withIdentity({ subject: "first" })
      .mutation(api.users.completeOnboarding, onboardingArgs(code)),
    t
      .withIdentity({ subject: "second" })
      .mutation(api.users.completeOnboarding, onboardingArgs(code)),
  ]);
  const redemptionCount = await t.run(
    async (ctx) => (await ctx.db.query("referralRedemptions").collect()).length,
  );

  expect(outcomes.filter((result) => result.status === "fulfilled")).toHaveLength(
    1,
  );
  expect(redemptionCount).toBe(1);
});

test("referrer rewards use the active workspace billing account", async () => {
  const t = initTest();
  await createUser(t, "owner");
  await createUser(t, "referrer");
  await createUser(t, "referred");
  const ids = await t.run(async (ctx) => {
    const { ensureOrganizationalTeam } = await import("./teamHelpers");
    const owner = await ctx.db
      .query("users")
      .withIndex("by_workosUserId", (q) => q.eq("workosUserId", "owner"))
      .unique();
    const referrer = await ctx.db
      .query("users")
      .withIndex("by_workosUserId", (q) => q.eq("workosUserId", "referrer"))
      .unique();
    if (!owner || !referrer) {
      throw new Error("Test users missing");
    }
    const teamId = await ensureOrganizationalTeam(ctx, {
      workosOrgId: "org_referral",
      name: "Referral workspace",
      ownerUserId: owner._id,
    });
    await ctx.db.patch(referrer._id, { activeTeamId: teamId });
    return { ownerId: owner._id, referrerId: referrer._id };
  });
  const { code } = await t
    .withIdentity({ subject: "referrer" })
    .query(api.referrals.getMyOverview, {});

  await t
    .withIdentity({ subject: "referred" })
    .mutation(api.users.completeOnboarding, onboardingArgs(code));

  const entries = await t.run(
    async (ctx) => await ctx.db.query("topUpEntries").collect(),
  );
  expect(
    entries.some(
      (entry) =>
        entry.userId === ids.ownerId && entry.source === "referral",
    ),
  ).toBe(true);
  expect(
    entries.some(
      (entry) =>
        entry.userId === ids.referrerId && entry.source === "referral",
    ),
  ).toBe(false);
});
