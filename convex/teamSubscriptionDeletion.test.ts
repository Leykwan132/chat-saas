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
  test("ignores a delayed deletion event for a replaced subscription", async () => {
    const t = initTest();
    const teamId = await t.run(async (ctx) => {
      const now = Date.now();
      return await ctx.db.insert("teams", {
        type: "organizational",
        name: "Team",
        workosOrgId: "org_team",
        stripeSubscriptionId: "sub_current",
        createdAt: now,
        updatedAt: now,
      });
    });

    const result = await t.mutation(
      internal.stripe.handleSubscriptionDeletedInternal,
      {
        orgId: "org_team",
        stripeSubscriptionId: "sub_replaced",
      },
    );

    expect(result).toEqual({ accepted: true, duplicate: true });
    await t.run(async (ctx) => {
      expect((await ctx.db.get(teamId))?.deletionStatus).toBeUndefined();
      expect(
        await ctx.db
          .query("teamDeletionJobs")
          .withIndex("by_teamId", (q) => q.eq("teamId", teamId))
          .first(),
      ).toBeNull();
    });
  });

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
        tombstone: await ctx.db
          .query("deletedTeamOrganizations")
          .withIndex("by_workosOrgId", (q) =>
            q.eq("workosOrgId", "org_team"),
          )
          .unique(),
      };
    });

    expect(state.team?.deletionStatus).toBe("deleting");
    expect(state.team?.stripeSubscriptionId).toBeUndefined();
    expect(state.owner?.activeTeamId).toBe(fixture.personalTeamId);
    expect(state.owner?.stripeSubscriptionStatus).toBe("canceled");
    expect(state.jobs).toHaveLength(1);
    expect(state.tombstone).not.toBeNull();
  });

  test("moves every selected team member before memberships are deleted", async () => {
    const t = initTest();
    const fixture = await t.run(async (ctx) => {
      const now = Date.now();
      const teamId = await ctx.db.insert("teams", {
        type: "organizational",
        name: "Large Team",
        workosOrgId: "org_large",
        stripeSubscriptionId: "sub_large",
        createdAt: now,
        updatedAt: now,
      });
      const userIds = [];
      for (let index = 0; index < 101; index += 1) {
        const userId = await ctx.db.insert("users", {
          workosUserId: `large_user_${index}`,
          email: `large_user_${index}@example.com`,
          activeTeamId: teamId,
          createdAt: now,
          updatedAt: now,
        });
        const personalTeamId = await ctx.db.insert("teams", {
          type: "personal",
          name: "Personal",
          ownerId: userId,
          createdAt: now,
          updatedAt: now,
        });
        await ctx.db.insert("teamMemberships", {
          teamId,
          userId,
          role: "member",
          createdAt: now,
        });
        userIds.push({ userId, personalTeamId });
      }
      return { teamId, userIds };
    });

    for (let page = 0; page < 5; page += 1) {
      const result = await t.mutation(
        internal.teamDeletion.isolation.moveActiveUsers,
        { teamId: fixture.teamId },
      );
      if (result.done) break;
    }

    await t.run(async (ctx) => {
      for (const member of fixture.userIds) {
        expect((await ctx.db.get(member.userId))?.activeTeamId).toBe(
          member.personalTeamId,
        );
      }
    });
  });

  test("resolves a deleting team as canceled Free", () => {
    expect(resolveDeletingTeamPlan({ deletionStatus: "deleting" })).toEqual({
      plan: "free",
      status: "canceled",
    });
    expect(resolveDeletingTeamPlan({ deletionStatus: undefined })).toBeNull();
  });
});
