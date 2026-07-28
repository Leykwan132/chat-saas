/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import workpoolSchema from "../node_modules/@convex-dev/workpool/dist/component/schema.js";
import { internal } from "./_generated/api";
import schema from "./schema";

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
  lib: () =>
    import("../node_modules/@convex-dev/workpool/dist/component/lib.js"),
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
    import(
      "../node_modules/@convex-dev/workpool/dist/component/_generated/server.js"
    ),
};

function initTest() {
  const t = convexTest(schema, modules);
  t.registerComponent(
    "teamDeletionWorkpool",
    workpoolSchema,
    workpoolModules,
  );
  return t;
}

async function createOwnerFixture(
  t: ReturnType<typeof initTest>,
  includeTeam: boolean,
) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    const ownerId = await ctx.db.insert("users", {
      workosUserId: "user_owner",
      email: "owner@example.com",
      stripeCustomerId: "cus_owner",
      stripeSubscriptionId: "sub_paid",
      stripePriceId: "mock_pro_mo",
      stripeSubscriptionStatus: "active",
      createdAt: now,
      updatedAt: now,
    });
    const personalTeamId = await ctx.db.insert("teams", {
      type: "personal",
      name: "Personal",
      ownerId,
      stripeSubscriptionId: "sub_paid",
      createdAt: now,
      updatedAt: now,
    });
    const creditPeriodId = await ctx.db.insert("userCreditPeriods", {
      userId: ownerId,
      periodStart: now - 1_000,
      periodEnd: now + 30 * 24 * 60 * 60 * 1_000,
      grantedCredits: 15_000,
      usedCredits: 2_000,
      planKey: "growth",
      createdAt: now,
      updatedAt: now,
    });
    const purchasedTopUpId = await ctx.db.insert("topUpEntries", {
      userId: ownerId,
      source: "purchase",
      grantedCredits: 2_000,
      usedCredits: 250,
      createdAt: now,
      updatedAt: now,
    });
    const referralTopUpId = await ctx.db.insert("topUpEntries", {
      userId: ownerId,
      source: "referral",
      grantedCredits: 500,
      usedCredits: 100,
      createdAt: now + 1,
      updatedAt: now + 1,
    });

    let teamId = null;
    if (includeTeam) {
      teamId = await ctx.db.insert("teams", {
        type: "organizational",
        name: "Team",
        ownerId,
        workosOrgId: "org_team",
        stripeSubscriptionId: "sub_paid",
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert("teamMemberships", {
        teamId,
        userId: ownerId,
        role: "owner",
        createdAt: now,
      });
    }

    await ctx.db.patch(ownerId, {
      activeTeamId: teamId ?? personalTeamId,
      updatedAt: now,
    });

    return {
      ownerId,
      personalTeamId,
      teamId,
      creditPeriodId,
      purchasedTopUpId,
      referralTopUpId,
    };
  });
}

const downgradeArgs = {
  stripeSubscriptionId: "sub_paid",
  stripeCustomerId: "cus_owner",
  status: "active",
  priceId: "mock_free_mo",
  currentPeriodEnd: 1_900_000_000,
};

describe("Free plan downgrade finalization", () => {
  test("personal downgrade keeps personal data and resets only plan credits", async () => {
    const t = initTest();
    const fixture = await createOwnerFixture(t, false);
    const authed = t.withIdentity({ subject: "user_owner" });

    const first = await authed.mutation(
      internal.freePlanDowngradeState.finalize,
      { ...downgradeArgs, activeOrgId: "" },
    );
    await authed.mutation(internal.freePlanDowngradeState.finalize, {
      ...downgradeArgs,
      activeOrgId: "",
    });

    const state = await t.run(async (ctx) => ({
      owner: await ctx.db.get(fixture.ownerId),
      personalTeam: await ctx.db.get(fixture.personalTeamId),
      creditPeriod: await ctx.db.get(fixture.creditPeriodId),
      purchasedTopUp: await ctx.db.get(fixture.purchasedTopUpId),
      referralTopUp: await ctx.db.get(fixture.referralTopUpId),
      creditLogs: await ctx.db
        .query("creditLogs")
        .withIndex("by_userId_and_createdAt", (q) =>
          q.eq("userId", fixture.ownerId),
        )
        .collect(),
      deletionJobs: await ctx.db.query("teamDeletionJobs").collect(),
    }));

    expect(first).toEqual({ redirectToPersonal: false });
    expect(state.owner).toMatchObject({
      stripeSubscriptionId: "sub_paid",
      stripePriceId: "mock_free_mo",
      stripeSubscriptionStatus: "active",
      activeTeamId: fixture.personalTeamId,
    });
    expect(state.personalTeam?.stripeSubscriptionId).toBe("sub_paid");
    expect(state.creditPeriod).toMatchObject({
      grantedCredits: 50,
      usedCredits: 0,
      planKey: "free",
    });
    expect(state.purchasedTopUp).toMatchObject({
      grantedCredits: 2_000,
      usedCredits: 250,
    });
    expect(state.referralTopUp).toMatchObject({
      grantedCredits: 500,
      usedCredits: 100,
    });
    expect(state.creditLogs).toHaveLength(1);
    expect(state.deletionJobs).toHaveLength(0);
  });

  test("team downgrade preserves active Free billing and queues deletion", async () => {
    const t = initTest();
    const fixture = await createOwnerFixture(t, true);
    const authed = t.withIdentity({ subject: "user_owner" });

    const result = await authed.mutation(
      internal.freePlanDowngradeState.finalize,
      { ...downgradeArgs, activeOrgId: "org_team" },
    );

    const state = await t.run(async (ctx) => ({
      owner: await ctx.db.get(fixture.ownerId),
      team: fixture.teamId ? await ctx.db.get(fixture.teamId) : null,
      creditPeriod: await ctx.db.get(fixture.creditPeriodId),
      deletionJobs: fixture.teamId
        ? await ctx.db
            .query("teamDeletionJobs")
            .withIndex("by_teamId", (q) => q.eq("teamId", fixture.teamId!))
            .take(2)
        : [],
    }));

    expect(result).toEqual({ redirectToPersonal: true });
    expect(state.owner).toMatchObject({
      stripeSubscriptionId: "sub_paid",
      stripePriceId: "mock_free_mo",
      stripeSubscriptionStatus: "active",
      activeTeamId: fixture.personalTeamId,
    });
    expect(state.team?.deletionStatus).toBe("deleting");
    expect(state.creditPeriod).toMatchObject({
      grantedCredits: 50,
      usedCredits: 0,
      planKey: "free",
    });
    expect(state.deletionJobs).toHaveLength(1);
  });
});
