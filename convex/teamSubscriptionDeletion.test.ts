/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import workpoolSchema from "../node_modules/@convex-dev/workpool/dist/component/schema.js";
import { internal } from "./_generated/api";
import schema from "./schema";
import { resolveDeletingTeamPlan } from "./plans";

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

describe("team subscription deletion", () => {
  test("marks the workspace once and returns its owner to Personal", async () => {
    const t = initTest();
    const fixture = await t.run(async (ctx) => {
      const now = Date.now();
      const ownerId = await ctx.db.insert("users", {
        workosUserId: "user_owner",
        email: "owner@example.com",
        stripeSubscriptionId: "sub_team",
        stripeSubscriptionStatus: "active",
        createdAt: now,
        updatedAt: now,
      });
      const personalTeamId = await ctx.db.insert("teams", {
        type: "personal",
        name: "Personal",
        ownerId,
        createdAt: now,
        updatedAt: now,
      });
      const teamId = await ctx.db.insert("teams", {
        type: "organizational",
        name: "Team",
        ownerId,
        workosOrgId: "org_team",
        stripeSubscriptionId: "sub_team",
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert("teamMemberships", {
        teamId,
        userId: ownerId,
        role: "owner",
        createdAt: now,
      });
      await ctx.db.patch(ownerId, { activeTeamId: teamId });
      return { ownerId, personalTeamId, teamId };
    });

    const first = await t.mutation(
      internal.stripe.handleSubscriptionDeletedInternal,
      {
        orgId: "org_team",
        stripeSubscriptionId: "sub_team",
      },
    );
    const second = await t.mutation(
      internal.stripe.handleSubscriptionDeletedInternal,
      {
        orgId: "org_team",
        stripeSubscriptionId: "sub_team",
      },
    );

    expect(first).toEqual({ accepted: true, duplicate: false });
    expect(second).toEqual({ accepted: true, duplicate: true });

    const state = await t.run(async (ctx) => {
      const jobs = await ctx.db
        .query("teamDeletionJobs")
        .withIndex("by_teamId", (q) => q.eq("teamId", fixture.teamId))
        .take(2);
      return {
        team: await ctx.db.get(fixture.teamId),
        owner: await ctx.db.get(fixture.ownerId),
        jobs,
      };
    });

    expect(state.team?.deletionStatus).toBe("deleting");
    expect(state.team?.stripeSubscriptionId).toBeUndefined();
    expect(state.owner?.activeTeamId).toBe(fixture.personalTeamId);
    expect(state.owner?.stripeSubscriptionStatus).toBe("canceled");
    expect(state.jobs).toHaveLength(1);
  });

  test("resolves a deleting team as canceled Free", () => {
    expect(resolveDeletingTeamPlan({ deletionStatus: "deleting" })).toEqual({
      plan: "free",
      status: "canceled",
    });
    expect(resolveDeletingTeamPlan({ deletionStatus: undefined })).toBeNull();
  });
});
