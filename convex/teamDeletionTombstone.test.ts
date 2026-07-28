/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("late WorkOS events cannot recreate a deleted organization", async () => {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    await ctx.db.insert("deletedTeamOrganizations", {
      workosOrgId: "org_deleted",
      deletedAt: Date.now(),
    });
  });

  await t.mutation(internal.workosWebhook.dispatch, {
    eventId: "evt_late_membership",
    eventType: "organization_membership.created",
    data: {
      id: "membership_late",
      user_id: "user_late",
      organization_id: "org_deleted",
      role: { slug: "member" },
    },
  });

  await t.run(async (ctx) => {
    expect(
      await ctx.db
        .query("teams")
        .withIndex("by_workosOrgId", (q) =>
          q.eq("workosOrgId", "org_deleted"),
        )
        .first(),
    ).toBeNull();
    expect(
      await ctx.db.query("teamMemberships").first(),
    ).toBeNull();
  });
});
